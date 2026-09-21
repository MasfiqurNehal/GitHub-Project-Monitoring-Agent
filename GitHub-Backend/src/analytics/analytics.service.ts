import { prisma } from '../db/prisma.js';

export interface FilterOptions {
  projectId?: string;
  repositoryId?: string;
  developerId?: string;
  from?: Date;
  to?: Date;
}

export class AnalyticsService {
  /**
   * Calculate Overview Dashboard Metrics deterministically from database
   */
  async getDashboardOverview(filters: FilterOptions) {
    const whereRepo: any = {};
    if (filters.projectId) whereRepo.projectId = filters.projectId;
    if (filters.repositoryId) whereRepo.id = filters.repositoryId;

    const whereCommit: any = {};
    if (filters.developerId) whereCommit.authorId = filters.developerId;
    if (filters.repositoryId) whereCommit.repositoryId = filters.repositoryId;
    else if (filters.projectId) whereCommit.repository = { projectId: filters.projectId };

    if (filters.from || filters.to) {
      whereCommit.committedAt = {};
      if (filters.from) whereCommit.committedAt.gte = filters.from;
      if (filters.to) whereCommit.committedAt.lte = filters.to;
    }

    const wherePR: any = {};
    if (filters.developerId) wherePR.authorId = filters.developerId;
    if (filters.repositoryId) wherePR.repositoryId = filters.repositoryId;
    else if (filters.projectId) wherePR.repository = { projectId: filters.projectId };

    if (filters.from || filters.to) {
      wherePR.createdAt = {};
      if (filters.from) wherePR.createdAt.gte = filters.from;
      if (filters.to) wherePR.createdAt.lte = filters.to;
    }

    const [
      totalProjects,
      totalRepositories,
      totalCommits,
      commitStats,
      totalPRs,
      mergedPRs,
      openPRs,
      totalReviews,
      totalDevelopers,
    ] = await Promise.all([
      prisma.project.count({ where: { status: 'ACTIVE' } }),
      prisma.repository.count({ where: whereRepo }),
      prisma.commit.count({ where: whereCommit }),
      prisma.commit.aggregate({
        where: whereCommit,
        _sum: { additions: true, deletions: true },
      }),
      prisma.pullRequest.count({ where: wherePR }),
      prisma.pullRequest.count({ where: { ...wherePR, state: 'MERGED' } }),
      prisma.pullRequest.count({ where: { ...wherePR, state: 'OPEN' } }),
      prisma.pullRequestReview.count({
        where: filters.developerId ? { reviewerId: filters.developerId } : {},
      }),
      prisma.developer.count(),
    ]);

    // Query activity trend grouped by date
    const activityTrend = await this.getActivityTrend(filters);

    return {
      kpi: {
        totalProjects,
        totalRepositories,
        totalCommits,
        totalPRs,
        mergedPRs,
        openPRs,
        totalReviews,
        activeDevelopers: totalDevelopers,
        linesAdded: commitStats._sum.additions || 0,
        linesDeleted: commitStats._sum.deletions || 0,
      },
      activityTrend,
    };
  }

  /**
   * Get activity trend over time for charts
   */
  async getActivityTrend(filters: FilterOptions) {
    const where: any = {};
    if (filters.repositoryId) where.repositoryId = filters.repositoryId;
    else if (filters.projectId) where.repository = { projectId: filters.projectId };
    if (filters.developerId) where.developerId = filters.developerId;

    if (filters.from || filters.to) {
      where.occurredAt = {};
      if (filters.from) where.occurredAt.gte = filters.from;
      if (filters.to) where.occurredAt.lte = filters.to;
    }

    const events = await prisma.activityEvent.findMany({
      where,
      orderBy: { occurredAt: 'asc' },
      take: 500,
    });

    // Aggregate by date (YYYY-MM-DD)
    const trendMap: Record<string, { date: string; commits: number; prs: number; reviews: number }> = {};

    events.forEach((ev) => {
      const dateStr = ev.occurredAt.toISOString().split('T')[0];
      if (!trendMap[dateStr]) {
        trendMap[dateStr] = { date: dateStr, commits: 0, prs: 0, reviews: 0 };
      }
      if (ev.eventType === 'commit' || ev.eventType === 'push') {
        trendMap[dateStr].commits++;
      } else if (ev.eventType.startsWith('pr_')) {
        trendMap[dateStr].prs++;
      } else if (ev.eventType === 'pr_reviewed') {
        trendMap[dateStr].reviews++;
      }
    });

    return Object.values(trendMap);
  }

  /**
   * Detailed breakdown for a specific developer
   */
  async getDeveloperMetrics(developerId: string) {
    const developer = await prisma.developer.findUnique({
      where: { id: developerId },
      include: {
        commits: { take: 10, orderBy: { committedAt: 'desc' }, include: { repository: true } },
        pullRequests: { take: 10, orderBy: { createdAt: 'desc' }, include: { repository: true } },
        reviews: { take: 10, orderBy: { submittedAt: 'desc' } },
      },
    });

    if (!developer) return null;

    const commitStats = await prisma.commit.aggregate({
      where: { authorId: developerId },
      _count: true,
      _sum: { additions: true, deletions: true },
    });

    const prStats = await prisma.pullRequest.groupBy({
      by: ['state'],
      where: { authorId: developerId },
      _count: true,
    });

    return {
      developer,
      totalCommits: commitStats._count || 0,
      linesAdded: commitStats._sum.additions || 0,
      linesDeleted: commitStats._sum.deletions || 0,
      pullRequestBreakdown: prStats,
    };
  }

  /**
   * Detect potential engineering activity signals (low activity, PR aging, code churn)
   */
  async getEngineeringSignals() {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // Repositories with no activity in last 14 days
    const inactiveRepos = await prisma.repository.findMany({
      where: {
        isActive: true,
        commits: {
          none: {
            committedAt: { gte: fourteenDaysAgo },
          },
        },
      },
      select: { id: true, name: true, owner: true, fullName: true, lastSyncedAt: true },
    });

    // PRs open for more than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const stalePRs = await prisma.pullRequest.findMany({
      where: {
        state: 'OPEN',
        createdAt: { lte: sevenDaysAgo },
      },
      include: {
        author: true,
        repository: true,
      },
      take: 20,
    });

    return {
      inactiveRepositories: inactiveRepos,
      stalePullRequests: stalePRs,
    };
  }
}

export const analyticsService = new AnalyticsService();
