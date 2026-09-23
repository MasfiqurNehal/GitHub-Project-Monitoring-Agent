import { Request, Response, NextFunction } from 'express';
import { projectRepository } from '../repositories/project.repository.js';
import { repositoryRepository } from '../repositories/repository.repository.js';
import { pool } from '../db/connection.js';
import crypto from 'crypto';

export async function listProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await projectRepository.findAll();
    res.json({ success: true, data: projects });
  } catch (err) {
    next(err);
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, organization } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Project name is required' });
    }

    const id = `prj-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const project = await projectRepository.create(id, name, description, organization);
    res.status(201).json({ success: true, data: project });
  } catch (err) {
    next(err);
  }
}

export async function getProjectDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const project = await projectRepository.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const repositories = await repositoryRepository.findByProjectId(project.id);
    const repoIds = repositories.map((r) => r.id);

    let developers: any[] = [];
    let recentActivity: any[] = [];
    let pullRequests: any[] = [];
    let issues: any[] = [];

    if (repoIds.length > 0) {
      // 1. Developers
      const devsRes = await pool.query(
        `SELECT DISTINCT d.* FROM developers d
         JOIN repository_developers rd ON d.id = rd.developer_id
         WHERE rd.repository_id = ANY($1::text[])`,
        [repoIds]
      );
      developers = devsRes.rows;

      // 2. Activity Stream
      const actRes = await pool.query(
        `SELECT a.*, r.name as repo_name, d.login as dev_login, d.avatar_url as dev_avatar
         FROM activity_events a
         LEFT JOIN repositories r ON a.repository_id = r.id
         LEFT JOIN developers d ON a.developer_id = d.id
         WHERE a.repository_id = ANY($1::text[])
         ORDER BY a.occurred_at DESC LIMIT 20`,
        [repoIds]
      );
      recentActivity = actRes.rows;

      // 3. Pull Requests
      const prRes = await pool.query(
        `SELECT pr.*, r.name as repo_name, d.login as author_login, d.avatar_url as author_avatar
         FROM pull_requests pr
         LEFT JOIN repositories r ON pr.repository_id = r.id
         LEFT JOIN developers d ON pr.author_developer_id = d.id
         WHERE pr.repository_id = ANY($1::text[])
         ORDER BY pr.created_at DESC LIMIT 20`,
        [repoIds]
      );
      pullRequests = prRes.rows;

      // 4. Issues
      const issRes = await pool.query(
        `SELECT i.*, r.name as repo_name, d.login as author_login, d.avatar_url as author_avatar
         FROM issues i
         LEFT JOIN repositories r ON i.repository_id = r.id
         LEFT JOIN developers d ON i.author_developer_id = d.id
         WHERE i.repository_id = ANY($1::text[])
         ORDER BY i.created_at DESC LIMIT 20`,
        [repoIds]
      );
      issues = issRes.rows;
    }

    res.json({
      success: true,
      data: {
        project,
        repositories,
        developers,
        recentActivity,
        pullRequests,
        issues,
      },
    });
  } catch (err) {
    next(err);
  }
}
