import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

dotenv.config();

export class GitHubClient {
  private octokit: Octokit;

  constructor(token?: string) {
    const authToken = token || process.env.GITHUB_TOKEN || '';
    this.octokit = new Octokit({
      auth: authToken || undefined,
      baseUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
      userAgent: 'GitHub-Project-Monitoring-Agent/1.0.0',
    });
  }

  // Validate Repository URL & Access
  async validateRepositoryAccess(owner: string, repo: string) {
    try {
      const response = await this.octokit.rest.repos.get({ owner, repo });
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
      return {
        success: false,
        error: err.message || 'Failed to fetch repository metadata from GitHub',
      };
    }
  }

  // Fetch Contributors / Members
  async getContributors(owner: string, repo: string) {
    const response = await this.octokit.rest.repos.listContributors({
      owner,
      repo,
      per_page: 100,
    });
    return response.data;
  }

  // Fetch Commits (Paginated)
  async getCommits(owner: string, repo: string, since?: string, page = 1, perPage = 100) {
    const response = await this.octokit.rest.repos.listCommits({
      owner,
      repo,
      since,
      page,
      per_page: perPage,
    });
    return response.data;
  }

  // Fetch Single Commit Detail (with files & patches)
  async getCommitDetail(owner: string, repo: string, ref: string) {
    const response = await this.octokit.rest.repos.getCommit({
      owner,
      repo,
      ref,
    });
    return response.data;
  }

  // Fetch Pull Requests
  async getPullRequests(owner: string, repo: string, state: 'all' | 'open' | 'closed' = 'all', page = 1, perPage = 100) {
    const response = await this.octokit.rest.pulls.list({
      owner,
      repo,
      state,
      page,
      per_page: perPage,
    });
    return response.data;
  }

  // Fetch PR Reviews
  async getPullRequestReviews(owner: string, repo: string, pullNumber: number) {
    const response = await this.octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
    });
    return response.data;
  }

  // Fetch Issues
  async getIssues(owner: string, repo: string, state: 'all' | 'open' | 'closed' = 'all', page = 1, perPage = 100) {
    const response = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state,
      page,
      per_page: perPage,
    });
    // Filter out PRs which GitHub includes in issues list
    return response.data.filter((item) => !item.pull_request);
  }

  // Fetch Rate Limit Status
  async getRateLimit() {
    const response = await this.octokit.rest.rateLimit.get();
    return response.data.rate;
  }
}
