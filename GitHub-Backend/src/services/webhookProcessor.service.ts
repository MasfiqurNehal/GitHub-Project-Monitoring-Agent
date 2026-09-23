import { pool } from '../db/connection.js';
import { developerRepository } from '../repositories/developer.repository.js';
import { repositoryRepository } from '../repositories/repository.repository.js';
import { pullRequestRepository } from '../repositories/pullRequest.repository.js';
import { issueRepository } from '../repositories/issue.repository.js';
import { commitRepository } from '../repositories/commit.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

export class WebhookProcessorService {
  async processEvent(eventName: string, payload: any): Promise<void> {
    const repoFullName = payload?.repository?.full_name;
    if (!repoFullName) {
      logger.info('WEBHOOK', `Ignored webhook event '${eventName}': Missing repository full_name in payload`);
      return;
    }

    // Find monitored repository in database
    const repoRes = await pool.query(`SELECT * FROM repositories WHERE full_name = $1 LIMIT 1`, [repoFullName]);
    if (repoRes.rows.length === 0) {
      logger.info('WEBHOOK', `Ignored webhook event '${eventName}' for unmonitored repository ${repoFullName}`);
      return;
    }

    const repo = repoRes.rows[0];

    try {
      switch (eventName) {
        case 'pull_request':
          await this.handlePullRequestEvent(repo.id, payload);
          break;
        case 'issues':
          await this.handleIssuesEvent(repo.id, payload);
          break;
        case 'push':
          await this.handlePushEvent(repo.id, payload);
          break;
        case 'pull_request_review':
          await this.handleReviewEvent(repo.id, payload);
          break;
        default:
          logger.info('WEBHOOK', `Received unhandled webhook event type '${eventName}' for ${repoFullName}`);
          break;
      }
    } catch (err: any) {
      logger.error('WEBHOOK', `Error processing webhook event '${eventName}' for ${repoFullName}: ${err.message}`, err);
    }
  }

  private async handlePullRequestEvent(repositoryId: string, payload: any) {
    const pr = payload.pull_request;
    if (!pr) return;

    const author = pr.user;
    let devId: string | null = null;

    if (author?.login) {
      const dev = await developerRepository.upsert({
        id: `dev-${author.id || author.login}`,
        githubUserId: author.id,
        login: author.login,
        avatarUrl: author.avatar_url,
        htmlUrl: author.html_url,
      });
      await developerRepository.linkToRepository(repositoryId, dev.id);
      devId = dev.id;
    }

    const stateStr = pr.merged ? 'MERGED' : pr.state ? pr.state.toUpperCase() : 'OPEN';

    await pullRequestRepository.upsert({
      id: `pr-${repositoryId}-${pr.number}`,
      repositoryId,
      githubPrId: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body || null,
      state: stateStr,
      draft: Boolean(pr.draft),
      merged: Boolean(pr.merged),
      authorDeveloperId: devId,
      additions: pr.additions || 0,
      deletions: pr.deletions || 0,
      changedFiles: pr.changed_files || 0,
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
      closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
      htmlUrl: pr.html_url,
    });

    const action = payload.action;
    let eventType = 'PULL_REQUEST_OPENED';
    if (pr.merged) eventType = 'PULL_REQUEST_MERGED';
    else if (action === 'closed') eventType = 'PULL_REQUEST_CLOSED';

    await activityRepository.create({
      id: `act-${crypto.randomUUID()}`,
      repositoryId,
      developerId: devId,
      eventType,
      entityType: 'PULL_REQUEST',
      entityId: `pr-${pr.number}`,
      occurredAt: new Date(),
      metadata: { prNumber: pr.number, title: pr.title, state: stateStr, action },
    });

    logger.info('WEBHOOK', `Successfully processed PR #${pr.number} (${stateStr}) for repository ${repositoryId}`);
  }

  private async handleIssuesEvent(repositoryId: string, payload: any) {
    const issue = payload.issue;
    if (!issue || payload.pull_request) return;

    const author = issue.user;
    let devId: string | null = null;

    if (author?.login) {
      const dev = await developerRepository.upsert({
        id: `dev-${author.id || author.login}`,
        githubUserId: author.id,
        login: author.login,
        avatarUrl: author.avatar_url,
        htmlUrl: author.html_url,
      });
      await developerRepository.linkToRepository(repositoryId, dev.id);
      devId = dev.id;
    }

    const stateStr = issue.state ? issue.state.toUpperCase() : 'OPEN';

    await issueRepository.upsert({
      id: `iss-${repositoryId}-${issue.number}`,
      repositoryId,
      githubIssueId: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body || null,
      state: stateStr,
      authorDeveloperId: devId,
      commentsCount: issue.comments || 0,
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at),
      closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
      htmlUrl: issue.html_url,
    });

