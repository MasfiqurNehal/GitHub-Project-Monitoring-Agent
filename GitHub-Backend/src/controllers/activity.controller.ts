import { Request, Response, NextFunction } from 'express';
import { activityRepository } from '../repositories/activity.repository.js';

export async function getActivityStream(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId, repositoryId, developerId, activityType, from, to, page, pageSize } = req.query;

    const filters = {
      projectId: projectId as string,
      repositoryId: repositoryId as string,
      developerId: developerId as string,
      eventType: activityType as string,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: pageSize ? parseInt(pageSize as string, 10) : 25,
    };

    const result = await activityRepository.findActivityFeed(filters);
    res.json({
      success: true,
      data: result.data,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (err) {
    next(err);
  }
}
