import { Request, Response, NextFunction } from 'express';
import { githubService } from '../services/github.service.js';
import { githubAppService } from '../github/github-app.service.js';
import { githubInstallationRepository } from '../repositories/githubInstallation.repository.js';
import { config } from '../config/index.js';

export async function validateRepository(req: Request, res: Response, next: NextFunction) {
  try {
    const { url, repositoryUrl } = req.body;
    const orgId = (req as any).organizationId;
    const targetUrl = url || repositoryUrl;
    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'Repository URL is required' });
    }

    const data = await githubService.validateRepository(targetUrl, orgId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Validation failed' });
  }
}

export async function getGitHubStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const isAppConfigured = githubAppService.isAppConfigured();
    const orgId = (req as any).organizationId;
    const installations = await githubInstallationRepository.findAll(orgId);

    res.json({
      success: true,
      data: {
        authMethod: isAppConfigured ? 'GITHUB_APP' : Boolean(config.githubToken) ? 'PERSONAL_ACCESS_TOKEN' : 'UNAUTHENTICATED',
        isAppConfigured,
        appId: config.githubAppId || null,
        clientId: config.githubClientId || null,
        apiVersion: config.githubApiVersion,
        activeInstallationsCount: installations.length,
        connectedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listInstallations(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = (req as any).organizationId;
    const installations = await githubInstallationRepository.findAll(orgId);
    res.json({ success: true, data: installations });
  } catch (err) {
    next(err);
  }
}

export async function getInstallationDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { installationId } = req.params;
    const orgId = (req as any).organizationId;
    const inst = await githubInstallationRepository.findByInstallationId(parseInt(installationId, 10), orgId);
    if (!inst) {
      return res.status(404).json({ success: false, error: `GitHub Installation ${installationId} not found` });
    }
    res.json({ success: true, data: inst });
  } catch (err) {
    next(err);
  }
}

export async function generateInstallationToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { installationId } = req.params;
    const instId = parseInt(installationId, 10);
    if (isNaN(instId)) {
      return res.status(400).json({ success: false, error: 'Invalid installation ID' });
    }

    const token = await githubAppService.getInstallationToken(instId);
    res.json({
      success: true,
      data: {
        installationId: instId,
        token,
        tokenType: 'Bearer',
        expiresInSeconds: 3600,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to generate installation token' });
  }
}

export async function syncInstallations(req: Request, res: Response, next: NextFunction) {
  try {
    const synced = await githubAppService.syncInstallations();
    res.json({ success: true, data: synced });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to sync installations' });
  }
}
