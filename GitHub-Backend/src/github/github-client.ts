import { Octokit } from '@octokit/rest';
import { config } from '../config/index.js';
import { githubAppService } from './github-app.service.js';
import { githubInstallationRepository } from '../repositories/githubInstallation.repository.js';
import { logger } from '../utils/logger.js';

export class GitHubClient {
  private octokit: Octokit | null = null;
  private token?: string;
  private installationId?: number;

  constructor(options?: { token?: string; installationId?: number }) {
    this.token = options?.token;
    this.installationId = options?.installationId;
  }

  private async getOctokit(): Promise<Octokit> {
    if (this.octokit) return this.octokit;

    if (this.installationId && githubAppService.isAppConfigured()) {
      this.octokit = await githubAppService.getInstallationOctokit(this.installationId);
      return this.octokit;
    }

    if (githubAppService.isAppConfigured()) {
      try {
        const installations = await githubInstallationRepository.findAll();
        if (installations.length > 0) {
          const instId = installations[0].github_installation_id;
          this.octokit = await githubAppService.getInstallationOctokit(instId);
          return this.octokit;
        }
        this.octokit = await githubAppService.getAppOctokit();
        return this.octokit;
      } catch (err: any) {
        logger.warn('GITHUB_CLIENT', `Could not initialize GitHub App Octokit: ${err.message}`);
      }
    }

    const authToken = this.token || config.githubToken || '';
    this.octokit = new Octokit({
      auth: authToken || undefined,
      baseUrl: config.githubApiUrl,
      userAgent: 'GitHub-Project-Monitoring-Agent/1.0.0',
    });

    return this.octokit;
  }

  private async handleRateLimitError(err: any, attempt = 1): Promise<boolean> {
    if ((err.status === 403 && err.headers && err.headers['x-ratelimit-remaining'] === '0') || err.status === 429) {
      const resetTime = err.headers ? err.headers['x-ratelimit-reset'] : null;
      const sleepMs = resetTime ? Math.max(2000, Number(resetTime) * 1000 - Date.now()) : 10000;
      logger.warn('GITHUB_CLIENT', `GitHub API rate limit hit (${err.status}). Retrying after ${Math.min(sleepMs, 60000)}ms (Attempt ${attempt})...`);
      await new Promise((res) => setTimeout(res, Math.min(sleepMs, 60000)));
      return true;
    }
    return false;
  }

  // Reusable API methods with rate-limit resiliency and explicit aliases
  async getRepository(owner: string, repo: string) {
    const client = await this.getOctokit();
    try {
      const response = await client.rest.repos.get({ owner, repo });
      return response.data;
    } catch (err: any) {
      if (await this.handleRateLimitError(err)) {
        const response = await client.rest.repos.get({ owner, repo });
        return response.data;
      }
      throw err;
    }
  }

  async getRepositoryMetadata(owner: string, repo: string) {
    return this.getRepository(owner, repo);
  }

  async validateRepositoryAccess(owner: string, repo: string) {
    try {
      const data = await this.getRepository(owner, repo);
      return {
        success: true,
        data: {
          githubRepositoryId: data.id,
          owner: data.owner.login,
          name: data.name,
          fullName: data.full_name,
          htmlUrl: data.html_url,
          cloneUrl: data.clone_url,
          defaultBranch: data.default_branch,
          visibility: data.visibility || (data.private ? 'private' : 'public'),
          isPrivate: data.private,
          description: data.description,
          language: data.language,
          stars: data.stargazers_count,
          forks: data.forks_count,
          openIssuesCount: data.open_issues_count,
          githubCreatedAt: data.created_at,
          githubUpdatedAt: data.updated_at,
        },
      };
    } catch (err: any) {
      let errorCode = 'GITHUB_API_ERROR';
      let errorMessage = err.message || 'Failed to fetch repository metadata from GitHub';

      if (err.status === 401) {
        errorCode = 'INVALID_CREDENTIALS';
        errorMessage = 'Unauthorized. Invalid GitHub App Installation or Token.';
      } else if (err.status === 403) {
        errorCode = 'REPOSITORY_ACCESS_DENIED';
        errorMessage = `Access denied for repository ${owner}/${repo}. Check permissions.`;
      } else if (err.status === 404) {
        errorCode = 'MISSING_REPOSITORY_OR_INSTALLATION';
        errorMessage = `Repository ${owner}/${repo} not found or not accessible by this installation.`;
      }

      logger.error('GITHUB_CLIENT', `[${errorCode}] ${errorMessage}`);

      return {
        success: false,
        code: errorCode,
        error: errorMessage,
      };
    }
  }

