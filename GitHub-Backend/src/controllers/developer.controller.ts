import { Request, Response, NextFunction } from 'express';
import { developerRepository } from '../repositories/developer.repository.js';
import { pullRequestRepository } from '../repositories/pullRequest.repository.js';
import { issueRepository } from '../repositories/issue.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';
import { developerService } from '../services/developer.service.js';

// 1. GET /api/developers
export async function listDevelopers(req: Request, res: Response, next: NextFunction) {
  try {
    const { date_from, from, dateFrom, date_to, to, dateTo, page, limit, per_page, project, projectId, repository, repositoryId, search, q } = req.query;
    const orgId = (req as any).organizationId;
    const result = await developerRepository.findWithMetrics({
      organizationId: orgId,
      projectId: (project || projectId) as string | undefined,
      repositoryId: (repository || repositoryId) as string | undefined,
      search: (search || q) as string | undefined,
      dateFrom: (date_from || from || dateFrom) as string | undefined,
      dateTo: (date_to || to || dateTo) as string | undefined,
      page: Number(page) || 1,
      limit: Number(limit || per_page || 50),
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 2. GET /api/developers/:id
export async function getDeveloperDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { date_from, from, dateFrom, date_to, to, dateTo, project, projectId, repository, repositoryId, type, activityType } = req.query;
    const orgId = (req as any).organizationId;
    
    const filters = {
      organizationId: orgId,
      dateFrom: (date_from || from || dateFrom) as string | undefined,
      dateTo: (date_to || to || dateTo) as string | undefined,
      projectId: (project || projectId) as string | undefined,
      repositoryId: (repository || repositoryId) as string | undefined,
      activityType: (type || activityType) as string | undefined,
    };

    const detail = await developerService.getDeveloperDetail(id, filters);

    if (!detail) {
      return res.status(404).json({ success: false, error: 'Developer not found' });
    }

    res.json({ success: true, data: detail });
  } catch (err) {
    next(err);
  }
}

// 3. GET /api/developers/:id/activity
export async function getDeveloperActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { date_from, date_to, page, limit, per_page } = req.query;
    const orgId = (req as any).organizationId;

    let dev = await developerRepository.findById(id, orgId);
    if (!dev) {
      dev = await developerRepository.findByLogin(id, orgId);
    }
    if (!dev) {
      return res.status(404).json({ success: false, error: 'Developer not found' });
    }

    const activity = await activityRepository.findActivityFeed({
      organizationId: orgId,
      developerId: dev.id,
      from: date_from ? new Date(date_from as string) : undefined,
      to: date_to ? new Date(date_to as string) : undefined,
      page: Number(page) || 1,
      limit: Number(limit || per_page || 20),
    });

    res.json({
      success: true,
      data: activity.data,
      pagination: {
        total: activity.total,
        page: activity.page,
        limit: activity.limit,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 4. GET /api/developers/:id/pull-requests
export async function getDeveloperPullRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { date_from, date_to, repository, state, page, limit, per_page } = req.query;
    const orgId = (req as any).organizationId;

    let dev = await developerRepository.findById(id, orgId);
    if (!dev) {
      dev = await developerRepository.findByLogin(id, orgId);
    }
    if (!dev) {
      return res.status(404).json({ success: false, error: 'Developer not found' });
    }

    const result = await pullRequestRepository.findByDeveloper(dev.id, {
      organizationId: orgId,
      repositoryId: repository as string,
      state: state as string,
      dateFrom: date_from as string,
      dateTo: date_to as string,
      page: Number(page) || 1,
      limit: Number(limit || per_page || 20),
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 5. GET /api/developers/:id/issues
export async function getDeveloperIssues(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { date_from, date_to, repository, state, page, limit, per_page } = req.query;
    const orgId = (req as any).organizationId;

    let dev = await developerRepository.findById(id, orgId);
    if (!dev) {
      dev = await developerRepository.findByLogin(id, orgId);
    }
    if (!dev) {
      return res.status(404).json({ success: false, error: 'Developer not found' });
    }

    const result = await issueRepository.findByDeveloper(dev.id, {
      organizationId: orgId,
      repositoryId: repository as string,
      state: state as string,
      dateFrom: date_from as string,
      dateTo: date_to as string,
      page: Number(page) || 1,
      limit: Number(limit || per_page || 20),
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 6. GET /api/developers/:id/reviews
export async function getDeveloperReviews(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { date_from, date_to, repository, state, page, limit, per_page } = req.query;
    const orgId = (req as any).organizationId;

    let dev = await developerRepository.findById(id, orgId);
    if (!dev) {
      dev = await developerRepository.findByLogin(id, orgId);
    }
    if (!dev) {
      return res.status(404).json({ success: false, error: 'Developer not found' });
    }


    const result = await pullRequestRepository.findReviewsByDeveloper(dev.id, {
      organizationId: orgId,
      repositoryId: repository as string,
      state: state as string,
      dateFrom: date_from as string,
      dateTo: date_to as string,
      page: Number(page) || 1,
      limit: Number(limit || per_page || 20),
    });

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 7. GET /api/analytics/developers/:id
export async function getFactualDeveloperAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { date_from, from, dateFrom, date_to, to, dateTo, repository, repositoryId, project, projectId } = req.query;
    const orgId = (req as any).organizationId;

    const filters = {
      organizationId: orgId,
      dateFrom: (date_from || from || dateFrom) as string | undefined,
      dateTo: (date_to || to || dateTo) as string | undefined,
      repositoryId: (repository || repositoryId) as string | undefined,
      projectId: (project || projectId) as string | undefined,
    };

    const analytics = await developerService.getFactualDeveloperAnalytics(id, filters);

    if (!analytics) {
      return res.status(404).json({ success: false, error: 'Developer not found' });
    }

    res.json({
      success: true,
      data: analytics,
    });
  } catch (err) {
    next(err);
  }
}

