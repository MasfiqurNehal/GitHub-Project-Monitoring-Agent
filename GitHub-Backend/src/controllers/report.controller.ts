import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service.js';

export async function listReports(req: Request, res: Response, next: NextFunction) {
  try {
    const { periodType, projectId, repositoryId, developerId, search } = req.query;
    const reports = await reportService.listReports({
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

export async function generateReport(req: Request, res: Response, next: NextFunction) {
  try {
    const { periodType, projectId } = req.body;
    const data = await reportService.generateReport(periodType, projectId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getReportDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = await reportService.generateReport('WEEKLY');
    res.json({ success: true, data: { ...data, meta: { ...data.meta, id } } });
  } catch (err) {
    next(err);
  }
}
