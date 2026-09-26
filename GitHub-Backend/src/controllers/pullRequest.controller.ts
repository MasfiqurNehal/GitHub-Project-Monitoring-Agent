import { Request, Response, NextFunction } from 'express';
import { pullRequestRepository } from '../repositories/pullRequest.repository.js';
import { repositoryRepository } from '../repositories/repository.repository.js';

// 1. GET /api/pull-requests
export async function listPullRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const { repository, repositoryId, project, projectId, developer, developerId, state, date_from, date_to, page, limit, per_page } = req.query;
    const orgId = (req as any).organizationId;

    const result = await pullRequestRepository.findPullRequests({
      organizationId: orgId,
      repositoryId: (repository || repositoryId) as string,
      projectId: (project || projectId) as string,
      developerId: (developer || developerId) as string,
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

// 2. GET /api/pull-requests/:id
export async function getPullRequestDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const orgId = (req as any).organizationId;
    const detail = await pullRequestRepository.findDetailById(id, orgId);

    if (!detail) {
      return res.status(404).json({ success: false, error: 'Pull Request not found' });
    }

    res.json({
      success: true,
      data: detail,
    });
  } catch (err) {
    next(err);
  }
}

// 3. GET /api/repositories/:id/pull-requests
export async function getRepositoryPullRequests(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { developer, state, date_from, date_to, page, limit, per_page } = req.query;
    const orgId = (req as any).organizationId;

    let repo = await repositoryRepository.findById(id);
    if (!repo) {
      repo = await repositoryRepository.findByFullName(id);
    }

    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    const result = await pullRequestRepository.findPullRequests({
      organizationId: orgId,
      repositoryId: repo.id,
      developerId: developer as string,
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
