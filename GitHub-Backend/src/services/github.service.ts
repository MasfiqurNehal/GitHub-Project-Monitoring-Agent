import { GitHubClient } from '../github/github-client.js';
import { githubInstallationRepository } from '../repositories/githubInstallation.repository.js';
import { repositoryRepository } from '../repositories/repository.repository.js';
import { githubAppService } from '../github/github-app.service.js';
import { logger } from '../utils/logger.js';

export class GitHubService {
  private client: GitHubClient;

  constructor() {
    this.client = new GitHubClient();
  }

  // Parse GitHub URL safely into owner and repo
  parseUrl(url: string): { owner: string; repo: string } | null {
    try {
      if (!url || typeof url !== 'string') return null;
      const cleaned = url.trim().replace(/\/$/, '');

      // Handle full URLs like https://github.com/owner/repo or github.com/owner/repo
      const fullMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)/i);
      if (fullMatch && fullMatch[1] && fullMatch[2]) {
        return {
          owner: fullMatch[1].trim(),
          repo: fullMatch[2].trim().replace(/\.git$/i, ''),
        };
      }

      // Handle short formats like OWNER/REPOSITORY
      const shortMatch = cleaned.match(/^([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)$/);
      if (shortMatch && shortMatch[1] && shortMatch[2]) {
        return {
          owner: shortMatch[1].trim(),
          repo: shortMatch[2].trim().replace(/\.git$/i, ''),
        };
      }

      return null;
    } catch (e) {
      return null;
    }
  }

  // Validate repo URL & access
  async validateRepository(url: string, organizationId?: string) {
    // 1. Parse GitHub URL safely
    const parsed = this.parseUrl(url);
    if (!parsed) {
      throw new Error('Invalid repository URL format. Please provide a valid GitHub repository URL (e.g. https://github.com/owner/repository)');
    }

    const { owner, repo } = parsed;
    const fullName = `${owner}/${repo}`;

    // 2. Prevent cross-tenant repository association & duplicate monitoring
    const existingRepo = await repositoryRepository.findByFullNameGlobal(fullName);

    if (existingRepo) {
      if (organizationId && existingRepo.organization_id && existingRepo.organization_id !== organizationId) {
        throw new Error('Repository belongs to another tenant.');
      }
      return {
        url: existingRepo.html_url || `https://github.com/${fullName}`,
        owner: existingRepo.owner || owner,
        name: existingRepo.name || repo,
        fullName: existingRepo.full_name || fullName,
        githubRepositoryId: existingRepo.github_repository_id,
        isPrivate: existingRepo.is_private || false,
        defaultBranch: existingRepo.default_branch || 'main',
        hasReadAccess: true,
        language: existingRepo.language || 'Codebase',
        starsCount: existingRepo.stars || 0,
        description: existingRepo.description || null,
        openIssuesCount: existingRepo.open_issues_count || 0,
        alreadyMonitored: true,
        installationId: existingRepo.github_installation_id || null,
      };
    }


    // 3. Determine current GitHub connection for tenant
    const installations = await githubInstallationRepository.findAll(organizationId);
    const activeInst = installations.find((i) => i.status === 'ACTIVE');

    if (!activeInst) {
      throw new Error('GitHub account not connected. Please connect your GitHub App installation first.');
    }

    // 4. Obtain GitHub App Octokit client for this specific installation and request metadata
    let repoData: any = null;
    try {
      if (githubAppService.isAppConfigured()) {
        const octokit = await githubAppService.getInstallationOctokit(activeInst.github_installation_id);
        const res = await octokit.rest.repos.get({ owner, repo });
        repoData = res.data;
      } else {
        const client = new GitHubClient({ installationId: activeInst.github_installation_id });
        const valRes = await client.validateRepositoryAccess(owner, repo);
        if (!valRes.success || !valRes.data) {
          throw new Error(valRes.error || `Repository '${fullName}' not found or GitHub App does not have access.`);
        }
        repoData = valRes.data;
      }
    } catch (err: any) {
      if (err.status === 404) {
        throw new Error('Repository not found or GitHub App does not have access.');
      } else if (err.status === 403) {
        throw new Error('GitHub App does not have access to this repository.');
      } else if (err.message) {
        throw new Error(err.message);
      } else {
        throw new Error(`Unable to access GitHub repository ${fullName}`);
      }
    }

    if (!repoData) {
      throw new Error('Repository not found or GitHub App does not have access.');
    }

    // Double-check ID if full_name was slightly different
    const githubId = repoData.id || repoData.githubRepositoryId;
    const repoFullName = repoData.full_name || repoData.fullName || fullName;

    const existingById = githubId ? await repositoryRepository.findByGithubIdGlobal(githubId) : null;
    if (existingById) {
      if (organizationId && existingById.organization_id && existingById.organization_id !== organizationId) {
        throw new Error('Repository belongs to another tenant.');
      } else {
        throw new Error('Repository already monitored.');
      }
    }

    // 5. Return clean validated repository metadata
    return {
      url: repoData.html_url || repoData.htmlUrl || `https://github.com/${repoFullName}`,
      owner: repoData.owner?.login || repoData.owner || owner,
      name: repoData.name || repo,
      fullName: repoFullName,
      githubRepositoryId: githubId,
      isPrivate: repoData.private ?? repoData.isPrivate ?? false,
      defaultBranch: repoData.default_branch || repoData.defaultBranch || 'main',
      hasReadAccess: true,
      language: repoData.language || 'Codebase',
      starsCount: repoData.stargazers_count ?? repoData.stars ?? 0,
      description: repoData.description || null,
      openIssuesCount: repoData.open_issues_count ?? 0,
      githubCreatedAt: repoData.created_at || null,
      githubUpdatedAt: repoData.updated_at || null,
      installationId: activeInst.github_installation_id,
    };
  }

  // Helper delegate methods with explicit installationId context
  async getRepository(owner: string, repo: string, installationId?: number) {
    const client = new GitHubClient({ installationId });
    return client.getRepository(owner, repo);
  }

  async getBranches(owner: string, repo: string, page = 1, perPage = 100, installationId?: number) {
    const client = new GitHubClient({ installationId });
    return client.getBranches(owner, repo, page, perPage);
  }

  async getCommits(owner: string, repo: string, since?: string, page = 1, perPage = 100, installationId?: number) {
    const client = new GitHubClient({ installationId });
    return client.getCommits(owner, repo, since, page, perPage);
  }

  async getContributors(owner: string, repo: string, installationId?: number) {
    const client = new GitHubClient({ installationId });
    return client.getContributors(owner, repo);
  }

  async getPullRequests(owner: string, repo: string, state: 'all' | 'open' | 'closed' = 'all', page = 1, perPage = 100, installationId?: number) {
    const client = new GitHubClient({ installationId });
    return client.getPullRequests(owner, repo, state, page, perPage);
  }

  async getIssues(owner: string, repo: string, state: 'all' | 'open' | 'closed' = 'all', page = 1, perPage = 100, installationId?: number) {
    const client = new GitHubClient({ installationId });
    return client.getIssues(owner, repo, state, page, perPage);
  }

  async getReviews(owner: string, repo: string, pullNumber: number, installationId?: number) {
    const client = new GitHubClient({ installationId });
    return client.getReviews(owner, repo, pullNumber);
  }

  async getCommitStatistics(owner: string, repo: string, ref: string, installationId?: number) {
    const client = new GitHubClient({ installationId });
    return client.getCommitStatistics(owner, repo, ref);
  }
}

export const githubService = new GitHubService();

