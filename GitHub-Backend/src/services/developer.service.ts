import { pool } from '../db/connection.js';
import { developerRepository } from '../repositories/developer.repository.js';

export class DeveloperService {
  async getDeveloperDetail(developerId: string) {
    const dev = await developerRepository.findById(developerId);
    if (!dev) return null;

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

    return {
      developer: {
        ...dev,
        metrics: {
          projectsCount: 1,
          repositoriesCount: 1,
          commitsCount: parseInt(commitStatsRes.rows[0].total_commits, 10),
          prsCount: parseInt(prStatsRes.rows[0].total_prs, 10),
          reviewsCount: parseInt(reviewStatsRes.rows[0].total_reviews, 10),
          issuesCount: 0,
          linesAdded: parseInt(commitStatsRes.rows[0].additions, 10),
          linesDeleted: parseInt(commitStatsRes.rows[0].deletions, 10),
          lastActivityAt: dev.updated_at,
        },
      },
      commitStats: {
        totalCommits: parseInt(commitStatsRes.rows[0].total_commits, 10),
        avgAdditionsPerCommit: Math.round(parseInt(commitStatsRes.rows[0].additions, 10) / (parseInt(commitStatsRes.rows[0].total_commits, 10) || 1)),
        topRepo: 'Main Repository',
        commitsByDay: [],
      },
      prStats: {
        totalPRs: parseInt(prStatsRes.rows[0].total_prs, 10),
        openPRs: parseInt(prStatsRes.rows[0].open_prs, 10),
        mergedPRs: parseInt(prStatsRes.rows[0].merged_prs, 10),
        closedPRs: parseInt(prStatsRes.rows[0].closed_prs, 10),
      },
      reviewStats: {
        totalReviews: parseInt(reviewStatsRes.rows[0].total_reviews, 10),
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
        totalAdditions: parseInt(commitStatsRes.rows[0].additions, 10),
        totalDeletions: parseInt(commitStatsRes.rows[0].deletions, 10),
        netChanges: parseInt(commitStatsRes.rows[0].additions, 10) - parseInt(commitStatsRes.rows[0].deletions, 10),
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
