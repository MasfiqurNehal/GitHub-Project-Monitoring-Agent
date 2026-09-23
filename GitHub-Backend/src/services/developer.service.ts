import { pool } from '../db/connection.js';
import { developerRepository } from '../repositories/developer.repository.js';

export class DeveloperService {
  async getDeveloperDetail(developerIdOrLogin: string, dateFrom?: string, dateTo?: string) {
    let dev = await developerRepository.findById(developerIdOrLogin);
    if (!dev) {
      dev = await developerRepository.findByLogin(developerIdOrLogin);
    }
    if (!dev) return null;

    const developerId = dev.id;

    // Fetch associated projects
    const projectsRes = await pool.query(
      `SELECT DISTINCT p.id, p.name FROM projects p
       JOIN repositories r ON r.project_id = p.id
       JOIN repository_developers rd ON rd.repository_id = r.id
       WHERE rd.developer_id = $1`,
      [developerId]
    );

    // Fetch associated repositories
    const reposRes = await pool.query(
      `SELECT DISTINCT r.id, r.name, r.full_name FROM repositories r
       JOIN repository_developers rd ON rd.repository_id = r.id
       WHERE rd.developer_id = $1`,
      [developerId]
    );

    const metrics = await developerRepository.getMetricsForDeveloper(developerId, dateFrom, dateTo);

    const prStatsRes = await pool.query(
      `SELECT 
        COUNT(*) as total_prs,
        COUNT(*) FILTER (WHERE UPPER(state) = 'OPEN') as open_prs,
        COUNT(*) FILTER (WHERE UPPER(state) = 'MERGED' OR merged = true) as merged_prs,
        COUNT(*) FILTER (WHERE UPPER(state) = 'CLOSED' AND merged = false) as closed_prs
       FROM pull_requests WHERE author_developer_id = $1`,
      [developerId]
    );

    const reviewStatsRes = await pool.query(
      `SELECT 
        COUNT(*) as total_reviews,
        COUNT(*) FILTER (WHERE UPPER(state) = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE UPPER(state) = 'CHANGES_REQUESTED') as changes_requested,
        COUNT(*) FILTER (WHERE UPPER(state) = 'COMMENTED') as commented
       FROM pull_request_reviews WHERE reviewer_developer_id = $1`,
      [developerId]
    );

    const issueStatsRes = await pool.query(
      `SELECT 
        COUNT(*) as total_issues,
        COUNT(*) FILTER (WHERE UPPER(state) = 'OPEN') as open_issues,
        COUNT(*) FILTER (WHERE UPPER(state) = 'CLOSED') as closed_issues
       FROM issues WHERE author_developer_id = $1`,
      [developerId]
    );

    const timelineRes = await pool.query(
      `SELECT ae.id, ae.occurred_at, ae.event_type, ae.metadata, r.name as repo_name
       FROM activity_events ae
       LEFT JOIN repositories r ON ae.repository_id = r.id
       WHERE ae.developer_id = $1
       ORDER BY ae.occurred_at DESC
       LIMIT 50`,
      [developerId]
    );

    return {
      developer: {
        id: dev.id,
        githubUserId: dev.github_user_id,
        login: dev.login,
        name: dev.name || dev.login,
        avatarUrl: dev.avatar_url,
        profileUrl: dev.html_url,
        email: dev.email,
        type: dev.type,
        projects: projectsRes.rows,
        repositories: reposRes.rows,
        metrics: {
          projectsCount: projectsRes.rows.length,
          repositoriesCount: reposRes.rows.length,
          commitCount: metrics.commitCount,
          prCount: metrics.prCount,
          reviewCount: metrics.reviewCount,
          issueCount: metrics.issueCount,
          additions: metrics.additions,
          deletions: metrics.deletions,
          changedFiles: metrics.changedFiles,
          lastActivityAt: dev.updated_at,
        },
      },
      commitStats: {
        totalCommits: metrics.commitCount,
        avgAdditionsPerCommit: Math.round(metrics.additions / (metrics.commitCount || 1)),
        topRepo: reposRes.rows[0]?.name || 'Main Repository',
      },
      prStats: {
        totalPRs: metrics.prCount,
        openPRs: parseInt(prStatsRes.rows[0]?.open_prs || '0', 10),
        mergedPRs: parseInt(prStatsRes.rows[0]?.merged_prs || '0', 10),
        closedPRs: parseInt(prStatsRes.rows[0]?.closed_prs || '0', 10),
      },
      reviewStats: {
        totalReviews: metrics.reviewCount,
        approved: parseInt(reviewStatsRes.rows[0]?.approved || '0', 10),
        changesRequested: parseInt(reviewStatsRes.rows[0]?.changes_requested || '0', 10),
        commented: parseInt(reviewStatsRes.rows[0]?.commented || '0', 10),
      },
      issueStats: {
        totalIssues: metrics.issueCount,
        openIssues: parseInt(issueStatsRes.rows[0]?.open_issues || '0', 10),
        closedIssues: parseInt(issueStatsRes.rows[0]?.closed_issues || '0', 10),
      },
      codeChangeStats: {
        totalAdditions: metrics.additions,
        totalDeletions: metrics.deletions,
        netChanges: metrics.additions - metrics.deletions,
      },
      activityTimeline: timelineRes.rows.map((t) => ({
        id: t.id,
        date: new Date(t.occurred_at).toISOString().split('T')[0],
        displayDate: new Date(t.occurred_at).toLocaleDateString(),
        time: new Date(t.occurred_at).toLocaleTimeString(),
        type: t.event_type,
        title: t.metadata?.message || `Activity: ${t.event_type}`,
        repoName: t.repo_name || 'Repository',
      })),
    };
  }
}

export const developerService = new DeveloperService();
