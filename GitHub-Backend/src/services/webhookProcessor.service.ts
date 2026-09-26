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
    if (eventName === 'installation') {
      await this.handleInstallationEvent(payload);
      return;
    }

    if (eventName === 'installation_repositories') {
      await this.handleInstallationRepositoriesEvent(payload);
      return;
    }

    const repoFullName = payload?.repository?.full_name;
    const repoGithubId = payload?.repository?.id ? String(payload.repository.id) : null;

    if (!repoFullName && !repoGithubId) {
      logger.info('WEBHOOK', `Ignored webhook event '${eventName}': Missing repository full_name/id in payload`);
      return;
    }

    // Find monitored repository in database
    const repoRes = await pool.query(
      `SELECT r.*, p.organization_id as proj_org_id
       FROM repositories r
       LEFT JOIN projects p ON p.id = r.project_id
       WHERE r.full_name = $1 OR r.github_repository_id = $2
       LIMIT 1`,
      [repoFullName || '', repoGithubId || '']
    );

    if (repoRes.rows.length === 0) {
      logger.info('WEBHOOK', `Ignored webhook event '${eventName}' for unmonitored repository ${repoFullName || repoGithubId}`);
      return;
    }

    const repo = repoRes.rows[0];
    const organizationId: string | null = repo.organization_id || repo.proj_org_id || null;

    try {
      switch (eventName) {
        case 'pull_request':
          await this.handlePullRequestEvent(repo.id, organizationId, payload);
          break;
        case 'issues':
          await this.handleIssuesEvent(repo.id, organizationId, payload);
          break;
        case 'issue_comment':
          await this.handleIssueCommentEvent(repo.id, organizationId, payload);
          break;
        case 'push':
          await this.handlePushEvent(repo.id, organizationId, payload);
          break;
        case 'pull_request_review':
          await this.handleReviewEvent(repo.id, organizationId, payload);
          break;
        default:
          logger.info('WEBHOOK', `Received unhandled webhook event type '${eventName}' for ${repoFullName || repo.name}`);
          break;
      }
    } catch (err: any) {
      logger.error('WEBHOOK', `Error processing webhook event '${eventName}' for ${repoFullName || repo.name}: ${err.message}`, err);
    }
  }

  private async handleInstallationEvent(payload: any) {
    const installation = payload.installation;
    if (!installation) return;

    const action = payload.action;
    const installationId = Number(installation.id);
    const accountLogin = installation.account?.login || 'unknown';
    const accountType = installation.account?.type || 'Organization';
    const statusStr = action === 'deleted' ? 'DELETED' : action === 'suspend' ? 'SUSPENDED' : 'ACTIVE';

    await pool.query(
      `INSERT INTO github_installations (id, github_installation_id, account_login, account_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (github_installation_id) DO UPDATE SET
         status = EXCLUDED.status,
         account_login = EXCLUDED.account_login,
         updated_at = NOW()`,
      [`inst-${installationId}`, installationId, accountLogin, accountType, statusStr]
    );

    logger.info('WEBHOOK', `Successfully processed installation event '${action}' for installation ID ${installationId}`);
  }

  private async handleInstallationRepositoriesEvent(payload: any) {
    const action = payload.action;
    const installationId = payload.installation?.id;
    const addedRepos = payload.repositories_added || [];
    const removedRepos = payload.repositories_removed || [];

    logger.info('WEBHOOK', `Successfully processed installation_repositories '${action}' for installation ${installationId} (Added: ${addedRepos.length}, Removed: ${removedRepos.length})`);
  }

  private async handlePullRequestEvent(repositoryId: string, organizationId: string | null, payload: any) {
    const pr = payload.pull_request;
    if (!pr) return;

    const author = pr.user;
    let devId: string | null = null;

    if (author?.login) {
      const dev = await developerRepository.upsert({
        id: `dev-${author.id || author.login}`,
        organizationId,
        githubUserId: author.id,
        login: author.login,
        name: author.name || author.login,
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
      baseBranch: pr.base?.ref || null,
      headBranch: pr.head?.ref || null,
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
    else if (action === 'reopened') eventType = 'PULL_REQUEST_REOPENED';
    else if (action === 'edited') eventType = 'PULL_REQUEST_EDITED';

    await activityRepository.create({
      id: `act-${crypto.randomUUID()}`,
      repositoryId,
      developerId: devId,
      eventType,
      entityType: 'PULL_REQUEST',
      entityId: `pr-${pr.number}`,
      occurredAt: new Date(),
      metadata: { prNumber: pr.number, title: pr.title, state: stateStr, action, html_url: pr.html_url },
    });

    logger.info('WEBHOOK', `Successfully processed PR #${pr.number} (${stateStr}) for repository ${repositoryId}`);
  }

  private async handleIssuesEvent(repositoryId: string, organizationId: string | null, payload: any) {
    const issue = payload.issue;
    if (!issue || payload.pull_request) return;

    const author = issue.user;
    let devId: string | null = null;

    if (author?.login) {
      const dev = await developerRepository.upsert({
        id: `dev-${author.id || author.login}`,
        organizationId,
        githubUserId: author.id,
        login: author.login,
        name: author.name || author.login,
        avatarUrl: author.avatar_url,
        htmlUrl: author.html_url,
      });
      await developerRepository.linkToRepository(repositoryId, dev.id);
      devId = dev.id;
    }

    let assigneeDevId: string | null = null;
    if (issue.assignee?.login) {
      const aDev = await developerRepository.upsert({
        id: `dev-${issue.assignee.id || issue.assignee.login}`,
        organizationId,
        githubUserId: issue.assignee.id,
        login: issue.assignee.login,
        name: issue.assignee.name || issue.assignee.login,
        avatarUrl: issue.assignee.avatar_url,
      });
      assigneeDevId = aDev.id;
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
      assigneeDeveloperId: assigneeDevId,
      labels: issue.labels ? issue.labels.map((l: any) => (typeof l === 'string' ? l : l.name)) : [],
      commentsCount: issue.comments || 0,
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at),
      closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
      htmlUrl: issue.html_url,
    });

    const action = payload.action;
    const eventType = action === 'closed' ? 'ISSUE_CLOSED' : action === 'reopened' ? 'ISSUE_REOPENED' : 'ISSUE_OPENED';

    await activityRepository.create({
      id: `act-${crypto.randomUUID()}`,
      repositoryId,
      developerId: devId,
      eventType,
      entityType: 'ISSUE',
      entityId: `iss-${issue.number}`,
      occurredAt: new Date(),
      metadata: { issueNumber: issue.number, title: issue.title, state: stateStr, action, html_url: issue.html_url },
    });

    logger.info('WEBHOOK', `Successfully processed Issue #${issue.number} (${stateStr}) for repository ${repositoryId}`);
  }

  private async handleIssueCommentEvent(repositoryId: string, organizationId: string | null, payload: any) {
    const comment = payload.comment;
    const issue = payload.issue;
    if (!comment || !issue) return;

    const author = comment.user;
    let devId: string | null = null;

    if (author?.login) {
      const dev = await developerRepository.upsert({
        id: `dev-${author.id || author.login}`,
        organizationId,
        githubUserId: author.id,
        login: author.login,
        name: author.name || author.login,
        avatarUrl: author.avatar_url,
        htmlUrl: author.html_url,
      });
      await developerRepository.linkToRepository(repositoryId, dev.id);
      devId = dev.id;
    }

    await activityRepository.create({
      id: `act-${crypto.randomUUID()}`,
      repositoryId,
      developerId: devId,
      eventType: 'ISSUE_COMMENT_CREATED',
      entityType: 'ISSUE_COMMENT',
      entityId: `comment-${comment.id}`,
      occurredAt: new Date(comment.created_at || Date.now()),
      metadata: {
        issueNumber: issue.number,
        title: issue.title,
        html_url: comment.html_url,
        bodySnippet: comment.body ? comment.body.substring(0, 100) : '',
      },
    });

    logger.info('WEBHOOK', `Successfully processed Issue Comment for Issue #${issue.number} in repository ${repositoryId}`);
  }

  private async handlePushEvent(repositoryId: string, organizationId: string | null, payload: any) {
    const commits = payload.commits || [];
    const sender = payload.sender;
    const pusher = payload.pusher;

    let defaultDevId: string | null = null;
    const login = sender?.login || pusher?.name;
    if (login) {
      const dev = await developerRepository.upsert({
        id: `dev-${sender?.id || login}`,
        organizationId,
        githubUserId: sender?.id || null,
        login,
        name: sender?.name || pusher?.name || login,
        avatarUrl: sender?.avatar_url || null,
        htmlUrl: sender?.html_url || `https://github.com/${login}`,
      });
      await developerRepository.linkToRepository(repositoryId, dev.id);
      defaultDevId = dev.id;
    }

    for (const c of commits) {
      let commitDevId = defaultDevId;
      const authorLogin = c.author?.username || c.author?.name;
      if (authorLogin && authorLogin !== login) {
        const authorDev = await developerRepository.upsert({
          id: `dev-${authorLogin}`,
          organizationId,
          githubUserId: null,
          login: authorLogin,
          name: c.author?.name || authorLogin,
          email: c.author?.email || null,
          avatarUrl: null,
          htmlUrl: `https://github.com/${authorLogin}`,
        });
        await developerRepository.linkToRepository(repositoryId, authorDev.id);
        commitDevId = authorDev.id;
      }

      const additions = c.added ? c.added.length : 0;
      const deletions = c.removed ? c.removed.length : 0;
      const changedFiles = (c.added?.length || 0) + (c.modified?.length || 0) + (c.removed?.length || 0);

      await commitRepository.upsert({
        id: `cmt-${c.id}`,
        repositoryId,
        githubCommitSha: c.id,
        developerId: commitDevId,
        message: c.message,
        committedAt: new Date(c.timestamp || Date.now()),
        additions,
        deletions,
        changedFiles,
        commitUrl: c.url,
      });
    }

    if (commits.length > 0) {
      await activityRepository.create({
        id: `act-${crypto.randomUUID()}`,
        repositoryId,
        developerId: defaultDevId,
        eventType: 'COMMIT_PUSHED',
        entityType: 'COMMIT',
        entityId: commits[0].id.substring(0, 8),
        occurredAt: new Date(),
        metadata: { commitCount: commits.length, ref: payload.ref },
      });
    }

    logger.info('WEBHOOK', `Successfully processed Push event (${commits.length} commits) for repository ${repositoryId}`);
  }

  private async handleReviewEvent(repositoryId: string, organizationId: string | null, payload: any) {
    const review = payload.review;
    const pr = payload.pull_request;
    if (!review || !pr) return;

    const reviewer = review.user;
    let devId: string | null = null;

    if (reviewer?.login) {
      const dev = await developerRepository.upsert({
        id: `dev-${reviewer.id || reviewer.login}`,
        organizationId,
        githubUserId: reviewer.id,
        login: reviewer.login,
        name: reviewer.name || reviewer.login,
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
      metadata: { prNumber: pr.number, state: review.state, html_url: review.html_url },
    });

    logger.info('WEBHOOK', `Successfully processed Review for PR #${pr.number} for repository ${repositoryId}`);
  }
}

export const webhookProcessorService = new WebhookProcessorService();
