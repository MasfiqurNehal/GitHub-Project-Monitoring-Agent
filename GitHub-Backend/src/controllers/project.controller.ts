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
function parseProjectDateRange(reqQuery: any) {
  let fromDate: Date | null = null;
  let toDate: Date | null = null;

  const rawFrom = (reqQuery.dateFrom || reqQuery.from || reqQuery.date_from) as string | undefined;
  const rawTo = (reqQuery.dateTo || reqQuery.to || reqQuery.date_to) as string | undefined;
  const preset = reqQuery.preset as string | undefined;

  if (rawFrom) {
    const parsed = new Date(rawFrom);
    if (!isNaN(parsed.getTime())) fromDate = parsed;
  }
  if (rawTo) {
    const parsed = new Date(rawTo);
    if (!isNaN(parsed.getTime())) toDate = parsed;
  }

  if (!fromDate && preset) {
    const now = new Date();
    const p = preset.toLowerCase().replace(/[\s_-]+/g, '');

    if (p === '1d' || p === 'today') {
      fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      toDate = now;
    } else if (p === '7d' || p === 'thisweek' || p === 'week') {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      toDate = now;
    } else if (p === '30d' || p === 'thismonth' || p === 'month') {
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      toDate = now;
    } else if (p === 'all' || p === 'alltime') {
      fromDate = null;
      toDate = null;
    }
  }

  return { fromDate, toDate };
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
    const { fromDate, toDate } = parseProjectDateRange(req.query);

    let developers: any[] = [];
    let recentActivity: any[] = [];
    let pullRequests: any[] = [];
    let issues: any[] = [];
    let commits: any[] = [];
    let codeChangesTrend: any[] = [];
    let topFilesChanged: any[] = [];

    let commitStats = { totalCommits: 0, additions: 0, deletions: 0, netChanges: 0 };
    let prStats = { totalPRs: 0, openPRs: 0, mergedPRs: 0, closedPRs: 0 };
    let issueStats = { totalIssues: 0, openIssues: 0, closedIssues: 0 };

    if (repoIds.length > 0) {
      // Build date clauses for queries
      const actParams: any[] = [repoIds];
      let actDateClause = '';
      if (fromDate) { actParams.push(fromDate); actDateClause += ` AND a.occurred_at >= $${actParams.length}`; }
      if (toDate) { actParams.push(toDate); actDateClause += ` AND a.occurred_at <= $${actParams.length}`; }

      const prParams: any[] = [repoIds];
      let prDateClause = '';
      if (fromDate) { prParams.push(fromDate); prDateClause += ` AND pr.created_at >= $${prParams.length}`; }
      if (toDate) { prParams.push(toDate); prDateClause += ` AND pr.created_at <= $${prParams.length}`; }

      const issParams: any[] = [repoIds];
      let issDateClause = '';
      if (fromDate) { issParams.push(fromDate); issDateClause += ` AND i.created_at >= $${issParams.length}`; }
      if (toDate) { issParams.push(toDate); issDateClause += ` AND i.created_at <= $${issParams.length}`; }

      const cmtParams: any[] = [repoIds];
      let cmtDateClause = '';
      if (fromDate) { cmtParams.push(fromDate); cmtDateClause += ` AND c.committed_at >= $${cmtParams.length}`; }
      if (toDate) { cmtParams.push(toDate); cmtDateClause += ` AND c.committed_at <= $${cmtParams.length}`; }

      const trendParams: any[] = [repoIds];
      let trendDateClause = '';
      if (fromDate) { trendParams.push(fromDate); trendDateClause += ` AND c.committed_at >= $${trendParams.length}`; }
      if (toDate) { trendParams.push(toDate); trendDateClause += ` AND c.committed_at <= $${trendParams.length}`; }

      const topFilesParams: any[] = [repoIds];
      let topFilesDateClause = '';
      if (fromDate) { topFilesParams.push(fromDate); topFilesDateClause += ` AND c.committed_at >= $${topFilesParams.length}`; }
      if (toDate) { topFilesParams.push(toDate); topFilesDateClause += ` AND c.committed_at <= $${topFilesParams.length}`; }

      const statsParams: any[] = [repoIds];
      let cClause = '';
      let prClause = '';
      let iClause = '';
      if (fromDate) {
        statsParams.push(fromDate);
        const idx = statsParams.length;
        cClause += ` AND committed_at >= $${idx}`;
        prClause += ` AND created_at >= $${idx}`;
        iClause += ` AND created_at >= $${idx}`;
      }
      if (toDate) {
        statsParams.push(toDate);
        const idx = statsParams.length;
        cClause += ` AND committed_at <= $${idx}`;
        prClause += ` AND created_at <= $${idx}`;
        iClause += ` AND created_at <= $${idx}`;
      }

      const devsParams: any[] = [repoIds];
      let cmtJoinDate = '';
      let prJoinDate = '';
      let cmtSubDate = '';
      let prSubDate = '';
      let issSubDate = '';
      if (fromDate) {
        devsParams.push(fromDate);
        const idx = devsParams.length;
        cmtJoinDate += ` AND c.committed_at >= $${idx}`;
        prJoinDate += ` AND pr.created_at >= $${idx}`;
        cmtSubDate += ` AND committed_at >= $${idx}`;
        prSubDate += ` AND created_at >= $${idx}`;
        issSubDate += ` AND created_at >= $${idx}`;
      }
      if (toDate) {
        devsParams.push(toDate);
        const idx = devsParams.length;
        cmtJoinDate += ` AND c.committed_at <= $${idx}`;
        prJoinDate += ` AND pr.created_at <= $${idx}`;
        cmtSubDate += ` AND committed_at <= $${idx}`;
        prSubDate += ` AND created_at <= $${idx}`;
        issSubDate += ` AND created_at <= $${idx}`;
      }

      const [devsRes, actRes, prRes, issRes, cmtRes, statsRes, trendRes, topFilesRes] = await Promise.all([
        pool.query(
          `SELECT 
             d.id,
             d.login,
             d.name,
             d.avatar_url as "avatarUrl",
             d.html_url as "profileUrl",
             COUNT(DISTINCT c.id)::int as commits,
             COUNT(DISTINCT pr.id)::int as prs,
             COUNT(DISTINCT CASE WHEN pr.merged_at IS NOT NULL THEN pr.id END)::int as reviews,
             COALESCE(SUM(c.additions), 0)::int as "linesAdded",
             COALESCE(SUM(c.deletions), 0)::int as "linesDeleted"
           FROM developers d
           LEFT JOIN commits c ON c.developer_id = d.id AND c.repository_id = ANY($1::text[]) ${cmtJoinDate}
           LEFT JOIN pull_requests pr ON pr.author_developer_id = d.id AND pr.repository_id = ANY($1::text[]) ${prJoinDate}
           WHERE d.id IN (
             SELECT developer_id FROM repository_developers WHERE repository_id = ANY($1::text[])
             UNION
             SELECT developer_id FROM commits WHERE repository_id = ANY($1::text[]) AND developer_id IS NOT NULL ${cmtSubDate}
             UNION
             SELECT author_developer_id FROM pull_requests WHERE repository_id = ANY($1::text[]) AND author_developer_id IS NOT NULL ${prSubDate}
             UNION
             SELECT author_developer_id FROM issues WHERE repository_id = ANY($1::text[]) AND author_developer_id IS NOT NULL ${issSubDate}
           )
           GROUP BY d.id
           ORDER BY commits DESC, prs DESC`,
          devsParams
        ),
        pool.query(
          `SELECT a.*, r.name as repo_name, r.full_name as repo_full_name, d.login as dev_login, d.avatar_url as dev_avatar
           FROM activity_events a
           LEFT JOIN repositories r ON a.repository_id = r.id
           LEFT JOIN developers d ON a.developer_id = d.id
           WHERE a.repository_id = ANY($1::text[]) ${actDateClause}
           ORDER BY a.occurred_at DESC LIMIT 50`,
          actParams
        ),
        pool.query(
          `SELECT pr.*, r.name as repo_name, r.full_name as repo_full_name, d.login as author_login, d.name as author_name, d.avatar_url as author_avatar
           FROM pull_requests pr
           LEFT JOIN repositories r ON pr.repository_id = r.id
           LEFT JOIN developers d ON pr.author_developer_id = d.id
           WHERE pr.repository_id = ANY($1::text[]) ${prDateClause}
           ORDER BY pr.created_at DESC LIMIT 50`,
          prParams
        ),
        pool.query(
          `SELECT i.*, r.name as repo_name, r.full_name as repo_full_name, d.login as author_login, d.name as author_name, d.avatar_url as author_avatar
           FROM issues i
           LEFT JOIN repositories r ON i.repository_id = r.id
           LEFT JOIN developers d ON i.author_developer_id = d.id
           WHERE i.repository_id = ANY($1::text[]) ${issDateClause}
           ORDER BY i.created_at DESC LIMIT 50`,
          issParams
        ),
        pool.query(
          `SELECT c.*, r.name as repo_name, r.full_name as repo_full_name, d.login as author_login, d.name as author_name, d.avatar_url as author_avatar
           FROM commits c
           LEFT JOIN repositories r ON c.repository_id = r.id
           LEFT JOIN developers d ON c.developer_id = d.id
           WHERE c.repository_id = ANY($1::text[]) ${cmtDateClause}
           ORDER BY c.committed_at DESC LIMIT 50`,
          cmtParams
        ),
        pool.query(
          `SELECT 
             (SELECT COUNT(*) FROM commits WHERE repository_id = ANY($1::text[]) ${cClause})::int as total_commits,
             (SELECT COALESCE(SUM(additions), 0) FROM commits WHERE repository_id = ANY($1::text[]) ${cClause})::int as additions,
             (SELECT COALESCE(SUM(deletions), 0) FROM commits WHERE repository_id = ANY($1::text[]) ${cClause})::int as deletions,
             (SELECT COUNT(*) FROM pull_requests WHERE repository_id = ANY($1::text[]) ${prClause})::int as total_prs,
             (SELECT COUNT(*) FROM pull_requests WHERE repository_id = ANY($1::text[]) AND state = 'OPEN' ${prClause})::int as open_prs,
             (SELECT COUNT(*) FROM pull_requests WHERE repository_id = ANY($1::text[]) AND merged_at IS NOT NULL ${prClause})::int as merged_prs,
             (SELECT COUNT(*) FROM pull_requests WHERE repository_id = ANY($1::text[]) AND state = 'CLOSED' AND merged_at IS NULL ${prClause})::int as closed_prs,
             (SELECT COUNT(*) FROM issues WHERE repository_id = ANY($1::text[]) ${iClause})::int as total_issues,
             (SELECT COUNT(*) FROM issues WHERE repository_id = ANY($1::text[]) AND state = 'OPEN' ${iClause})::int as open_issues,
             (SELECT COUNT(*) FROM issues WHERE repository_id = ANY($1::text[]) AND state = 'CLOSED' ${iClause})::int as closed_issues`,
          statsParams
        ),
        pool.query(
          `SELECT 
             TO_CHAR(c.committed_at, 'YYYY-MM-DD') as date,
             COALESCE(SUM(c.additions), 0)::int as additions,
             COALESCE(SUM(c.deletions), 0)::int as deletions
           FROM commits c
           WHERE c.repository_id = ANY($1::text[]) ${trendDateClause}
           GROUP BY TO_CHAR(c.committed_at, 'YYYY-MM-DD')
           ORDER BY date ASC`,
          trendParams
        ),
        pool.query(
          `SELECT 
             cf.filename as name,
             COALESCE(r.name, r.full_name) as repo_name,
             COALESCE(SUM(cf.additions), 0)::int as additions,
             COALESCE(SUM(cf.deletions), 0)::int as deletions
           FROM commit_files cf
           JOIN commits c ON c.id = cf.commit_id
           LEFT JOIN repositories r ON c.repository_id = r.id
           WHERE c.repository_id = ANY($1::text[]) ${topFilesDateClause}
           GROUP BY cf.filename, r.name, r.full_name
           ORDER BY (COALESCE(SUM(cf.additions), 0) + COALESCE(SUM(cf.deletions), 0)) DESC
           LIMIT 10`,
          topFilesParams
        ),
      ]);

      developers = devsRes.rows;
      recentActivity = actRes.rows;
      pullRequests = prRes.rows;
      issues = issRes.rows;
      commits = cmtRes.rows;
      codeChangesTrend = trendRes.rows;
      topFilesChanged = topFilesRes.rows.map((r: any) => ({
        name: r.name,
        repoName: r.repo_name || 'Repository',
        additions: parseInt(r.additions || '0', 10),
        deletions: parseInt(r.deletions || '0', 10),
      }));

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

    const formattedCommits = commits.map((c: any) => ({
      id: c.id,
      repositoryId: c.repository_id,
      githubSha: c.github_commit_sha || c.github_sha || c.id,
      authorId: c.developer_id,
      message: c.message,
      commitUrl: c.commit_url || c.html_url || `https://github.com/${c.repo_full_name || c.repo_name}/commit/${c.github_commit_sha}`,
      committedAt: c.committed_at,
      additions: Number(c.additions || 0),
      deletions: Number(c.deletions || 0),
      changedFiles: Number(c.changed_files || 0),
      author: {
        id: c.developer_id,
        login: c.author_login || 'developer',
        name: c.author_name || c.author_login || 'Developer',
        avatarUrl: c.author_avatar,
      },
    }));

    const formattedPullRequests = pullRequests.map((pr: any) => ({
      id: pr.id,
      repositoryId: pr.repository_id,
      githubPrId: pr.github_pull_request_id || pr.number,
      number: pr.number,
      authorId: pr.author_developer_id,
      title: pr.title,
      body: pr.body,
      state: pr.state,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      closedAt: pr.closed_at,
      mergedAt: pr.merged_at,
      additions: Number(pr.additions || 0),
      deletions: Number(pr.deletions || 0),
      changedFiles: Number(pr.changed_files || 0),
      author: {
        id: pr.author_developer_id,
        login: pr.author_login || 'developer',
        name: pr.author_name || pr.author_login || 'Developer',
        avatarUrl: pr.author_avatar,
      },
    }));

    const formattedIssues = issues.map((i: any) => ({
      id: i.id,
      number: i.number,
      title: i.title,
      repoName: i.repo_full_name || i.repo_name || 'Repository',
      author: i.author_name || i.author_login || 'Developer',
      authorAvatar: i.author_avatar,
      state: i.state,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
    }));

    const formattedActivity = recentActivity.map((a: any) => ({
      id: a.id,
      type: a.event_type || a.type || 'commit',
      title: a.title || a.message || 'Engineering Activity',
      repoName: a.repo_full_name || a.repo_name || 'Repository',
      author: a.dev_login || 'Developer',
      authorAvatar: a.dev_avatar,
      timeAgo: a.occurred_at ? new Date(a.occurred_at).toLocaleDateString('en-US') : 'Recently',
      status: a.status || 'ACTIVE',
    }));

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
            lastActivityAt: project.updated_at || project.created_at,
          },
        },
        repositories,
        developers,
        commits: formattedCommits,
        pullRequests: formattedPullRequests,
        issues: formattedIssues,
        commitStats,
        prStats,
        issueStats,
        recentActivity: formattedActivity,
        activitySummary: formattedActivity,
        codeChanges: {
          trend: codeChangesTrend.map((t: any) => ({
            date: t.date,
            additions: parseInt(t.additions || '0', 10),
            deletions: parseInt(t.deletions || '0', 10),
          })),
          totalAdditions: commitStats.additions,
          totalDeletions: commitStats.deletions,
          netChanges: commitStats.netChanges,
          topFilesChanged,
        },
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
    const id = req.params.id || req.params.projectId;
    const { repositoryId, url, repositoryUrl, owner, name, nameOrDescription } = req.body;
    const orgId = (req as any).organizationId;

    const project = await projectRepository.findById(id, orgId);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const customDescription = typeof nameOrDescription === 'string' && nameOrDescription.trim() ? nameOrDescription.trim() : undefined;

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

      const updates: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      if (repo.project_id !== project.id) {
        updates.push(`project_id = $${paramIdx++}`);
        values.push(project.id);
      }

      if (customDescription && customDescription !== repo.description) {
        updates.push(`description = $${paramIdx++}`);
        values.push(customDescription);
      }

      if (updates.length > 0) {
        values.push(repo.id);
        values.push(orgId);
        await pool.query(
          `UPDATE repositories SET ${updates.join(', ')} WHERE id = $${paramIdx++} AND (organization_id = $${paramIdx++} OR organization_id IS NULL)`,
          values
        );
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

      const updates: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      if (globalRepo.project_id !== project.id) {
        updates.push(`project_id = $${paramIdx++}`);
        values.push(project.id);
      }

      if (!globalRepo.organization_id && orgId) {
        updates.push(`organization_id = $${paramIdx++}`);
        values.push(orgId);
      }

      if (customDescription && customDescription !== globalRepo.description) {
        updates.push(`description = $${paramIdx++}`);
        values.push(customDescription);
      }

      if (updates.length > 0) {
        values.push(globalRepo.id);
        await pool.query(`UPDATE repositories SET ${updates.join(', ')} WHERE id = $${paramIdx++}`, values);
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
      description: customDescription || validated.description || undefined,
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
