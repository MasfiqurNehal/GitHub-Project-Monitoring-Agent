import { Request, Response, NextFunction } from 'express';
import { projectRepository } from '../repositories/project.repository.js';
import { repositoryRepository } from '../repositories/repository.repository.js';
import { githubService } from '../services/github.service.js';
import { pool } from '../db/connection.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

// 1. GET /api/projects
export async function listProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = (req as any).organizationId;
    const projects = await projectRepository.findAll(orgId);
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
}

// 2. POST /api/projects
export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, organization } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Project name is required' });
    }

    const orgId = (req as any).organizationId;
    const id = `prj-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const project = await projectRepository.create(id, name.trim(), description, organization, orgId);

    logger.info('PROJECTS', `Created new project '${project.name}' [ID: ${project.id}, Org: ${orgId}]`);
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

// 3. GET /api/projects/:id
export async function getProjectDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const orgId = (req as any).organizationId;
    const project = await projectRepository.findById(id, orgId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const repositories = await repositoryRepository.findByProjectId(project.id);
    const repoIds = repositories.map((r) => r.id);

    let developers: any[] = [];
    let recentActivity: any[] = [];
    let pullRequests: any[] = [];
    let issues: any[] = [];
    let commits: any[] = [];

    let commitStats = { totalCommits: 0, additions: 0, deletions: 0, netChanges: 0 };
    let prStats = { totalPRs: 0, openPRs: 0, mergedPRs: 0, closedPRs: 0 };
    let issueStats = { totalIssues: 0, openIssues: 0, closedIssues: 0 };

    if (repoIds.length > 0) {
      const [devsRes, actRes, prRes, issRes, cmtRes, statsRes] = await Promise.all([
        pool.query(
          `SELECT DISTINCT d.* FROM developers d
           JOIN repository_developers rd ON d.id = rd.developer_id
           WHERE rd.repository_id = ANY($1::text[])`,
          [repoIds]
        ),
        pool.query(
          `SELECT a.*, r.name as repo_name, d.login as dev_login, d.avatar_url as dev_avatar
           FROM activity_events a
           LEFT JOIN repositories r ON a.repository_id = r.id
           LEFT JOIN developers d ON a.developer_id = d.id
           WHERE a.repository_id = ANY($1::text[])
           ORDER BY a.occurred_at DESC LIMIT 20`,
          [repoIds]
        ),
        pool.query(
          `SELECT pr.*, r.name as repo_name, d.login as author_login, d.avatar_url as author_avatar
           FROM pull_requests pr
           LEFT JOIN repositories r ON pr.repository_id = r.id
           LEFT JOIN developers d ON pr.author_developer_id = d.id
           WHERE pr.repository_id = ANY($1::text[])
           ORDER BY pr.created_at DESC LIMIT 20`,
          [repoIds]
        ),
        pool.query(
          `SELECT i.*, r.name as repo_name, d.login as author_login, d.avatar_url as author_avatar
           FROM issues i
           LEFT JOIN repositories r ON i.repository_id = r.id
           LEFT JOIN developers d ON i.author_developer_id = d.id
           WHERE i.repository_id = ANY($1::text[])
           ORDER BY i.created_at DESC LIMIT 20`,
          [repoIds]
        ),
        pool.query(
          `SELECT c.*, r.name as repo_name, d.login as author_login, d.avatar_url as author_avatar
           FROM commits c
           LEFT JOIN repositories r ON c.repository_id = r.id
           LEFT JOIN developers d ON c.developer_id = d.id
           WHERE c.repository_id = ANY($1::text[])
           ORDER BY c.committed_at DESC LIMIT 20`,
          [repoIds]
        ),
        pool.query(
          `SELECT 
             COUNT(DISTINCT c.id) as total_commits,
             COALESCE(SUM(c.additions), 0) as additions,
             COALESCE(SUM(c.deletions), 0) as deletions,
             COUNT(DISTINCT pr.id) as total_prs,
             COUNT(DISTINCT CASE WHEN pr.state = 'OPEN' THEN pr.id END) as open_prs,
             COUNT(DISTINCT CASE WHEN pr.merged_at IS NOT NULL THEN pr.id END) as merged_prs,
             COUNT(DISTINCT CASE WHEN pr.state = 'CLOSED' AND pr.merged_at IS NULL THEN pr.id END) as closed_prs,
             COUNT(DISTINCT i.id) as total_issues,
             COUNT(DISTINCT CASE WHEN i.state = 'OPEN' THEN i.id END) as open_issues,
             COUNT(DISTINCT CASE WHEN i.state = 'CLOSED' THEN i.id END) as closed_issues
           FROM repositories r
           LEFT JOIN commits c ON c.repository_id = r.id
           LEFT JOIN pull_requests pr ON pr.repository_id = r.id
           LEFT JOIN issues i ON i.repository_id = r.id
           WHERE r.id = ANY($1::text[])`,
          [repoIds]
        ),
      ]);

      developers = devsRes.rows;
      recentActivity = actRes.rows;
      pullRequests = prRes.rows;
      issues = issRes.rows;
      commits = cmtRes.rows;

      const s = statsRes.rows[0] || {};
      const additions = parseInt(s.additions || '0', 10);
      const deletions = parseInt(s.deletions || '0', 10);

      commitStats = {
        totalCommits: parseInt(s.total_commits || '0', 10),
        additions,
        deletions,
        netChanges: additions - deletions,
      };

      prStats = {
        totalPRs: parseInt(s.total_prs || '0', 10),
        openPRs: parseInt(s.open_prs || '0', 10),
        mergedPRs: parseInt(s.merged_prs || '0', 10),
        closedPRs: parseInt(s.closed_prs || '0', 10),
      };

      issueStats = {
        totalIssues: parseInt(s.total_issues || '0', 10),
        openIssues: parseInt(s.open_issues || '0', 10),
        closedIssues: parseInt(s.closed_issues || '0', 10),
      };
    }

    res.json({
      success: true,
      data: {
        project: {
          ...project,
          metrics: {
            repositoriesCount: repositories.length,
            developersCount: developers.length,
            commitsCount: commitStats.totalCommits,
            prsCount: prStats.totalPRs,
            issuesCount: issueStats.totalIssues,
            linesAdded: commitStats.additions,
            linesDeleted: commitStats.deletions,
          },
        },
        repositories,
        developers,
        commits,
        pullRequests,
        issues,
        commitStats,
        prStats,
        issueStats,
        recentActivity,
        activitySummary: recentActivity,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 4. PATCH /api/projects/:id
export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, description, organization, status } = req.body;
    const orgId = (req as any).organizationId;

    const updated = await projectRepository.update(id, { name, description, organization, status }, orgId);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    logger.info('PROJECTS', `Updated project '${updated.name}' [ID: ${id}]`);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// 5. DELETE /api/projects/:id
export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const orgId = (req as any).organizationId;
    const deleted = await projectRepository.delete(id, orgId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    logger.info('PROJECTS', `Deleted project [ID: ${id}] from database. Linked repositories preserved.`);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// 6. GET /api/projects/:id/repositories
export async function getProjectRepositories(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const orgId = (req as any).organizationId;
    const project = await projectRepository.findById(id, orgId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const repositories = await repositoryRepository.findByProjectId(project.id);
    res.json({ success: true, data: repositories });
  } catch (err) {
    next(err);
  }
}

// Helper function for URL normalization
function normalizeGitHubUrl(input: string): { owner: string; name: string; canonicalUrl: string; fullName: string } | null {
  if (!input || typeof input !== 'string') return null;
  let str = input.trim();

  // If full URL with scheme
  if (str.startsWith('http://') || str.startsWith('https://')) {
    try {
      const parsedUrl = new URL(str);
      const host = parsedUrl.hostname.toLowerCase();
      if (host !== 'github.com' && host !== 'www.github.com') {
        return null;
      }
      str = parsedUrl.pathname;
    } catch {
      return null;
    }
  } else if (str.includes('://')) {
    return null;
  }

  // Remove leading slashes and trailing slashes
  let path = str.replace(/^\/+/, '').replace(/\/+$/, '');

  // Remove .git or .git/ from suffix
  if (path.toLowerCase().endsWith('.git')) {
    path = path.slice(0, -4).replace(/\/+$/, '');
  }

  const parts = path.split('/').filter(Boolean);
  if (parts.length === 2) {
    const owner = parts[0].trim();
    const name = parts[1].trim();
    if (owner && name) {
      return {
        owner,
        name,
        fullName: `${owner}/${name}`,
        canonicalUrl: `https://github.com/${owner}/${name}`,
      };
    }
  }

  return null;
}

