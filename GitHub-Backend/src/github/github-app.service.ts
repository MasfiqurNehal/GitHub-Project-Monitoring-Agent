import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { config } from '../config/index.js';
import { githubInstallationRepository } from '../repositories/githubInstallation.repository.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

interface CachedToken {
  token: string;
  expiresAt: Date;
}

export class GitHubAppService {
  private tokenCache: Map<number, CachedToken> = new Map();

  // Check if GitHub App credentials are configured in .env
  isAppConfigured(): boolean {
    return Boolean(config.githubAppId && config.githubPrivateKey);
  }

  // Generate secure state token for GitHub App installation redirect
  createInstallationState(organizationId: string, userId?: string): string {
    const payload = JSON.stringify({
      organizationId,
      userId: userId || null,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(8).toString('hex'),
    });
    const signature = crypto
      .createHmac('sha256', config.jwtSecret)
      .update(payload)
      .digest('hex');
    return Buffer.from(JSON.stringify({ payload, signature })).toString('base64url');
  }

  // Verify state token from GitHub callback
  verifyInstallationState(stateToken: string): { organizationId: string; userId?: string } | null {
    try {
      if (!stateToken) return null;
      const jsonStr = Buffer.from(stateToken, 'base64url').toString('utf8');
      const { payload, signature } = JSON.parse(jsonStr);

      const expectedSignature = crypto
        .createHmac('sha256', config.jwtSecret)
        .update(payload)
        .digest('hex');

      if (signature !== expectedSignature) {
        logger.warn('GITHUB_APP', 'Invalid state token signature in installation callback');
        return null;
      }

      const parsedPayload = JSON.parse(payload);
      // State valid for 60 minutes
      if (Date.now() - parsedPayload.timestamp > 60 * 60 * 1000) {
        logger.warn('GITHUB_APP', 'Expired state token in installation callback');
        return null;
      }

      return {
        organizationId: parsedPayload.organizationId,
        userId: parsedPayload.userId || undefined,
      };
    } catch (err: any) {
      logger.warn('GITHUB_APP', `Failed to verify installation state token: ${err.message}`);
      return null;
    }
  }

  // Get App-level Authentication (JWT)
  getAppAuth() {
    if (!this.isAppConfigured()) {
      throw new Error('GitHub App credentials (GITHUB_APP_ID, GITHUB_PRIVATE_KEY) are not configured in .env');
    }

    return createAppAuth({
      appId: config.githubAppId,
      privateKey: config.githubPrivateKey,
      clientId: config.githubClientId || undefined,
      clientSecret: config.githubClientSecret || undefined,
    });
  }

  // Generate App-Authenticated Octokit Instance (JWT)
  async getAppOctokit(): Promise<Octokit> {
    const auth = this.getAppAuth();
    const appAuthentication = await auth({ type: 'app' });

    return new Octokit({
      auth: appAuthentication.token,
      baseUrl: config.githubApiUrl,
      userAgent: 'GitHub-Project-Monitoring-Agent/1.0.0',
    });
  }

  // Generate or Retrieve Cached Installation Access Token
  async getInstallationToken(installationId: number): Promise<string> {
    // Check in-memory token cache
    const cached = this.tokenCache.get(installationId);
    if (cached) {
      const now = new Date();
      // Token valid if expiration is more than 5 minutes away
      if (cached.expiresAt.getTime() - now.getTime() > 5 * 60 * 1000) {
        logger.info('GITHUB_APP', `Using cached installation access token for installation ID ${installationId}`);
        return cached.token;
      }
    }

    logger.info('GITHUB_APP', `Requesting fresh installation access token for installation ID ${installationId}...`);
    try {
      const auth = this.getAppAuth();
      const installationAuth = await auth({
        type: 'installation',
        installationId,
      });

      const token = installationAuth.token;
      // Installation tokens expire in 1 hour
      const expiresAt = new Date(Date.now() + 55 * 60 * 1000);

      this.tokenCache.set(installationId, { token, expiresAt });
      logger.info('GITHUB_APP', `Successfully acquired installation token for installation ID ${installationId}`);
      return token;
    } catch (err: any) {
      logger.error('GITHUB_APP', `Failed to generate installation token for installation ID ${installationId}: ${err.message}`, err);
      if (err.status === 404) {
        throw new Error(`MISSING_INSTALLATION: GitHub App Installation ID ${installationId} not found`);
      } else if (err.status === 401) {
        throw new Error(`INVALID_CREDENTIALS: Failed to authenticate GitHub App. Check GITHUB_APP_ID and GITHUB_PRIVATE_KEY.`);
      } else if (err.status === 403) {
        throw new Error(`RATE_LIMITED_OR_FORBIDDEN: GitHub API access denied for installation ID ${installationId}`);
      }
      throw err;
    }
  }

  // Create Octokit Instance for a Specific Installation
  async getInstallationOctokit(installationId: number): Promise<Octokit> {
    const token = await this.getInstallationToken(installationId);
    return new Octokit({
      auth: token,
      baseUrl: config.githubApiUrl,
      userAgent: 'GitHub-Project-Monitoring-Agent/1.0.0',
    });
  }

  // Fetch and Sync GitHub App Installations into Neon PostgreSQL
  async syncInstallations(): Promise<any[]> {
    if (!this.isAppConfigured()) {
      logger.warn('GITHUB_APP', 'Skipping GitHub App installations sync: App credentials missing');
      return [];
    }

    try {
      const appOctokit = await this.getAppOctokit();
      const response = await appOctokit.rest.apps.listInstallations({ per_page: 100 });
      const installations = response.data;

      logger.info('GITHUB_APP', `Fetched ${installations.length} installations from GitHub API`);

      const syncedList = [];
      for (const inst of installations) {
        const row = await githubInstallationRepository.upsert({
          id: `inst-${inst.id}`,
          githubInstallationId: inst.id,
          accountLogin: inst.account?.login || 'unknown',
          accountType: inst.account?.type || 'Organization',
          targetType: inst.target_type,
          permissions: inst.permissions,
          events: inst.events,
          suspendedAt: inst.suspended_at ? new Date(inst.suspended_at) : null,
        });
        syncedList.push(row);
      }

      return syncedList;
    } catch (err: any) {
      logger.error('GITHUB_APP', `Failed to sync GitHub App installations: ${err.message}`, err);
      throw err;
    }
  }
}

export const githubAppService = new GitHubAppService();
