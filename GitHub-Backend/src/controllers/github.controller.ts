import { Request, Response, NextFunction } from 'express';
import { githubService } from '../services/github.service.js';

export async function validateRepository(req: Request, res: Response, next: NextFunction) {
  try {
    const { url, repositoryUrl } = req.body;
    const targetUrl = url || repositoryUrl;
    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'Repository URL is required' });
    }

    const data = await githubService.validateRepository(targetUrl);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Validation failed' });
  }
}

export async function getGitHubStatus(req: Request, res: Response, next: NextFunction) {
  try {
    res.json({
      success: true,
      data: {
        isConnected: Boolean(process.env.GITHUB_TOKEN),
        username: 'Connected Account',
        name: 'GitHub Project Monitoring Agent',
        avatarUrl: 'https://github.com/github.png',
        connectedAt: new Date().toISOString(),
        scopes: ['repo', 'read:org', 'read:user'],
      },
    });
  } catch (err) {
    next(err);
  }
}
