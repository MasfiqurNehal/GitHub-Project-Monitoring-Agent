import { pool } from '../db/connection.js';
import { developerRepository } from '../repositories/developer.repository.js';

export class DeveloperService {
  async getDeveloperDetail(developerId: string) {
    const dev = await developerRepository.findById(developerId);
    if (!dev) return null;

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

    const commitStatsRes = await pool.query(
      `SELECT COUNT(*) as total_commits, COALESCE(SUM(additions), 0) as additions, COALESCE(SUM(deletions), 0) as deletions FROM commits WHERE developer_id = $1`,
      [developerId]
    );

    const prStatsRes = await pool.query(
      `SELECT 
        COUNT(*) as total_prs,
        COUNT(*) FILTER (WHERE state = 'OPEN') as open_prs,
        COUNT(*) FILTER (WHERE state = 'MERGED' OR merged = true) as merged_prs,
        COUNT(*) FILTER (WHERE state = 'CLOSED' AND merged = false) as closed_prs
       FROM pull_requests WHERE author_developer_id = $1`,
      [developerId]
    );

    const reviewStatsRes = await pool.query(
      `SELECT 
        COUNT(*) as total_reviews,
        COUNT(*) FILTER (WHERE state = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE state = 'CHANGES_REQUESTED') as changes_requested,
        COUNT(*) FILTER (WHERE state = 'COMMENTED') as commented
       FROM pull_request_reviews WHERE reviewer_developer_id = $1`,
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

    const totalCommits = parseInt(commitStatsRes.rows[0].total_commits, 10);
    const totalPRs = parseInt(prStatsRes.rows[0].total_prs, 10);
    const totalReviews = parseInt(reviewStatsRes.rows[0].total_reviews, 10);
    const linesAdded = parseInt(commitStatsRes.rows[0].additions, 10);
    const linesDeleted = parseInt(commitStatsRes.rows[0].deletions, 10);

    return {
      developer: {
        id: dev.id,
        githubUserId: dev.github_user_id,
        login: dev.login,
        name: dev.name || dev.login,
        avatarUrl: dev.avatar_url,
        profileUrl: dev.html_url,
        email: dev.email,
        projects: projectsRes.rows,
        repositories: reposRes.rows,
        metrics: {
          projectsCount: projectsRes.rows.length,
          repositoriesCount: reposRes.rows.length,
          commitsCount: totalCommits,
          prsCount: totalPRs,
          reviewsCount: totalReviews,
          issuesCount: 0,
          linesAdded,
          linesDeleted,
          lastActivityAt: dev.updated_at,
        },
      },
      commitStats: {
        totalCommits,
        avgAdditionsPerCommit: Math.round(linesAdded / (totalCommits || 1)),
        topRepo: reposRes.rows[0]?.name || 'Main Repository',
        commitsByDay: [],
      },
      prStats: {
        totalPRs,
        openPRs: parseInt(prStatsRes.rows[0].open_prs, 10),
        mergedPRs: parseInt(prStatsRes.rows[0].merged_prs, 10),
        closedPRs: parseInt(prStatsRes.rows[0].closed_prs, 10),
      },
      reviewStats: {
        totalReviews,
        approved: parseInt(reviewStatsRes.rows[0].approved, 10),
        changesRequested: parseInt(reviewStatsRes.rows[0].changes_requested, 10),
        commented: parseInt(reviewStatsRes.rows[0].commented, 10),
      },
      issueStats: {
        totalIssues: 0,
        opened: 0,
        closed: 0,
      },
      codeChangeStats: {
        totalAdditions: linesAdded,
        totalDeletions: linesDeleted,
        netChanges: linesAdded - linesDeleted,
        trend: [],
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
      activityDistribution: [],
    };
  }
}

export const developerService = new DeveloperService();