// 7. POST /api/projects/:id/repositories
export async function addRepositoryToProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { repositoryId, url, repositoryUrl, owner, name } = req.body;
    const orgId = (req as any).organizationId;

    const project = await projectRepository.findById(id, orgId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // 1. If existing repositoryId is explicitly provided
    if (repositoryId) {
      const repo = await repositoryRepository.findById(repositoryId, orgId);
      if (!repo) {
        return res.status(404).json({ success: false, error: 'Repository not found' });
      }

      // Check if already assigned to another project in the SAME organization
      if (repo.project_id && repo.project_id !== project.id) {
        return res.status(409).json({ success: false, error: 'Repository is already attached to another project' });
      }

      if (repo.project_id !== project.id) {
        await pool.query('UPDATE repositories SET project_id = $1 WHERE id = $2 AND (organization_id = $3 OR organization_id IS NULL)', [
          project.id,
          repo.id,
          orgId,
        ]);
      }

      const updatedRepo = (await repositoryRepository.findById(repo.id, orgId)) || repo;

      // Trigger historical sync asynchronously
      githubService.syncRepository(updatedRepo.id, orgId).catch((syncErr) => {
        logger.error('PROJECTS', `Background sync error for attached repo '${updatedRepo.full_name}': ${syncErr.message}`);
      });

      logger.info('PROJECTS', `Attached repository '${updatedRepo.full_name}' to project '${project.name}'`);
      return res.json({
        success: true,
        message: 'Repository connected to project successfully',
        data: {
          repository: updatedRepo,
          projectId: project.id,
          syncStatus: updatedRepo.sync_status || 'PENDING',
        },
      });
    }

    // 2. Derive target repository input from url, repositoryUrl, or owner + name
    let rawTargetInput = url || repositoryUrl;
    if (!rawTargetInput && owner && name) {
      rawTargetInput = `https://github.com/${owner}/${name}`;
    }

    if (!rawTargetInput) {
      return res.status(400).json({ success: false, error: 'repositoryId, url, repositoryUrl, or owner and name are required' });
    }

    const normalized = normalizeGitHubUrl(rawTargetInput);
    if (!normalized) {
      return res.status(400).json({ success: false, error: 'Invalid GitHub repository URL or format. Only GitHub repository URLs are accepted.' });
    }

    // 3. Check if repository already exists in database for this organization
    const globalRepo = await repositoryRepository.findByFullNameGlobal(normalized.fullName);
    if (globalRepo) {
      if (globalRepo.organization_id && orgId && globalRepo.organization_id !== orgId) {
        return res.status(403).json({ success: false, error: 'Repository belongs to another organization' });
      }

      if (globalRepo.project_id && globalRepo.project_id !== project.id) {
        return res.status(409).json({ success: false, error: 'Repository is already attached to another project' });
      }

      if (globalRepo.project_id !== project.id) {
        await pool.query('UPDATE repositories SET project_id = $1, organization_id = COALESCE(organization_id, $2) WHERE id = $3', [
          project.id,
          orgId,
          globalRepo.id,
        ]);
      }

      const updatedRepo = (await repositoryRepository.findById(globalRepo.id, orgId)) || globalRepo;

      // Trigger historical sync asynchronously
      githubService.syncRepository(updatedRepo.id, orgId).catch((syncErr) => {
        logger.error('PROJECTS', `Background sync error for attached repo '${updatedRepo.full_name}': ${syncErr.message}`);
      });

      logger.info('PROJECTS', `Attached existing repository '${updatedRepo.full_name}' to project '${project.name}'`);
      return res.json({
        success: true,
        message: 'Repository connected to project successfully',
        data: {
          repository: updatedRepo,
          projectId: project.id,
          syncStatus: updatedRepo.sync_status || 'PENDING',
        },
      });
    }

    // 4. Validate new repository via GitHub Service / App Integration
    const validated = await githubService.validateRepository(normalized.canonicalUrl, orgId);

    const repoId = `repo-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const repository = await repositoryRepository.upsert({
      id: repoId,
      projectId: project.id,
      organizationId: orgId,
      githubRepositoryId: validated.githubRepositoryId,
      githubInstallationId: validated.installationId || null,
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

    // Trigger historical sync asynchronously
    githubService.syncRepository(repository.id, orgId).catch((syncErr) => {
      logger.error('PROJECTS', `Background sync error for new repo '${repository.full_name}': ${syncErr.message}`);
    });

    logger.info('PROJECTS', `Validated & attached new repository '${repository.full_name}' to project '${project.name}'`);
    return res.status(201).json({
      success: true,
      message: 'Repository connected to project successfully',
      data: {
        repository,
        projectId: project.id,
        syncStatus: repository.sync_status || 'PENDING',
      },
    });
  } catch (err: any) {
    logger.error('PROJECTS', `Error in addRepositoryToProject: ${err.message}`);
    const statusCode = err.status || (err.message && err.message.includes('not found') ? 404 : 400);
    return res.status(statusCode).json({ success: false, error: err.message || 'Failed to attach repository to project' });
  }
}

// 8. DELETE /api/projects/:id/repositories/:repositoryId
export async function removeRepositoryFromProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, repositoryId } = req.params;
    const orgId = (req as any).organizationId;

    const project = await projectRepository.findById(id, orgId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const repo = await repositoryRepository.findById(repositoryId, orgId);
    if (!repo || repo.project_id !== project.id) {
      return res.status(404).json({ success: false, error: 'Repository association not found in this project' });
    }

    // Unlink project association (NEVER delete actual repository or GitHub repository)
    await pool.query('UPDATE repositories SET project_id = NULL WHERE id = $1', [repo.id]);

    logger.info('PROJECTS', `Unlinked repository '${repo.full_name}' from project '${project.name}' (GitHub repo preserved)`);
    res.json({ success: true, message: 'Repository unlinked from project successfully' });
  } catch (err) {
    next(err);
  }
}
