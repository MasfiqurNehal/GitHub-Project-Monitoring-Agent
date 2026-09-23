import { Request, Response, NextFunction } from 'express';
import { repositoryRepository } from '../repositories/repository.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { syncJobRepository } from '../repositories/syncJob.repository.js';
import { githubService } from '../services/github.service.js';
import { syncService } from '../services/sync.service.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

// 1. GET /api/repositories
export async function listRepositories(req: Request, res: Response, next: NextFunction) {
  try {
    const repos = await repositoryRepository.findAll();
    res.json({ success: true, data: repos });
  } catch (err) {
    next(err);
  }
}

// 2. POST /api/repositories/validate
export async function validateRepositoryUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const { url, repositoryUrl } = req.body;
    const targetUrl = url || repositoryUrl;
    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'Repository URL is required' });
    }

    const validated = await githubService.validateRepository(targetUrl);
    res.json({ success: true, data: validated });
  } catch (err: any) {
    logger.warn('REPOSITORIES', `Validation failed for repository URL '${req.body?.url || req.body?.repositoryUrl}': ${err.message}`);
    res.status(400).json({ success: false, error: err.message || 'Validation failed' });
  }
}

// 3. POST /api/repositories
export async function addRepository(req: Request, res: Response, next: NextFunction) {
  try {
    const { repositoryUrl, url, projectName, projectId } = req.body;
    const targetUrl = repositoryUrl || url;
    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'Repository URL is required' });
    }

    // Validate repository access & fetch GitHub metadata
    const validated = await githubService.validateRepository(targetUrl);

    // Prevent duplicate repository connection
    const existing = await repositoryRepository.findByFullName(validated.fullName);
    if (existing) {
      logger.info('REPOSITORIES', `Prevented duplicate repository connection for '${validated.fullName}'`);
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_REPOSITORY',
        error: `Repository '${validated.fullName}' is already connected to the monitoring system.`,
        data: existing,
      });
    }

    // Resolve or create associated project
    let targetProjectId = projectId;
    if (!targetProjectId && projectName) {
      let prj = await projectRepository.findByName(projectName);
      if (!prj) {
        const prjId = `prj-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        prj = await projectRepository.create(prjId, projectName);
      }
      targetProjectId = prj.id;
    }

    const repoId = `repo-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const repository = await repositoryRepository.upsert({
      id: repoId,
      projectId: targetProjectId || null,
      githubRepositoryId: validated.githubRepositoryId,
      owner: validated.owner,
      name: validated.name,
      fullName: validated.fullName,
      htmlUrl: validated.url,
      defaultBranch: validated.defaultBranch,
      isPrivate: validated.isPrivate,
      description: validated.description || undefined,
      language: validated.language,
      stars: validated.starsCount,
    });

    logger.info('REPOSITORIES', `Successfully connected repository '${repository.full_name}' to Neon DB`);

    // Initiate async historical sync
    syncService.runFullHistoricalSync(repository.id).catch((err) => {
      logger.error('SYNC', `Async sync error for ${repository.full_name}: ${err.message}`);
    });

    res.status(201).json({ success: true, data: repository });
  } catch (err: any) {
    logger.error('REPOSITORIES', `Failed to connect repository: ${err.message}`, err);
    res.status(400).json({ success: false, error: err.message || 'Failed to connect repository' });
  }
}

// 4. GET /api/repositories/:id
export async function getRepositoryDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const repo = await repositoryRepository.findById(id);
    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    res.json({
      success: true,
      data: {
        repository: repo,
        overview: {
          openPRsCount: 0,
          mergedPRsCount: 0,
          openIssuesCount: repo.open_issues_count || 0,
          closedIssuesCount: 0,
          activeBranch: repo.default_branch || 'main',
          readOnlyStatus: true,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// 5. POST /api/repositories/:id/sync
export async function triggerRepositorySync(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const repo = await repositoryRepository.findById(id);
    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    syncService.runFullHistoricalSync(repo.id).catch((err) => {
      logger.error('SYNC', `Manual sync error for ${repo.full_name}: ${err.message}`);
    });

    res.json({ success: true, message: `Historical synchronization initiated for ${repo.full_name}` });
  } catch (err) {
    next(err);
  }
}

// 6. GET /api/repositories/:id/sync-status
export async function getSyncStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const repo = await repositoryRepository.findById(id);
    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    const latestJob = await syncJobRepository.findLatestByRepositoryId(repo.id);

    res.json({
      success: true,
      data: {
        repositoryId: repo.id,
        repositoryName: repo.full_name,
        syncStatus: repo.sync_status || 'not_started',
        lastSyncedAt: repo.last_synced_at,
        latestJob: latestJob
          ? {
              jobId: latestJob.id,
              status: latestJob.status,
              jobType: latestJob.job_type,
              recordsProcessed: latestJob.records_processed,
              startedAt: latestJob.started_at,
              completedAt: latestJob.completed_at,
              errorMessage: latestJob.error_message,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 7. DELETE /api/repositories/:id
export async function removeRepository(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const deleted = await repositoryRepository.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    logger.info('REPOSITORIES', `Removed repository association ${id} from monitoring system (GitHub repository preserved)`);

    res.json({ success: true, message: 'Repository removed from monitoring system successfully' });
  } catch (err) {
    next(err);
  }
}
