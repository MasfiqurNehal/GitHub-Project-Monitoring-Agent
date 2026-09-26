import { Request, Response, NextFunction } from 'express';
import { commitRepository } from '../repositories/commit.repository.js';
import { repositoryRepository } from '../repositories/repository.repository.js';
import { developerRepository } from '../repositories/developer.repository.js';
import { logger } from '../utils/logger.js';

// 1. GET /api/repositories/:id/commits
export async function getRepositoryCommits(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { date_from, date_to, developer, page, limit, per_page } = req.query;
    const orgId = (req as any).organizationId;

    // Verify repository exists
    let repo = await repositoryRepository.findById(id);
    if (!repo) {
      repo = await repositoryRepository.findByFullName(id);
    }

    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    const pageSize = Number(limit || per_page || 20);
    const result = await commitRepository.findCommits({
      organizationId: orgId,
      repositoryId: repo.id,
      developerId: developer as string,
      dateFrom: date_from as string,
      dateTo: date_to as string,
      page: Number(page) || 1,
      limit: pageSize,
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

// 2. GET /api/commits/:id
export async function getCommitDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const orgId = (req as any).organizationId;
    const commit = await commitRepository.findByIdOrSha(id, orgId);

    if (!commit) {
      return res.status(404).json({ success: false, error: 'Commit not found' });
    }

    res.json({
      success: true,
      data: commit,
    });
  } catch (err) {
    next(err);
  }
}

// 3. GET /api/developers/:id/commits
export async function getDeveloperCommits(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { date_from, date_to, repository, project, page, limit, per_page } = req.query;
    const orgId = (req as any).organizationId;

    // Verify developer exists
    let dev = await developerRepository.findById(id);
    if (!dev) {
      dev = await developerRepository.findByLogin(id);
    }

    if (!dev) {
      return res.status(404).json({ success: false, error: 'Developer not found' });
    }

    const pageSize = Number(limit || per_page || 20);
    const result = await commitRepository.findCommits({
      organizationId: orgId,
      developerId: dev.id,
      repositoryId: repository as string,
      projectId: project as string,
      dateFrom: date_from as string,
      dateTo: date_to as string,
      page: Number(page) || 1,
      limit: pageSize,
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

// 4. GET /api/commits/:id/changes
export async function getCommitChanges(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const orgId = (req as any).organizationId;
    const commit = await commitRepository.findByIdOrSha(id, orgId);

    if (!commit) {
      return res.status(404).json({ success: false, error: 'Commit not found' });
    }

    const files = await commitRepository.findCommitFiles(id, orgId);

    res.json({
      success: true,
      data: {
        commitId: commit.id,
        githubCommitSha: commit.github_commit_sha,
        changedFilesCount: files.length,
        files: files.map((f) => ({
          id: f.id,
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes,
          patch: f.patch,
          previousFilename: f.previous_filename,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}
