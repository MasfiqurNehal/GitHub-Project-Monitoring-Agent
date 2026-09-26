import { GitHubClient } from '../github/github-client.js';
import { githubInstallationRepository } from '../repositories/githubInstallation.repository.js';
import { repositoryRepository } from '../repositories/repository.repository.js';
import { developerRepository } from '../repositories/developer.repository.js';
import { branchRepository } from '../repositories/branch.repository.js';
import { commitRepository } from '../repositories/commit.repository.js';
import { pullRequestRepository } from '../repositories/pullRequest.repository.js';
import { issueRepository } from '../repositories/issue.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { syncJobRepository } from '../repositories/syncJob.repository.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

export interface SyncCounts {
  branches: number;
  developers: number;
  commits: number;
  pullRequests: number;
  issues: number;
  reviews: number;
  activities: number;
}

export interface SyncResult {
  success: boolean;
  status: 'COMPLETED' | 'FAILED';
  repository: {
    id: string;
    name: string;
    fullName: string;
    owner: string;
    isPrivate: boolean;
    defaultBranch: string;
  };
  synchronized: boolean;
  counts: SyncCounts;
  startedAt: string;
  completedAt: string;
}

export class SyncService {
  async runFullHistoricalSync(repositoryId: string, organizationId?: string): Promise<SyncResult> {
    const startedAt = new Date();

    // 1. Tenant-isolated repository lookup
    const repo = await repositoryRepository.findById(repositoryId, organizationId);
    if (!repo) {
      throw new Error(`Repository with ID ${repositoryId} not found or access denied.`);
    }

    const targetOrgId = organizationId || repo.organization_id || undefined;

    // 2. Resolve GitHub App Installation for this tenant
    const installations = await githubInstallationRepository.findAll(targetOrgId);
    const activeInst = installations.find((i) => i.status === 'ACTIVE');
    const installationId = repo.github_installation_id ? Number(repo.github_installation_id) : activeInst?.github_installation_id;

    const githubClient = new GitHubClient({ installationId });

    // 3. Determine Initial Sync vs Incremental Sync
    const isInitialSync = !repo.last_synced_at || repo.sync_status !== 'SYNCED';
    const syncMode = isInitialSync ? 'historical' : 'incremental';
    const sinceDate = isInitialSync || !repo.last_synced_at ? undefined : new Date(repo.last_synced_at).toISOString();

    const jobId = `job-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    await syncJobRepository.create(jobId, repo.id, `${syncMode}_sync`, targetOrgId);
    await repositoryRepository.updateSyncStatus(repo.id, 'SYNCING');

    const counts: SyncCounts = {
      branches: 0,
      developers: 0,
      commits: 0,
      pullRequests: 0,
      issues: 0,
      reviews: 0,
      activities: 0,
    };

    logger.info('SYNC', `[SYNC] Starting ${isInitialSync ? 'initial historical' : 'incremental'} sync`);
    logger.info('SYNC', `[SYNC] Repository: ${repo.full_name}`);
    logger.info('SYNC', `[SYNC] Mode: ${syncMode}`);
    if (sinceDate) {
      logger.info('SYNC', `[SYNC] Since: ${sinceDate}`);
    }

    let totalCommitsFetched = 0;

    try {
      // 1. Sync Repository Metadata
      let currentDefaultBranch = repo.default_branch || 'main';
      const repoMeta = await githubClient.validateRepositoryAccess(repo.owner, repo.name);
      if (repoMeta.success && repoMeta.data) {
        currentDefaultBranch = repoMeta.data.defaultBranch || currentDefaultBranch;
        await repositoryRepository.upsert({
          id: repo.id,
          organizationId: targetOrgId,
          githubRepositoryId: repoMeta.data.githubRepositoryId,
          githubInstallationId: installationId || null,
          owner: repoMeta.data.owner,
          name: repoMeta.data.name,
          fullName: repoMeta.data.fullName,
          htmlUrl: repoMeta.data.htmlUrl,
          defaultBranch: currentDefaultBranch,
          isPrivate: repoMeta.data.isPrivate,
          description: repoMeta.data.description || undefined,
          language: repoMeta.data.language || undefined,
          stars: repoMeta.data.stars,
          forks: repoMeta.data.forks,
          openIssuesCount: repoMeta.data.openIssuesCount,
        });
      }

      // 2. Sync Repository Branches
      try {
        const branches = await githubClient.getBranches(repo.owner, repo.name);
        for (const b of branches) {
          if (!b.name) continue;
          await branchRepository.upsert({
            id: `br-${repo.id}-${b.name}`,
            repositoryId: repo.id,
            organizationId: targetOrgId,
            name: b.name,
            headSha: b.commit?.sha || null,
            isDefault: b.name === currentDefaultBranch,
            isProtected: Boolean(b.protected),
          });
          counts.branches++;
        }
      } catch (err: any) {
        logger.warn('SYNC', `Branches fetch warning for ${repo.full_name}: ${err.message}`);
      }

      // 3. Sync Contributors & Developers from GitHub
      try {
        const contributors = await githubClient.getContributors(repo.owner, repo.name);
        for (const contrib of contributors) {
          if (!contrib.login) continue;
          const devId = `dev-${contrib.id || contrib.login}`;
          const dev = await developerRepository.upsert({
            id: devId,
            organizationId: targetOrgId,
            githubUserId: contrib.id,
            login: contrib.login,
            name: contrib.name || contrib.login,
            avatarUrl: contrib.avatar_url,
            htmlUrl: contrib.html_url || `https://github.com/${contrib.login}`,
            email: contrib.email || null,
            type: contrib.type || 'User',
          });

          await developerRepository.linkToRepository(repo.id, dev.id);
          counts.developers++;
        }
      } catch (err: any) {
        logger.warn('SYNC', `Contributors fetch warning for ${repo.full_name}: ${err.message}`);
      }

      // 4. Paginated Sync for Commits
      let commitPage = 1;
      let hasMoreCommits = true;

      while (hasMoreCommits && commitPage <= 20) {
        try {
          logger.info('SYNC', `[SYNC] Fetching commits page ${commitPage}`);
          const commits = await githubClient.getCommits(repo.owner, repo.name, sinceDate, commitPage, 100);
          if (!commits || commits.length === 0) {
            hasMoreCommits = false;
            break;
          }

          totalCommitsFetched += commits.length;

          for (const c of commits) {
            let devId: string | null = null;
            if (c.author?.login) {
              const dev = await developerRepository.upsert({
                id: `dev-${c.author.id || c.author.login}`,
                organizationId: targetOrgId,
                githubUserId: c.author.id,
                login: c.author.login,
                name: c.commit?.author?.name || c.author.login,
                avatarUrl: c.author.avatar_url,
                htmlUrl: c.author.html_url || `https://github.com/${c.author.login}`,
                email: c.commit?.author?.email || null,
              });
              await developerRepository.linkToRepository(repo.id, dev.id);
              devId = dev.id;
            }

            const commitId = `cmt-${c.sha}`;
            const committedAt = new Date(c.commit.committer?.date || c.commit.author?.date || Date.now());

            let additions = 0;
            let deletions = 0;
            let changedFilesCount = 0;

            try {
              const detail = await githubClient.getCommitDetail(repo.owner, repo.name, c.sha);
              additions = detail.stats?.additions || 0;
              deletions = detail.stats?.deletions || 0;
              changedFilesCount = detail.files?.length || 0;

              if (detail.files && detail.files.length > 0) {
                const commitFiles = detail.files.map((f: any) => ({
                  id: crypto.randomUUID(),
                  filename: f.filename,
                  status: f.status,
                  additions: f.additions,
                  deletions: f.deletions,
                  changes: f.changes,
                  patch: f.patch || null,
                  previousFilename: f.previous_filename || f.previous_file_name || null,
                }));
                await commitRepository.saveCommitFiles(commitId, commitFiles);
              }
            } catch (err: any) {}

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

            await activityRepository.create({
              id: `act-cmt-${c.sha}`,
              repositoryId: repo.id,
              developerId: devId,
              eventType: 'COMMIT_PUSHED',
              entityType: 'COMMIT',
              entityId: c.sha,
              occurredAt: committedAt,
              metadata: {
                sha: c.sha,
                message: c.commit.message.split('\n')[0],
                additions,
                deletions,
              },
            });

            counts.commits++;
            counts.activities++;
          }

          if (commits.length < 100) hasMoreCommits = false;
          else commitPage++;
        } catch (err: any) {
          logger.warn('SYNC', `Commit pagination stopped at page ${commitPage} for ${repo.full_name}: ${err.message}`);
          hasMoreCommits = false;
        }
      }

      // 5. Paginated Sync for Pull Requests
      let prPage = 1;
      let hasMorePRs = true;

      while (hasMorePRs && prPage <= 10) {
        try {
          const prs = await githubClient.getPullRequests(repo.owner, repo.name, 'all', prPage, 100);
          if (!prs || prs.length === 0) {
            hasMorePRs = false;
            break;
          }

          for (const pr of prs) {
            let authorDevId: string | null = null;
            if (pr.user?.login) {
              const dev = await developerRepository.upsert({
                id: `dev-${pr.user.id || pr.user.login}`,
                organizationId: targetOrgId,
                githubUserId: pr.user.id,
                login: pr.user.login,
                name: pr.user.login,
                avatarUrl: pr.user.avatar_url,
                htmlUrl: pr.user.html_url || `https://github.com/${pr.user.login}`,
              });
              authorDevId = dev.id;
              await developerRepository.linkToRepository(repo.id, dev.id);
            }

            const prId = `pr-${repo.id}-${pr.number}`;
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
              state: pr.state ? pr.state.toUpperCase() : 'OPEN',
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
            counts.pullRequests++;

            try {
              const reviews = await githubClient.getPullRequestReviews(repo.owner, repo.name, pr.number);
              for (const r of reviews) {
                let reviewerDevId: string | null = null;
                if (r.user?.login) {
                  const dev = await developerRepository.upsert({
                    id: `dev-${r.user.id || r.user.login}`,
                    organizationId: targetOrgId,
                    githubUserId: r.user.id,
                    login: r.user.login,
                    name: r.user.login,
                    avatarUrl: r.user.avatar_url,
                    htmlUrl: r.user.html_url || `https://github.com/${r.user.login}`,
                  });
                  reviewerDevId = dev.id;
                  await developerRepository.linkToRepository(repo.id, dev.id);
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
                counts.reviews++;
              }
            } catch (err: any) {}

            await activityRepository.create({
              id: `act-pr-${pr.id}`,
              repositoryId: repo.id,
              developerId: authorDevId,
              eventType: pr.merged_at ? 'PULL_REQUEST_MERGED' : pr.state === 'closed' ? 'PULL_REQUEST_CLOSED' : 'PULL_REQUEST_OPENED',
              entityType: 'PULL_REQUEST',
              entityId: String(pr.number),
              occurredAt: mergedAt || closedAt || createdAt,
              metadata: {
                prNumber: pr.number,
                title: pr.title,
                state: pr.state,
              },
            });
            counts.activities++;
          }

          if (prs.length < 100) hasMorePRs = false;
          else prPage++;
        } catch (err: any) {
          hasMorePRs = false;
        }
      }

      // 6. Paginated Sync for Issues
      let issuePage = 1;
      let hasMoreIssues = true;

      while (hasMoreIssues && issuePage <= 10) {
        try {
          const issues = await githubClient.getIssues(repo.owner, repo.name, 'all', issuePage, 100);
          if (!issues || issues.length === 0) {
            hasMoreIssues = false;
            break;
          }

          for (const issue of issues) {
            let authorDevId: string | null = null;
            if (issue.user?.login) {
              const dev = await developerRepository.upsert({
                id: `dev-${issue.user.id || issue.user.login}`,
                organizationId: targetOrgId,
                githubUserId: issue.user.id,
                login: issue.user.login,
                name: issue.user.login,
                avatarUrl: issue.user.avatar_url,
                htmlUrl: issue.user.html_url || `https://github.com/${issue.user.login}`,
              });
              authorDevId = dev.id;
              await developerRepository.linkToRepository(repo.id, dev.id);
            }

            let assigneeDevId: string | null = null;
            if (issue.assignee?.login) {
              const aDev = await developerRepository.upsert({
                id: `dev-${issue.assignee.id || issue.assignee.login}`,
                organizationId: targetOrgId,
                githubUserId: issue.assignee.id,
                login: issue.assignee.login,
                name: issue.assignee.login,
                avatarUrl: issue.assignee.avatar_url,
                htmlUrl: issue.assignee.html_url || `https://github.com/${issue.assignee.login}`,
              });
              assigneeDevId = aDev.id;
              await developerRepository.linkToRepository(repo.id, aDev.id);
            }

            const issueId = `iss-${repo.id}-${issue.number}`;
            await issueRepository.upsert({
              id: issueId,
              repositoryId: repo.id,
              githubIssueId: issue.id,
              number: issue.number,
              authorDeveloperId: authorDevId,
              assigneeDeveloperId: assigneeDevId,
              title: issue.title,
              body: issue.body || null,
              state: issue.state ? issue.state.toUpperCase() : 'OPEN',
              labels: issue.labels ? issue.labels.map((l: any) => (typeof l === 'string' ? l : l.name)) : [],
              closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
              createdAt: new Date(issue.created_at),
              updatedAt: new Date(issue.updated_at),
              commentsCount: issue.comments,
              htmlUrl: issue.html_url,
            });
            counts.issues++;

            await activityRepository.create({
              id: `act-iss-${issue.id}`,
              repositoryId: repo.id,
              developerId: authorDevId,
              eventType: issue.state === 'closed' ? 'ISSUE_CLOSED' : 'ISSUE_OPENED',
              entityType: 'ISSUE',
              entityId: String(issue.number),
              occurredAt: issue.closed_at ? new Date(issue.closed_at) : new Date(issue.created_at),
              metadata: {
                issueNumber: issue.number,
                title: issue.title,
                state: issue.state,
              },
            });
            counts.activities++;
          }

          if (issues.length < 100) hasMoreIssues = false;
          else issuePage++;
        } catch (err: any) {
          hasMoreIssues = false;
        }
      }

      // Mark Repository & Job Completed
      const totalProcessed = counts.commits + counts.pullRequests + counts.issues + counts.reviews;
      const completedAt = new Date();
      await repositoryRepository.updateSyncStatus(repo.id, 'SYNCED', completedAt, null);
      await syncJobRepository.complete(jobId, totalProcessed);

      logger.info('SYNC', `[SYNC] Commits fetched: ${totalCommitsFetched}`);
      logger.info('SYNC', `[SYNC] Commits inserted: ${counts.commits}`);
      logger.info('SYNC', `[SYNC] Developers processed: ${counts.developers}`);
      logger.info('SYNC', `[SYNC] Pull requests processed: ${counts.pullRequests}`);
      logger.info('SYNC', `[SYNC] Issues processed: ${counts.issues}`);
      logger.info('SYNC', `[SYNC] Sync completed successfully`);

      return {
        success: true,
        status: 'COMPLETED',
        repository: {
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          owner: repo.owner,
          isPrivate: repo.is_private,
          defaultBranch: repo.default_branch,
        },
        synchronized: true,
        counts,
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
      };
    } catch (err: any) {
      logger.error('SYNC', `Failed ${syncMode} sync for ${repo.full_name}: ${err.message}`, err);
      await repositoryRepository.updateSyncStatus(repo.id, 'FAILED', undefined, err.message);
      await syncJobRepository.fail(jobId, err.message);
      throw err;
    }
  }

  async syncRepositoryIncremental(repositoryId: string, organizationId?: string): Promise<SyncResult> {
    return this.runFullHistoricalSync(repositoryId, organizationId);
  }
}

export const syncService = new SyncService();