  async getContributors(owner: string, repo: string) {
    const client = await this.getOctokit();
    try {
      const response = await client.rest.repos.listContributors({
        owner,
        repo,
        per_page: 100,
      });
      return response.data;
    } catch (err: any) {
      if (err.status === 404 || err.status === 204) return [];
      if (await this.handleRateLimitError(err)) {
        const response = await client.rest.repos.listContributors({ owner, repo, per_page: 100 });
        return response.data;
      }
      throw err;
    }
  }

  async getCommits(owner: string, repo: string, since?: string, page = 1, perPage = 100) {
    const client = await this.getOctokit();
    try {
      const response = await client.rest.repos.listCommits({
        owner,
        repo,
        since,
        page,
        per_page: perPage,
      });
      return response.data;
    } catch (err: any) {
      if (err.status === 409 || err.status === 404) return []; // Empty repository or no commits on branch
      if (await this.handleRateLimitError(err)) {
        const response = await client.rest.repos.listCommits({ owner, repo, since, page, per_page: perPage });
        return response.data;
      }
      throw err;
    }
  }

  async getCommitDetail(owner: string, repo: string, ref: string) {
    const client = await this.getOctokit();
    try {
      const response = await client.rest.repos.getCommit({
        owner,
        repo,
        ref,
      });
      return response.data;
    } catch (err: any) {
      if (await this.handleRateLimitError(err)) {
        const response = await client.rest.repos.getCommit({ owner, repo, ref });
        return response.data;
      }
      throw err;
    }
  }

  async getCommitStatistics(owner: string, repo: string, ref: string) {
    return this.getCommitDetail(owner, repo, ref);
  }

  async getPullRequests(owner: string, repo: string, state: 'all' | 'open' | 'closed' = 'all', page = 1, perPage = 100) {
    const client = await this.getOctokit();
    try {
      const response = await client.rest.pulls.list({
        owner,
        repo,
        state,
        page,
        per_page: perPage,
      });
      return response.data;
    } catch (err: any) {
      if (err.status === 404) return [];
      if (await this.handleRateLimitError(err)) {
        const response = await client.rest.pulls.list({ owner, repo, state, page, per_page: perPage });
        return response.data;
      }
      throw err;
    }
  }

  async getPullRequestReviews(owner: string, repo: string, pullNumber: number) {
    const client = await this.getOctokit();
    try {
      const response = await client.rest.pulls.listReviews({
        owner,
        repo,
        pull_number: pullNumber,
      });
      return response.data;
    } catch (err: any) {
      if (err.status === 404) return [];
      if (await this.handleRateLimitError(err)) {
        const response = await client.rest.pulls.listReviews({ owner, repo, pull_number: pullNumber });
        return response.data;
      }
      throw err;
    }
  }

  async getReviews(owner: string, repo: string, pullNumber: number) {
    return this.getPullRequestReviews(owner, repo, pullNumber);
  }

  async getIssues(owner: string, repo: string, state: 'all' | 'open' | 'closed' = 'all', page = 1, perPage = 100) {
    const client = await this.getOctokit();
    try {
      const response = await client.rest.issues.listForRepo({
        owner,
        repo,
        state,
        page,
        per_page: perPage,
      });
      return response.data.filter((item) => !item.pull_request);
    } catch (err: any) {
      if (err.status === 404) return [];
      if (await this.handleRateLimitError(err)) {
        const response = await client.rest.issues.listForRepo({ owner, repo, state, page, per_page: perPage });
        return response.data.filter((item) => !item.pull_request);
      }
      throw err;
    }
  }

  async getBranches(owner: string, repo: string, page = 1, perPage = 100) {
    const client = await this.getOctokit();
    try {
      const response = await client.rest.repos.listBranches({
        owner,
        repo,
        page,
        per_page: perPage,
      });
      return response.data;
    } catch (err: any) {
      if (err.status === 404) return [];
      if (await this.handleRateLimitError(err)) {
        const response = await client.rest.repos.listBranches({ owner, repo, page, per_page: perPage });
        return response.data;
      }
      throw err;
    }
  }

  async getRepoStats(owner: string, repo: string) {
    const client = await this.getOctokit();
    const [repoRes, languagesRes] = await Promise.all([
      client.rest.repos.get({ owner, repo }),
      client.rest.repos.listLanguages({ owner, repo }).catch(() => ({ data: {} })),
    ]);
    return {
      stars: repoRes.data.stargazers_count,
      forks: repoRes.data.forks_count,
      openIssues: repoRes.data.open_issues_count,
      subscribersCount: repoRes.data.subscribers_count,
      size: repoRes.data.size,
      languages: languagesRes.data,
      defaultBranch: repoRes.data.default_branch,
    };
  }

  async getRateLimit() {
    const client = await this.getOctokit();
    const response = await client.rest.rateLimit.get();
    return response.data.rate;
  }
}
