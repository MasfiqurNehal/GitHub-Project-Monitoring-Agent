import { Request, Response, NextFunction } from 'express';
import { reportService, ReportFilters } from '../services/report.service.js';

function extractFilters(req: Request): ReportFilters {
  const {
    date_from,
    dateFrom,
    date_to,
    dateTo,
    date,
    projectId,
    project,
    repositoryId,
    repository,
    developerId,
    developer,
  } = req.query;

  return {
    organizationId: (req as any).organizationId as string,
    dateFrom: (dateFrom || date_from) as string,
    dateTo: (dateTo || date_to) as string,
    date: date as string,
    projectId: (projectId || project) as string,
    repositoryId: (repositoryId || repository) as string,
    developerId: (developerId || developer) as string,
  };
}

// 1. GET /api/reports
export async function listReports(req: Request, res: Response, next: NextFunction) {
  try {
    const { periodType, projectId, repositoryId, developerId, search } = req.query;
    const orgId = (req as any).organizationId;
    const reports = await reportService.listReports({
      organizationId: orgId,
      periodType: periodType as string,
      projectId: projectId as string,
      repositoryId: repositoryId as string,
      developerId: developerId as string,
      search: search as string,
    });
    res.json({ success: true, data: reports });
  } catch (err) {
    next(err);
  }
}

// 2. GET /api/reports/daily
export async function getDailyReport(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = extractFilters(req);
    const report = await reportService.getDailyReport(filters);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

// 3. GET /api/reports/weekly
export async function getWeeklyReport(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = extractFilters(req);
    const report = await reportService.getWeeklyReport(filters);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

// 4. GET /api/reports/monthly
export async function getMonthlyReport(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = extractFilters(req);
    const report = await reportService.getMonthlyReport(filters);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

// 5. GET /api/reports/project/:id
export async function getProjectReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const filters = extractFilters(req);
    const report = await reportService.getProjectReport(id, filters);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

// 6. GET /api/reports/repository/:id
export async function getRepositoryReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const filters = extractFilters(req);
    const report = await reportService.getRepositoryReport(id, filters);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

// 7. GET /api/reports/developer/:id
export async function getDeveloperReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const filters = extractFilters(req);
    const report = await reportService.getDeveloperReport(id, filters);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

// 8. POST /api/reports/generate
export async function generateReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { periodType, projectId } = req.body;
    const orgId = (req as any).organizationId;
    const report = await reportService.generateReport(periodType, projectId, orgId);
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}


// 9. GET /api/reports/:id
export async function getReportDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (id === 'daily') return getDailyReport(req, res, next);
    if (id === 'weekly') return getWeeklyReport(req, res, next);
    if (id === 'monthly') return getMonthlyReport(req, res, next);

    const report = await reportService.getWeeklyReport(extractFilters(req));
    res.json({ success: true, data: { ...report, meta: { ...report.meta, id } } });
  } catch (err) {
    next(err);
  }
}
