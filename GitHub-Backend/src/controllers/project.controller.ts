import { Request, Response, NextFunction } from 'express';
import { projectRepository } from '../repositories/project.repository.js';
import { repositoryRepository } from '../repositories/repository.repository.js';
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
    res.json({
      success: true,
      data: {
        project,
        repositories,
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
