import { Octokit } from '@octokit/rest';
import { config } from '../config/index.js';

export class GitHubRestService {
  private octokit: Octokit;

  constructor(token?: string) {
    const authToken = token || config.githubToken;
    this.octokit = new Octokit({
      auth: authToken || undefined,
      userAgent: 'GitHub-Project-Monitoring-Agent/1.0.0',
    });
  }

  /**
   * Fetch repository metadata (READ-ONLY)
   */
  async getRepositoryDetails(owner: string, repo: string) {
    const response = await this.octokit.rest.repos.get({
      owner,
      repo,
    });
    return response.data;
  }

  /**
   * Fetch historical commits for repository (READ-ONLY)
   */
  async fetchCommits(owner: string, repo: string, options?: { since?: string; until?: string; per_page?: number; page?: number }) {
    const response = await this.octokit.rest.repos.listCommits({
      owner,
      repo,
      since: options?.since,
      until: options?.until,
      per_page: options?.per_page || 100,
      page: options?.page || 1,
    });
    return response.data;
  }

  /**
   * Fetch detailed commit diff and changed files (READ-ONLY)
   */
  async fetchCommitDetail(owner: string, repo: string, ref: string) {
    const response = await this.octokit.rest.repos.getCommit({
      owner,
      repo,
      ref,
    });
    return response.data;
  }

  /**
   * Fetch Pull Requests for repository (READ-ONLY)
   */
  async fetchPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'all', perPage = 100, page = 1) {
    const response = await this.octokit.rest.pulls.list({
      owner,
      repo,
      state,
      per_page: perPage,
      page,
    });
    return response.data;
  }

  /**
   * Fetch reviews for a specific Pull Request (READ-ONLY)
   */
  async fetchPullRequestReviews(owner: string, repo: string, pullNumber: number) {
    const response = await this.octokit.rest.pulls.listReviews({
      owner,
      repo,
      pull_number: pullNumber,
    });
    return response.data;
  }

  /**
   * Fetch Issues for repository (excluding PRs) (READ-ONLY)
   */
  async fetchIssues(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'all', perPage = 100, page = 1) {
    const response = await this.octokit.rest.issues.listForRepo({
      owner,
      repo,
      state,
      per_page: perPage,
      page,
    });
    // Filter out PRs returned by the issues endpoint
    return response.data.filter((issue) => !issue.pull_request);
  }

  /**
   * Fetch contributors for repository (READ-ONLY)
   */
  async fetchContributors(owner: string, repo: string) {
    const response = await this.octokit.rest.repos.listContributors({
      owner,
      repo,
      per_page: 100,
    });
    return response.data;
  }
}

export const githubRestService = new GitHubRestService();
