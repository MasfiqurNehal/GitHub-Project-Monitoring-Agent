import { Request, Response, NextFunction } from 'express';
import { issueRepository } from '../repositories/issue.repository.js';
import { repositoryRepository } from '../repositories/repository.repository.js';

// 1. GET /api/issues
export async function listIssues(req: Request, res: Response, next: NextFunction) {
  try {
    const { repository, repositoryId, project, projectId, developer, developerId, state, date_from, date_to, page, limit, per_page } = req.query;
    const orgId = (req as any).organizationId;

    const result = await issueRepository.findIssues({
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

// 2. GET /api/issues/:id
export async function getIssueDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const orgId = (req as any).organizationId;
    const detail = await issueRepository.findDetailById(id, orgId);

    if (!detail) {
      return res.status(404).json({ success: false, error: 'Issue not found' });
    }

    res.json({
      success: true,
      data: detail,
    });
  } catch (err) {
    next(err);
  }
}

// 3. GET /api/repositories/:id/issues
export async function getRepositoryIssues(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { developer, state, date_from, date_to, page, limit, per_page } = req.query;
    const orgId = (req as any).organizationId;

    let repo = await repositoryRepository.findById(id, orgId);
    if (!repo) {
      repo = await repositoryRepository.findByFullName(id, orgId);
    }


    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    const result = await issueRepository.findIssues({
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
