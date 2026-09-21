import { analyticsService } from '../../analytics/analytics.service.js';
import { prisma } from '../../db/prisma.js';

export const agentTools = {
  /**
   * Tool: Retrieve overview metrics for dashboard
   */
  async getDashboardOverview(args: { projectId?: string; repositoryId?: string; developerId?: string }) {
    return await analyticsService.getDashboardOverview(args);
  },

  /**
   * Tool: Get developer specific performance metrics
   */
  async getDeveloperMetrics(args: { developerId: string }) {
    return await analyticsService.getDeveloperMetrics(args.developerId);
  },

  /**
   * Tool: List active projects and connected repositories
   */
  async getProjectsAndRepositories() {
    const projects = await prisma.project.findMany({
      include: {
        repositories: {
          select: { id: true, name: true, owner: true, fullName: true, language: true, lastSyncedAt: true },
        },
      },
    });
    return projects;
  },

  /**
   * Tool: Get activity signals & alerts (inactive repos, stale PRs)
   */
  async getEngineeringSignals() {
    return await analyticsService.getEngineeringSignals();
  },

  /**
   * Tool: Search commits by date or repository
   */
  async getCommits(args: { repositoryId?: string; limit?: number }) {
    return await prisma.commit.findMany({
      where: args.repositoryId ? { repositoryId: args.repositoryId } : {},
      take: args.limit || 20,
      orderBy: { committedAt: 'desc' },
      include: { author: true, repository: true },
    });
  },
};
