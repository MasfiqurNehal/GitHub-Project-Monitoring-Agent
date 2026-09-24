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

  // Validate Repository Access (Public & Private via App / Token)
  async validateRepositoryAccess(owner: string, repo: string) {
    try {
      const client = await this.getOctokit();
      const response = await client.rest.repos.get({ owner, repo });
      return {
        success: true,
        data: {
          githubRepositoryId: response.data.id,
          owner: response.data.owner.login,
          name: response.data.name,
          fullName: response.data.full_name,
          htmlUrl: response.data.html_url,
          cloneUrl: response.data.clone_url,
          defaultBranch: response.data.default_branch,
          visibility: response.data.visibility || (response.data.private ? 'private' : 'public'),
          isPrivate: response.data.private,
          description: response.data.description,
          language: response.data.language,
          stars: response.data.stargazers_count,
          forks: response.data.forks_count,
          openIssuesCount: response.data.open_issues_count,
          githubCreatedAt: response.data.created_at,
          githubUpdatedAt: response.data.updated_at,
        },
      };
    } catch (err: any) {
      let errorCode = 'GITHUB_API_ERROR';
      let errorMessage = err.message || 'Failed to fetch repository metadata from GitHub';

      if (err.status === 401) {
        errorCode = 'INVALID_CREDENTIALS';
        errorMessage = 'Unauthorized. Invalid GitHub App Installation or Token.';
      } else if (err.status === 403) {
        if (err.headers && err.headers['x-ratelimit-remaining'] === '0') {
          errorCode = 'RATE_LIMITED';
          errorMessage = 'GitHub API rate limit exceeded. Please wait or use GitHub App authentication.';
        } else {
          errorCode = 'REPOSITORY_ACCESS_DENIED';
          errorMessage = `Access denied for repository ${owner}/${repo}. Check permissions.`;
        }
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
    const response = await client.rest.repos.listContributors({
      owner,
      repo,
      per_page: 100,
    });
    return response.data;
  }

  async getCommits(owner: string, repo: string, since?: string, page = 1, perPage = 100) {
    const client = await this.getOctokit();
    const response = await client.rest.repos.listCommits({
      owner,
      repo,
      since,
      page,
      per_page: perPage,
    });
    return response.data;
  }

  async getCommitDetail(owner: string, repo: string, ref: string) {
    const client = await this.getOctokit();
    const response = await client.rest.repos.getCommit({
      owner,
      repo,
      ref,
    });
    return response.data;
  }

  async getPullRequests(owner: string, repo: string, state: 'all' | 'open' | 'closed' = 'all', page = 1, perPage = 100) {
    const client = await this.getOctokit();
    const response = await client.rest.pulls.list({
      owner,
      repo,
      state,
      page,
      per_page: perPage,
    });
    return response.data;
  }

  async getPullRequestReviews(owner: string, repo: string, pullNumber: number) {
    const client = await this.getOctokit();
    const response = await client.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
    });
    return response.data;
  }

  async getIssues(owner: string, repo: string, state: 'all' | 'open' | 'closed' = 'all', page = 1, perPage = 100) {
    const client = await this.getOctokit();
    const response = await client.rest.issues.listForRepo({
      owner,
      repo,
      state,
      page,
      per_page: perPage,
    });
    return response.data.filter((item) => !item.pull_request);
  }

  async getRateLimit() {
    const client = await this.getOctokit();
    const response = await client.rest.rateLimit.get();
    return response.data.rate;
  }
}
