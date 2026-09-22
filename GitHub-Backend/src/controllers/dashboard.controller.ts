import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service.js';

export async function getDashboardOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, repositoryId, developerId, from, to } = req.query;
    const filters = {
      projectId: projectId as string,
      repositoryId: repositoryId as string,
      developerId: developerId as string,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
    };
    const data = await analyticsService.getDashboardOverview(filters);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getEngineeringSignals(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getEngineeringSignals();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
