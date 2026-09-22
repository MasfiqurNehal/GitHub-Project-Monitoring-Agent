import { GitHubClient } from '../github/github-client.js';

export class GitHubService {
  private client: GitHubClient;

  constructor() {
    this.client = new GitHubClient();
  }

  // Parse GitHub URL into owner and repo
  parseUrl(url: string): { owner: string; repo: string } | null {
    try {
      const cleaned = url.trim().replace(/\/$/, '');
      const match = cleaned.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
      if (match && match[1] && match[2]) {
        return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Validate repo URL & access
  async validateRepository(url: string) {
    const parsed = this.parseUrl(url);
    if (!parsed) {
      throw new Error('Invalid GitHub repository URL. Example format: https://github.com/owner/repo');
    }

    const result = await this.client.validateRepositoryAccess(parsed.owner, parsed.repo);
    if (!result.success || !result.data) {
      throw new Error(result.error || `Unable to access GitHub repository ${parsed.owner}/${parsed.repo}`);
    }

    return {
      url,
      owner: result.data.owner,
      name: result.data.name,
      fullName: result.data.fullName,
      isPrivate: result.data.isPrivate,
      defaultBranch: result.data.defaultBranch,
      hasReadAccess: true,
      language: result.data.language || 'Unknown',
      starsCount: result.data.stars || 0,
      description: result.data.description,
      githubRepositoryId: result.data.githubRepositoryId,
    };
  }
}

export const githubService = new GitHubService();
