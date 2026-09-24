import { Request, Response, NextFunction } from 'express';
import { githubInstallationRepository } from '../repositories/githubInstallation.repository.js';
import { repositoryRepository } from '../repositories/repository.repository.js';
import { githubAppService } from '../github/github-app.service.js';
import { githubService } from '../services/github.service.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// 1. GET /api/github/install
export async function getInstallUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const appSlug = process.env.GITHUB_APP_SLUG || 'github-project-monitoring-agent';
    const installUrl = `https://github.com/apps/${appSlug}/installations/new`;

    res.json({
      success: true,
      data: {
        installUrl,
        appSlug,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 2. GET /api/github/callback
export async function handleInstallationCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const { installation_id, setup_action } = req.query;

    if (!installation_id) {
      logger.warn('GITHUB_AUTH', 'Installation callback received without installation_id query param');
      return res.redirect(`${config.frontendUrl}/settings?error=missing_installation_id`);
    }

    const instId = parseInt(String(installation_id), 10);
    logger.info('GITHUB_AUTH', `Received GitHub installation callback [Action: ${setup_action}, Installation ID: ${instId}]`);

    // Fetch installation detail from GitHub API if App credentials exist
    let accountLogin = 'BetopiaLtd';
    let accountType = 'Organization';
    let targetType = 'User';
    let permissions = {};
    let events: string[] = [];

    if (githubAppService.isAppConfigured()) {
      try {
        const appOctokit = await githubAppService.getAppOctokit();
        const instRes = await appOctokit.rest.apps.getInstallation({ installation_id: instId });
        const account = instRes.data.account as any;
        accountLogin = account?.login || accountLogin;
        accountType = account?.type || accountType;
        targetType = instRes.data.target_type || targetType;
        permissions = instRes.data.permissions || {};
        events = instRes.data.events || [];
      } catch (err: any) {
        logger.warn('GITHUB_AUTH', `Failed to fetch live installation details from GitHub API: ${err.message}`);
      }
    }

    // Save installation in Neon PostgreSQL
    const saved = await githubInstallationRepository.upsert({
      id: `inst-${instId}`,
      githubInstallationId: instId,
      accountLogin,
      accountType,
      targetType,
      permissions,
      events,
    });

    logger.info('GITHUB_AUTH', `Successfully saved GitHub installation for ${saved.account_login} in Neon DB`);

    res.redirect(`${config.frontendUrl}/settings/github?connected=true&installation_id=${instId}`);
  } catch (err: any) {
    logger.error('GITHUB_AUTH', `Error handling installation callback: ${err.message}`, err);
    res.redirect(`${config.frontendUrl}/settings/github?error=installation_failed`);
  }
}

// 3. GET /api/github/connection (and /api/settings/github/status)
export async function getConnectionStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const installations = await githubInstallationRepository.findAll();

    if (installations.length === 0) {
      return res.json({
        success: true,
        data: {
          connected: false,
          account: null,
          username: null,
          isConnected: false,
        },
      });
    }

    const primaryInst = installations[0];

    // Expose only safe, non-sensitive public account metadata to frontend
    res.json({
      success: true,
      data: {
        connected: true,
        isConnected: true,
        account: {
          login: primaryInst.account_login,
          type: primaryInst.account_type,
          installationId: primaryInst.github_installation_id,
          installedAt: primaryInst.created_at,
        },
        username: primaryInst.account_login,
        name: primaryInst.account_login,
        organization: primaryInst.account_type === 'Organization' ? primaryInst.account_login : null,
        avatarUrl: `https://github.com/${primaryInst.account_login}.png`,
        connectedAt: primaryInst.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 4. DELETE /api/github/connection (and /api/settings/github/disconnect)
export async function disconnectConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const installations = await githubInstallationRepository.findAll();

    for (const inst of installations) {
      await githubInstallationRepository.deleteByInstallationId(inst.github_installation_id);
    }

    logger.info('GITHUB_AUTH', 'Disconnected all active GitHub App installations from database');

    res.json({
      success: true,
      message: 'GitHub installation disconnected successfully',
    });
  } catch (err) {
    next(err);
  }
}

// 5. GET /api/github/repositories
export async function listGithubRepositories(req: Request, res: Response, next: NextFunction) {
  try {
    const repos = await repositoryRepository.findAll();
    res.json({
      success: true,
      data: repos.map((r) => ({
        id: r.id,
        name: r.name,
        owner: r.owner,
        fullName: r.full_name,
        url: r.html_url,
        isPrivate: r.is_private,
        defaultBranch: r.default_branch,
        status: r.sync_status || 'ACTIVE',
        lastSyncedAt: r.last_synced_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// 6. POST /api/github/repositories/validate
export async function validateGithubRepository(req: Request, res: Response, next: NextFunction) {
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
