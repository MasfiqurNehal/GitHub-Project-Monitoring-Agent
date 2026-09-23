import { Request, Response, NextFunction } from 'express';
import { analyticsService, DashboardFilters } from '../services/analytics.service.js';

function parseFilters(req: Request): DashboardFilters & { preset?: string } {
  const { project, projectId, repository, repositoryId, developer, developerId, date_from, from, dateFrom, date_to, to, dateTo, preset } = req.query;

  return {
    projectId: (project || projectId) as string | undefined,
    repositoryId: (repository || repositoryId) as string | undefined,
    developerId: (developer || developerId) as string | undefined,
    dateFrom: (date_from || from || dateFrom) as string | undefined,
    dateTo: (date_to || to || dateTo) as string | undefined,
    preset: preset as string | undefined,
  };
}

// 1. GET /api/dashboard/overview
export async function getDashboardOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = parseFilters(req);
    const data = await analyticsService.getDashboardOverview(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// 2. GET /api/dashboard/activity
export async function getDashboardActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = parseFilters(req);
    const data = await analyticsService.getDashboardActivity(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// 3. GET /api/dashboard/commits
export async function getDashboardCommits(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = parseFilters(req);
    const data = await analyticsService.getDashboardCommits(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// 4. GET /api/dashboard/pull-requests
export async function getDashboardPullRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = parseFilters(req);
    const data = await analyticsService.getDashboardPullRequests(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// 5. GET /api/dashboard/issues
export async function getDashboardIssues(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = parseFilters(req);
    const data = await analyticsService.getDashboardIssues(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// 6. GET /api/dashboard/developers
export async function getDashboardDevelopers(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = parseFilters(req);
    const data = await analyticsService.getDashboardDevelopers(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// 7. GET /api/dashboard/repositories
export async function getDashboardRepositories(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = parseFilters(req);
    const data = await analyticsService.getDashboardRepositories(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// 8. GET /api/analytics/daily
export async function getDailyAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = parseFilters(req);
    const data = await analyticsService.getDailyAnalytics(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

