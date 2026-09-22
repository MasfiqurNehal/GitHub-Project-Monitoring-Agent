import { GitHubClient } from '../github/github-client.js';
import { repositoryRepository } from '../repositories/repository.repository.js';
import { developerRepository } from '../repositories/developer.repository.js';
import { commitRepository } from '../repositories/commit.repository.js';
import { pullRequestRepository } from '../repositories/pullRequest.repository.ts';
import { issueRepository } from '../repositories/issue.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { syncJobRepository } from '../repositories/syncJob.repository.js';
import crypto from 'crypto';

export class SyncService {
  private githubClient: GitHubClient;

  constructor() {
    this.githubClient = new GitHubClient();
  }

  async runFullHistoricalSync(repositoryId: string): Promise<{ success: boolean; recordsProcessed: number }> {
    const repo = await repositoryRepository.findById(repositoryId);
    if (!repo) {
      throw new Error(`Repository with ID ${repositoryId} not found`);
    }

    const jobId = `job-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    await syncJobRepository.create(jobId, repo.id, 'full_sync');
    await repositoryRepository.updateSyncStatus(repo.id, 'SYNCING');

    let totalProcessed = 0;

    try {
      console.log(`[Sync] Starting historical synchronization for ${repo.full_name}...`);

      // 1. Sync Contributors
      const contributors = await this.githubClient.getContributors(repo.owner, repo.name);
      for (const contrib of contributors) {
        if (!contrib.login) continue;
        const devId = `dev-${contrib.id || contrib.login}`;
        const dev = await developerRepository.upsert({
          id: devId,
          githubUserId: contrib.id,
          login: contrib.login,
          avatarUrl: contrib.avatar_url,
          htmlUrl: contrib.html_url,
          type: contrib.type,
        });

        await developerRepository.linkToRepository(repo.id, dev.id);
        totalProcessed++;
      }

      // 2. Sync Commits
      const commits = await this.githubClient.getCommits(repo.owner, repo.name);
      for (const c of commits) {
        const authorLogin = c.author?.login || c.commit.author?.name || 'unknown';
        let devId: string | null = null;

        if (c.author?.login) {
          const dev = await developerRepository.upsert({
            id: `dev-${c.author.id || c.author.login}`,
            githubUserId: c.author.id,
            login: c.author.login,
            avatarUrl: c.author.avatar_url,
            htmlUrl: c.author.html_url,
          });
          await developerRepository.linkToRepository(repo.id, dev.id);
          devId = dev.id;
        }

        const commitId = `cmt-${c.sha}`;
        const committedAt = new Date(c.commit.committer?.date || c.commit.author?.date || Date.now());

        // Fetch detailed commit files & diff patches if available
        let additions = 0;
        let deletions = 0;
        let changedFilesCount = 0;

        try {
          const detail = await this.githubClient.getCommitDetail(repo.owner, repo.name, c.sha);
          additions = detail.stats?.additions || 0;
          deletions = detail.stats?.deletions || 0;
          changedFilesCount = detail.files?.length || 0;

          if (detail.files && detail.files.length > 0) {
            const commitFiles = detail.files.map((f) => ({
              id: `cf-${crypto.randomUUID()}`,
              filename: f.filename,
              status: f.status,
              additions: f.additions,
              deletions: f.deletions,
              changes: f.changes,
              patch: f.patch || null,
            }));
            await commitRepository.saveCommitFiles(commitId, commitFiles);
          }
        } catch (err: any) {
          // If individual commit detail fails, fallback to basic metadata
        }

        await commitRepository.upsert({
          id: commitId,
          repositoryId: repo.id,
          githubCommitSha: c.sha,
          developerId: devId,
          message: c.commit.message,
          commitUrl: c.html_url,
          committedAt,
          additions,
          deletions,
          changedFiles: changedFilesCount,
          parentCount: c.parents?.length || 1,
          isMergeCommit: (c.parents?.length || 1) > 1,
        });

        // Record Activity Event
        await activityRepository.create({
          id: `act-cmt-${c.sha}`,
          repositoryId: repo.id,
          developerId: devId,
          eventType: 'commit',
          entityType: 'commit',
          entityId: c.sha,
          occurredAt: committedAt,
          metadata: {
            sha: c.sha,
            message: c.commit.message.split('\n')[0],
            additions,
            deletions,
          },
        });

        totalProcessed++;
      }

      // 3. Sync Pull Requests
      const prs = await this.githubClient.getPullRequests(repo.owner, repo.name, 'all');
      for (const pr of prs) {
        let authorDevId: string | null = null;
        if (pr.user?.login) {
          const dev = await developerRepository.upsert({
            id: `dev-${pr.user.id || pr.user.login}`,
            githubUserId: pr.user.id,
            login: pr.user.login,
            avatarUrl: pr.user.avatar_url,
          });
          authorDevId = dev.id;
        }

        const prId = `pr-${pr.id}`;
        const createdAt = new Date(pr.created_at);
        const closedAt = pr.closed_at ? new Date(pr.closed_at) : null;
        const mergedAt = pr.merged_at ? new Date(pr.merged_at) : null;

        await pullRequestRepository.upsert({
          id: prId,
          repositoryId: repo.id,
          githubPrId: pr.id,
          number: pr.number,
          authorDeveloperId: authorDevId,
          title: pr.title,
          body: pr.body || null,
          state: pr.state,
          draft: pr.draft || false,
          merged: Boolean(pr.merged_at),
          baseBranch: pr.base?.ref || null,
          headBranch: pr.head?.ref || null,
          createdAt,
          updatedAt: new Date(pr.updated_at),
          closedAt,
          mergedAt,
          htmlUrl: pr.html_url,
        });

        // Fetch reviews for PR
        try {
          const reviews = await this.githubClient.getPullRequestReviews(repo.owner, repo.name, pr.number);
          for (const r of reviews) {
            let reviewerDevId: string | null = null;
            if (r.user?.login) {
              const dev = await developerRepository.upsert({
                id: `dev-${r.user.id || r.user.login}`,
                githubUserId: r.user.id,
                login: r.user.login,
                avatarUrl: r.user.avatar_url,
              });
              reviewerDevId = dev.id;
            }

            await pullRequestRepository.saveReview({
              id: `rev-${r.id}`,
              pullRequestId: prId,
              githubReviewId: r.id,
              reviewerDeveloperId: reviewerDevId,
              state: r.state,
              body: r.body || null,
              submittedAt: new Date(r.submitted_at || Date.now()),
              htmlUrl: r.html_url,
            });
          }
        } catch (err: any) {}

        await activityRepository.create({
          id: `act-pr-${pr.id}`,
          repositoryId: repo.id,
          developerId: authorDevId,
          eventType: pr.merged_at ? 'pull_request_merged' : pr.state === 'closed' ? 'pull_request_closed' : 'pull_request_opened',
          entityType: 'pull_request',
          entityId: String(pr.number),
          occurredAt: mergedAt || closedAt || createdAt,
          metadata: {
            number: pr.number,
            title: pr.title,
            state: pr.state,
          },
        });

        totalProcessed++;
      }

      // 4. Sync Issues
      const issues = await this.githubClient.getIssues(repo.owner, repo.name, 'all');
      for (const issue of issues) {
        let authorDevId: string | null = null;
        if (issue.user?.login) {
          const dev = await developerRepository.upsert({
            id: `dev-${issue.user.id || issue.user.login}`,
            githubUserId: issue.user.id,
            login: issue.user.login,
            avatarUrl: issue.user.avatar_url,
          });
          authorDevId = dev.id;
        }

        const issueId = `iss-${issue.id}`;
        await issueRepository.upsert({
          id: issueId,
          repositoryId: repo.id,
          githubIssueId: issue.id,
          number: issue.number,
          authorDeveloperId: authorDevId,
          title: issue.title,
          body: issue.body || null,
          state: issue.state,
          closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
          createdAt: new Date(issue.created_at),
          updatedAt: new Date(issue.updated_at),
          commentsCount: issue.comments,
          htmlUrl: issue.html_url,
        });

        totalProcessed++;
      }

      // Mark Repository & Job COMPLETED
      await repositoryRepository.updateSyncStatus(repo.id, 'COMPLETED', new Date());
      await syncJobRepository.complete(jobId, totalProcessed);

      console.log(`[Sync] Completed historical sync for ${repo.full_name}. Processed ${totalProcessed} records.`);
      return { success: true, recordsProcessed: totalProcessed };
    } catch (err: any) {
      console.error(`[Sync Error] Failed sync for ${repo.full_name}:`, err.message);
      await repositoryRepository.updateSyncStatus(repo.id, 'FAILED');
      await syncJobRepository.fail(jobId, err.message);
      throw err;
    }
  }
}

export const syncService = new SyncService();
