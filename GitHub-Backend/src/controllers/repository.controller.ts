import { Request, Response, NextFunction } from 'express';
import { repositoryRepository } from '../repositories/repository.repository.js';
import { projectRepository } from '../repositories/project.repository.js';
import { githubService } from '../services/github.service.js';
import { syncService } from '../services/sync.service.js';
import crypto from 'crypto';

export async function listRepositories(req: Request, res: Response, next: NextFunction) {
  try {
    const repos = await repositoryRepository.findAll();
    res.json({ success: true, data: repos });
  } catch (err) {
    next(err);
  }
}

export async function addRepository(req: Request, res: Response, next: NextFunction) {
  try {
    const { repositoryUrl, projectName, projectId } = req.body;
    if (!repositoryUrl) {
      return res.status(400).json({ success: false, error: 'repositoryUrl is required' });
    }

    const validated = await githubService.validateRepository(repositoryUrl);

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

    // Run async historical sync
    syncService.runFullHistoricalSync(repository.id).catch((err) => {
      console.error(`[Async Sync Failed for ${repository.full_name}]`, err.message);
    });

    res.status(201).json({ success: true, data: repository });
  } catch (err: any) {
    next(err);
  }
}

export async function triggerRepositorySync(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const repo = await repositoryRepository.findById(id);
    if (!repo) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }

    syncService.runFullHistoricalSync(repo.id).catch((err) => {
      console.error(`[Manual Sync Failed for ${repo.full_name}]`, err.message);
    });

    res.json({ success: true, message: `Historical synchronization initiated for ${repo.full_name}` });
  } catch (err) {
    next(err);
  }
}

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
        developers: [],
        recentActivity: [],
        commits: [],
        pullRequests: [],
        issues: [],
        codeChanges: {
          trend: [],
          totalAdditions: 0,
          totalDeletions: 0,
          netChanges: 0,
          topFilesChanged: [],
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function removeRepository(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const deleted = await repositoryRepository.delete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Repository not found' });
    }
    res.json({ success: true, message: 'Repository removed from monitoring' });
  } catch (err) {
    next(err);
  }
}
