import { Request, Response, NextFunction } from 'express';
import { githubInstallationRepository } from '../repositories/githubInstallation.repository.js';
import { repositoryRepository } from '../repositories/repository.repository.js';
import { githubAppService } from '../github/github-app.service.js';
import { githubService } from '../services/github.service.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// 1. GET /api/github/app/install (and /api/github/install)
export async function getInstallUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = (req as any).organizationId;
    const userId = (req as any).user?.id;
    const appSlug = config.githubAppSlug || process.env.GITHUB_APP_SLUG || 'gitmonitor-ai';

    if (!config.githubAppId || !config.githubPrivateKey) {
      return res.status(400).json({
        success: false,
        error: 'GitHub App configuration is missing on the backend (GITHUB_APP_ID or GITHUB_PRIVATE_KEY missing)',
      });
    }

    // Generate state token with tenant context
    const state = githubAppService.createInstallationState(orgId || 'org-default', userId);
    const installationUrl = `https://github.com/apps/${appSlug}/installations/new?state=${encodeURIComponent(state)}`;

    res.json({
      success: true,
      data: {
        installationUrl,
        installUrl: installationUrl,
        appSlug,
        state,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 2. GET /api/github/app/setup (and /api/github/callback)
export async function handleInstallationCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const { installation_id, setup_action, state } = req.query;

    if (!installation_id) {
      logger.warn('GITHUB_AUTH', 'Installation callback received without installation_id query param');
      return res.redirect(`${config.frontendUrl}/settings/github?error=cancelled`);
    }

    const instId = parseInt(String(installation_id), 10);
    logger.info('GITHUB_AUTH', `Received GitHub installation callback [Action: ${setup_action}, Installation ID: ${instId}]`);

    // Verify state token if present
    if (!state) {
      logger.warn('GITHUB_AUTH', 'State parameter missing in installation callback');
      return res.redirect(`${config.frontendUrl}/settings/github?error=invalid_state`);
    }

    const stateVerified = githubAppService.verifyInstallationState(String(state));
    if (!stateVerified) {
      logger.warn('GITHUB_AUTH', 'Invalid or expired state parameter in installation callback');
      return res.redirect(`${config.frontendUrl}/settings/github?error=invalid_state`);
    }

    const targetOrgId = stateVerified.organizationId || (req as any).organizationId || null;
    const targetUserId = stateVerified.userId || (req as any).user?.id || null;

    // Fetch and verify live installation detail from GitHub API using GitHub App JWT
    let accountLogin = 'BetopiaLtd';
    let accountType = 'Organization';
    let githubAccountId: string | number | null = null;
    let targetType = 'User';
    let permissions = {};
    let events: string[] = [];

    if (githubAppService.isAppConfigured()) {
      try {
        const appOctokit = await githubAppService.getAppOctokit();
        const instRes = await appOctokit.rest.apps.getInstallation({ installation_id: instId });

        // Verify that installation matches configured App ID if available
        if (instRes.data.app_id && String(instRes.data.app_id) !== String(config.githubAppId)) {
          logger.error('GITHUB_AUTH', `Installation ID ${instId} belongs to App ID ${instRes.data.app_id}, expected ${config.githubAppId}`);
          return res.redirect(`${config.frontendUrl}/settings/github?error=invalid_installation`);
        }

        const account = instRes.data.account as any;
        githubAccountId = account?.id || null;
        accountLogin = account?.login || accountLogin;
        accountType = account?.type || accountType;
        targetType = instRes.data.target_type || targetType;
        permissions = instRes.data.permissions || {};
        events = instRes.data.events || [];
      } catch (err: any) {
        logger.error('GITHUB_AUTH', `Failed to verify live installation details from GitHub API: ${err.message}`);
        return res.redirect(`${config.frontendUrl}/settings/github?error=invalid_installation`);
      }
    }

    // Save installation in Neon PostgreSQL with tenant association
    const saved = await githubInstallationRepository.upsert({
      id: `inst-${instId}`,
      githubInstallationId: instId,
      organizationId: targetOrgId,
      userId: targetUserId,
      githubAccountId,
      accountLogin,
      accountType,
      targetType,
      permissions,
      events,
      status: 'ACTIVE',
    });

    logger.info('GITHUB_AUTH', `Successfully saved GitHub installation for ${saved.account_login} [Org: ${targetOrgId}] in Neon DB`);

    // Fetch and persist repositories accessible to this installation
    if (githubAppService.isAppConfigured() && targetOrgId) {
      try {
        const accessibleRepos = await githubAppService.listAccessibleRepositories(instId);
        logger.info('GITHUB_AUTH', `Fetched ${accessibleRepos.length} accessible repositories for installation ID ${instId}`);

        for (const repo of accessibleRepos) {
          await repositoryRepository.upsert({
            id: `repo-${repo.id}`,
            organizationId: targetOrgId,
            githubRepositoryId: repo.id,
            githubInstallationId: instId,
            owner: repo.owner?.login || accountLogin,
            name: repo.name,
            fullName: repo.full_name,
            htmlUrl: repo.html_url,
            cloneUrl: repo.clone_url,
            defaultBranch: repo.default_branch || 'main',
            visibility: repo.visibility || (repo.private ? 'private' : 'public'),
            isPrivate: repo.private || false,
            description: repo.description || null,
            language: repo.language || null,
            stars: repo.stargazers_count || 0,
            forks: repo.forks_count || 0,
            openIssuesCount: repo.open_issues_count || 0,
            githubCreatedAt: repo.created_at,
            githubUpdatedAt: repo.updated_at,
          });
        }
      } catch (repoErr: any) {
        logger.warn('GITHUB_AUTH', `Non-fatal error listing accessible repositories for installation ID ${instId}: ${repoErr.message}`);
      }
    }

    // Support both API response (for testing) and browser redirect
    if (req.headers.accept?.includes('application/json')) {
      return res.json({
        success: true,
        message: 'GitHub installation connected successfully',
        data: saved,
      });
    }

    res.redirect(`${config.frontendUrl}/settings/github?connected=true&installation_id=${instId}`);
  } catch (err: any) {
    logger.error('GITHUB_AUTH', `Error handling installation callback: ${err.message}`, err);
    res.redirect(`${config.frontendUrl}/settings/github?error=installation_failed`);
  }
}

// 3. GET /api/github/connection (and /api/settings/github/status)
export async function getConnectionStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = (req as any).organizationId;
    const installations = await githubInstallationRepository.findAll(orgId);
    const repos = await repositoryRepository.findAll(orgId);

    if (installations.length === 0) {
      return res.json({
        success: true,
        data: {
          connected: false,
          githubAccount: null,
          installationId: null,
          accessibleRepositoryCount: 0,
          lastSynchronization: null,
          connectionStatus: 'NOT_CONNECTED',
          account: null,
          username: null,
          isConnected: false,
        },
      });
    }

    const primaryInst = installations[0];

    // Calculate last synchronization timestamp across tenant repos
    let lastSynchronization: string | null = null;
    if (repos.length > 0) {
      const syncedTimes = repos
        .map((r) => r.last_synced_at)
        .filter((t): t is Date => Boolean(t))
        .map((t) => new Date(t).getTime());
      if (syncedTimes.length > 0) {
        lastSynchronization = new Date(Math.max(...syncedTimes)).toISOString();
      }
    }

    // Return exact status fields per Phase 4 requirement
    res.json({
      success: true,
      data: {
        connected: primaryInst.status === 'ACTIVE',
        githubAccount: {
          id: primaryInst.github_account_id,
          login: primaryInst.account_login,
          type: primaryInst.account_type,
          avatarUrl: `https://github.com/${primaryInst.account_login}.png`,
        },
        installationId: primaryInst.github_installation_id,
        accessibleRepositoryCount: repos.length,
        lastSynchronization,
        connectionStatus: primaryInst.status || 'ACTIVE',
        // Preserve legacy fields for frontend compatibility
        isConnected: primaryInst.status === 'ACTIVE',
        account: {
          login: primaryInst.account_login,
          type: primaryInst.account_type,
          installationId: primaryInst.github_installation_id,
          installedAt: primaryInst.connected_at || primaryInst.created_at,
        },
        username: primaryInst.account_login,
        name: primaryInst.account_login,
        organization: primaryInst.account_type === 'Organization' ? primaryInst.account_login : null,
        avatarUrl: `https://github.com/${primaryInst.account_login}.png`,
        connectedAt: primaryInst.connected_at || primaryInst.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

// 4. DELETE /api/github/connection (and /api/settings/github/disconnect)
export async function disconnectConnection(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = (req as any).organizationId;
    const installations = await githubInstallationRepository.findAll(orgId);

    for (const inst of installations) {
      await githubInstallationRepository.deleteByInstallationId(inst.github_installation_id);
    }

    logger.info('GITHUB_AUTH', `Disconnected all active GitHub App installations for tenant [Org: ${orgId}]`);

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
    const orgId = (req as any).organizationId;
    const repos = await repositoryRepository.findAll(orgId);
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
