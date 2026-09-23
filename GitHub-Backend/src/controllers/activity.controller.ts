import { Request, Response, NextFunction } from 'express';
import { activityRepository } from '../repositories/activity.repository.js';

export async function getActivityStream(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      project,
      projectId,
      repository,
      repositoryId,
      developer,
      developerId,
      activity_type,
      activityType,
      eventType,
      date_from,
      from,
      dateFrom,
      date_to,
      to,
      dateTo,
      page,
      limit,
      pageSize,
    } = req.query;

    const filters = {
      projectId: (project || projectId) as string | undefined,
      repositoryId: (repository || repositoryId) as string | undefined,
      developerId: (developer || developerId) as string | undefined,
      activityType: (activity_type || activityType || eventType) as string | undefined,
      from: (date_from || from || dateFrom) ? new Date((date_from || from || dateFrom) as string) : undefined,
      to: (date_to || to || dateTo) ? new Date((date_to || to || dateTo) as string) : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: (limit || pageSize) ? parseInt((limit || pageSize) as string, 10) : 25,
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

