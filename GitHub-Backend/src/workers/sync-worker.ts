import { prisma } from '../db/prisma.js';
import { githubRestService } from '../github/github-rest.service.js';

export async function syncRepositoryHistoricalData(repositoryId: string, owner: string, repo: string) {
  console.log(`[SyncEngine] Starting historical sync for repository: ${owner}/${repo}`);

  // Create or update SyncJob record
  const syncJob = await prisma.syncJob.create({
    data: {
      repositoryId,
      type: 'HISTORICAL_FULL',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  });

  try {
    // 1. Fetch & store repository metadata
    const repoData = await githubRestService.getRepositoryDetails(owner, repo);
    await prisma.repository.update({
      where: { id: repositoryId },
      data: {
        githubId: repoData.id,
        defaultBranch: repoData.default_branch,
        language: repoData.language,
        url: repoData.html_url,
        lastSyncedAt: new Date(),
      },
    });

    // 2. Fetch Contributors / Developers
    const contributors = await githubRestService.fetchContributors(owner, repo);
    for (const contrib of contributors) {
      if (!contrib.login) continue;

      const developer = await prisma.developer.upsert({
        where: { login: contrib.login },
        update: {
          avatarUrl: contrib.avatar_url,
          profileUrl: contrib.html_url,
          githubUserId: contrib.id,
        },
        create: {
          login: contrib.login,
          avatarUrl: contrib.avatar_url,
          profileUrl: contrib.html_url,
          githubUserId: contrib.id,
        },
      });

      // Map developer membership
      await prisma.repositoryMember.upsert({
        where: {
          repositoryId_developerId: {
            repositoryId,
            developerId: developer.id,
          },
        },
        update: {},
        create: {
          repositoryId,
          developerId: developer.id,
        },
      });
    }

    // 3. Sync Commits
    const commits = await githubRestService.fetchCommits(owner, repo, { per_page: 50 });
    for (const commitItem of commits) {
      let authorId: string | null = null;
      if (commitItem.author?.login) {
        const dev = await prisma.developer.findUnique({ where: { login: commitItem.author.login } });
        if (dev) authorId = dev.id;
      }

      const committedAt = commitItem.commit.author?.date ? new Date(commitItem.commit.author.date) : new Date();

      const commitRecord = await prisma.commit.upsert({
        where: { githubSha: commitItem.sha },
        update: {
          message: commitItem.commit.message,
          committedAt,
        },
        create: {
          repositoryId,
          githubSha: commitItem.sha,
          authorId,
          message: commitItem.commit.message,
          commitUrl: commitItem.html_url,
          committedAt,
        },
      });

      // Record Activity Event
      await prisma.activityEvent.create({
        data: {
          repositoryId,
          developerId: authorId,
          eventType: 'commit',
          sourceId: commitRecord.id,
          occurredAt: committedAt,
          metadataJson: { sha: commitItem.sha, message: commitItem.commit.message },
        },
      });
    }

    // 4. Sync Pull Requests
    const prs = await githubRestService.fetchPullRequests(owner, repo, 'all', 50);
    for (const prItem of prs) {
      let authorId: string | null = null;
      if (prItem.user?.login) {
        const dev = await prisma.developer.findUnique({ where: { login: prItem.user.login } });
        if (dev) authorId = dev.id;
      }

      let state: 'OPEN' | 'CLOSED' | 'MERGED' = 'OPEN';
      if (prItem.merged_at) state = 'MERGED';
      else if (prItem.state === 'closed') state = 'CLOSED';

      const createdAt = new Date(prItem.created_at);
      const prRecord = await prisma.pullRequest.upsert({
        where: { githubPrId: prItem.id },
        update: {
          title: prItem.title,
          body: prItem.body || '',
          state,
          updatedAt: new Date(prItem.updated_at),
          closedAt: prItem.closed_at ? new Date(prItem.closed_at) : null,
          mergedAt: prItem.merged_at ? new Date(prItem.merged_at) : null,
        },
        create: {
          repositoryId,
          githubPrId: prItem.id,
          number: prItem.number,
          authorId,
          title: prItem.title,
          body: prItem.body || '',
          state,
          createdAt,
          updatedAt: new Date(prItem.updated_at),
          closedAt: prItem.closed_at ? new Date(prItem.closed_at) : null,
          mergedAt: prItem.merged_at ? new Date(prItem.merged_at) : null,
        },
      });

      // Record Activity Event
      await prisma.activityEvent.create({
        data: {
          repositoryId,
          developerId: authorId,
          eventType: `pr_${state.toLowerCase()}`,
          sourceId: prRecord.id,
          occurredAt: createdAt,
          metadataJson: { prNumber: prItem.number, title: prItem.title },
        },
      });
    }

    // Complete SyncJob
    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date(),
      },
    });

    console.log(`[SyncEngine] Successfully synchronized repository: ${owner}/${repo}`);
  } catch (error: any) {
    console.error(`[SyncEngine] Historical sync failed for ${owner}/${repo}:`, error.message);
    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'FAILED',
        error: error.message,
        completedAt: new Date(),
      },
    });
  }
}