    const action = payload.action;
    const eventType = action === 'closed' ? 'ISSUE_CLOSED' : 'ISSUE_OPENED';

    await activityRepository.create({
      id: `act-${crypto.randomUUID()}`,
      repositoryId,
      developerId: devId,
      eventType,
      entityType: 'ISSUE',
      entityId: `iss-${issue.number}`,
      occurredAt: new Date(),
      metadata: { issueNumber: issue.number, title: issue.title, state: stateStr, action },
    });

    logger.info('WEBHOOK', `Successfully processed Issue #${issue.number} (${stateStr}) for repository ${repositoryId}`);
  }

  private async handlePushEvent(repositoryId: string, payload: any) {
    const commits = payload.commits || [];
    const pusher = payload.pusher;
    let devId: string | null = null;

    if (pusher?.name) {
      const dev = await developerRepository.upsert({
        id: `dev-${pusher.name}`,
        githubUserId: null,
        login: pusher.name,
        avatarUrl: null,
        htmlUrl: `https://github.com/${pusher.name}`,
      });
      await developerRepository.linkToRepository(repositoryId, dev.id);
      devId = dev.id;
    }

    for (const c of commits) {
      await commitRepository.upsert({
        id: `cmt-${c.id}`,
        repositoryId,
        githubCommitSha: c.id,
        developerId: devId,
        message: c.message,
        committedAt: new Date(c.timestamp || Date.now()),
        additions: c.added?.length || 0,
        deletions: c.removed?.length || 0,
        changedFiles: (c.added?.length || 0) + (c.modified?.length || 0) + (c.removed?.length || 0),
        commitUrl: c.url,
      });
    }

    if (commits.length > 0) {
      await activityRepository.create({
        id: `act-${crypto.randomUUID()}`,
        repositoryId,
        developerId: devId,
        eventType: 'COMMIT_PUSHED',
        entityType: 'COMMIT',
        entityId: commits[0].id.substring(0, 8),
        occurredAt: new Date(),
        metadata: { commitCount: commits.length, ref: payload.ref },
      });
    }

    logger.info('WEBHOOK', `Successfully processed Push event (${commits.length} commits) for repository ${repositoryId}`);
  }

  private async handleReviewEvent(repositoryId: string, payload: any) {
    const review = payload.review;
    const pr = payload.pull_request;
    if (!review || !pr) return;

    const reviewer = review.user;
    let devId: string | null = null;

    if (reviewer?.login) {
      const dev = await developerRepository.upsert({
        id: `dev-${reviewer.id || reviewer.login}`,
        githubUserId: reviewer.id,
        login: reviewer.login,
        avatarUrl: reviewer.avatar_url,
        htmlUrl: reviewer.html_url,
      });
      await developerRepository.linkToRepository(repositoryId, dev.id);
      devId = dev.id;
    }

    const prId = `pr-${repositoryId}-${pr.number}`;

    await pool.query(
      `INSERT INTO pull_request_reviews (id, pull_request_id, github_review_id, reviewer_developer_id, state, body, submitted_at, html_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (github_review_id) DO UPDATE SET state = EXCLUDED.state, body = EXCLUDED.body`,
      [
        `rev-${review.id}`,
        prId,
        review.id,
        devId,
        review.state ? review.state.toUpperCase() : 'APPROVED',
        review.body || null,
        new Date(review.submitted_at || Date.now()),
        review.html_url,
      ]
    );

    await activityRepository.create({
      id: `act-${crypto.randomUUID()}`,
      repositoryId,
      developerId: devId,
      eventType: 'REVIEW_SUBMITTED',
      entityType: 'REVIEW',
      entityId: `rev-${review.id}`,
      occurredAt: new Date(),
      metadata: { prNumber: pr.number, state: review.state },
    });

    logger.info('WEBHOOK', `Successfully processed Review for PR #${pr.number} for repository ${repositoryId}`);
  }
}

export const webhookProcessorService = new WebhookProcessorService();
