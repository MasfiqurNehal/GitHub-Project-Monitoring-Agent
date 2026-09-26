import { pool } from '../db/connection.js';
import { developerRepository } from '../repositories/developer.repository.js';
import { activityRepository } from '../repositories/activity.repository.js';

export class DeveloperService {
  async getDeveloperDetail(
    developerIdOrLogin: string,
    filters: {
      dateFrom?: string;
      dateTo?: string;
      projectId?: string;
      repositoryId?: string;
      activityType?: string;
    } = {}
  ) {
    let dev = await developerRepository.findById(developerIdOrLogin);
    if (!dev) {
      dev = await developerRepository.findByLogin(developerIdOrLogin);
    }
    if (!dev) return null;

    const developerId = dev.id;
    const { dateFrom, dateTo, projectId, repositoryId, activityType } = filters;

    // Filter clauses for queries
    const repoJoin = (projectId || repositoryId) ? 'JOIN repositories r ON r.id = c.repository_id' : '';
    let filterConds = '';
    const filterParams: any[] = [developerId];
    let pIdx = 2;

    if (projectId) {
      filterConds += ` AND r.project_id = $${pIdx}`;
      filterParams.push(projectId);
      pIdx++;
    }
    if (repositoryId) {
      filterConds += ` AND c.repository_id = $${pIdx}`;
      filterParams.push(repositoryId);
      pIdx++;
    }

    // Date filters for commits
    let commitDateCond = '';
    const commitParams = [...filterParams];
    let cIdx = pIdx;
    if (dateFrom) {
      commitDateCond += ` AND c.committed_at >= $${cIdx}`;
      commitParams.push(new Date(dateFrom));
      cIdx++;
    }
    if (dateTo) {
      commitDateCond += ` AND c.committed_at <= $${cIdx}`;
      commitParams.push(new Date(dateTo));
      cIdx++;
    }

    // Execute developer detail queries concurrently
    const [
      projectsRes,
      reposRes,
      metrics,
      prStatsRes,
      reviewStatsRes,
      issueStatsRes,
      timelineRes,
      codeTrendRes,
      dailyCommitsRes,
      dailyPRsRes,
      dailyReviewsRes,
      dailyIssuesRes,
    ] = await Promise.all([
      pool.query(
        `SELECT DISTINCT p.id, p.name FROM projects p
         JOIN repositories r ON r.project_id = p.id
         JOIN repository_developers rd ON rd.repository_id = r.id
         WHERE rd.developer_id = $1`,
        [developerId]
      ),
      pool.query(
        `SELECT DISTINCT r.id, r.name, r.full_name FROM repositories r
         JOIN repository_developers rd ON rd.repository_id = r.id
         WHERE rd.developer_id = $1`,
        [developerId]
      ),
      developerRepository.getMetricsForDeveloper(developerId, dateFrom, dateTo, projectId, repositoryId),
      pool.query(
        `SELECT 
          COUNT(*) as total_prs,
          COUNT(*) FILTER (WHERE UPPER(pr.state) = 'OPEN') as open_prs,
          COUNT(*) FILTER (WHERE UPPER(pr.state) = 'MERGED' OR pr.merged = true) as merged_prs,
          COUNT(*) FILTER (WHERE UPPER(pr.state) = 'CLOSED' AND pr.merged = false) as closed_prs
         FROM pull_requests pr
         JOIN repositories r ON r.id = pr.repository_id
         WHERE pr.author_developer_id = $1 ${projectId ? 'AND r.project_id = $2' : ''} ${repositoryId ? `AND pr.repository_id = ${projectId ? '$3' : '$2'}` : ''}`,
        filterParams
      ),
      pool.query(
        `SELECT 
          COUNT(*) as total_reviews,
          COUNT(*) FILTER (WHERE UPPER(prr.state) = 'APPROVED') as approved,
          COUNT(*) FILTER (WHERE UPPER(prr.state) = 'CHANGES_REQUESTED') as changes_requested,
          COUNT(*) FILTER (WHERE UPPER(prr.state) = 'COMMENTED') as commented
         FROM pull_request_reviews prr
         JOIN pull_requests pr ON pr.id = prr.pull_request_id
         JOIN repositories r ON r.id = pr.repository_id
         WHERE prr.reviewer_developer_id = $1 ${projectId ? 'AND r.project_id = $2' : ''} ${repositoryId ? `AND pr.repository_id = ${projectId ? '$3' : '$2'}` : ''}`,
        filterParams
      ),
      pool.query(
        `SELECT 
          COUNT(*) as total_issues,
          COUNT(*) FILTER (WHERE UPPER(i.state) = 'OPEN') as open_issues,
          COUNT(*) FILTER (WHERE UPPER(i.state) = 'CLOSED') as closed_issues
         FROM issues i
         JOIN repositories r ON r.id = i.repository_id
         WHERE i.author_developer_id = $1 ${projectId ? 'AND r.project_id = $2' : ''} ${repositoryId ? `AND i.repository_id = ${projectId ? '$3' : '$2'}` : ''}`,
        filterParams
      ),
      pool.query(
        `SELECT ae.id, ae.occurred_at, ae.event_type, ae.metadata, r.name as repo_name
         FROM activity_events ae
         LEFT JOIN repositories r ON ae.repository_id = r.id
         WHERE ae.developer_id = $1
         ORDER BY ae.occurred_at DESC
         LIMIT 50`,
        [developerId]
      ),
      // Code change trend by date
      pool.query(
        `SELECT 
          TO_CHAR(c.committed_at, 'YYYY-MM-DD') as date,
          COALESCE(SUM(c.additions), 0) as additions,
          COALESCE(SUM(c.deletions), 0) as deletions
         FROM commits c
         JOIN repositories r ON r.id = c.repository_id
         WHERE c.developer_id = $1 ${filterConds} ${commitDateCond}
         GROUP BY TO_CHAR(c.committed_at, 'YYYY-MM-DD')
         ORDER BY date ASC`,
        commitParams
      ),
      // Daily commits count
      pool.query(
        `SELECT TO_CHAR(c.committed_at, 'YYYY-MM-DD') as date, COUNT(*) as count
         FROM commits c
         JOIN repositories r ON r.id = c.repository_id
         WHERE c.developer_id = $1 ${filterConds} ${commitDateCond}
         GROUP BY TO_CHAR(c.committed_at, 'YYYY-MM-DD')`,
        commitParams
      ),
      // Daily PRs count
      pool.query(
        `SELECT TO_CHAR(pr.created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
         FROM pull_requests pr
         JOIN repositories r ON r.id = pr.repository_id
         WHERE pr.author_developer_id = $1 ${projectId ? 'AND r.project_id = $2' : ''} ${repositoryId ? `AND pr.repository_id = ${projectId ? '$3' : '$2'}` : ''}
         GROUP BY TO_CHAR(pr.created_at, 'YYYY-MM-DD')`,
        filterParams
      ),
      // Daily reviews count
      pool.query(
        `SELECT TO_CHAR(prr.submitted_at, 'YYYY-MM-DD') as date, COUNT(*) as count
         FROM pull_request_reviews prr
         JOIN pull_requests pr ON pr.id = prr.pull_request_id
         JOIN repositories r ON r.id = pr.repository_id
         WHERE prr.reviewer_developer_id = $1 ${projectId ? 'AND r.project_id = $2' : ''} ${repositoryId ? `AND pr.repository_id = ${projectId ? '$3' : '$2'}` : ''}
         GROUP BY TO_CHAR(prr.submitted_at, 'YYYY-MM-DD')`,
        filterParams
      ),
      // Daily issues count
      pool.query(
        `SELECT TO_CHAR(i.created_at, 'YYYY-MM-DD') as date, COUNT(*) as count
         FROM issues i
         JOIN repositories r ON r.id = i.repository_id
         WHERE i.author_developer_id = $1 ${projectId ? 'AND r.project_id = $2' : ''} ${repositoryId ? `AND i.repository_id = ${projectId ? '$3' : '$2'}` : ''}
         GROUP BY TO_CHAR(i.created_at, 'YYYY-MM-DD')`,
        filterParams
      ),
    ]);

    // Build activity distribution map by date
    const dateDistMap = new Map<string, { date: string; commits: number; prs: number; reviews: number; issues: number }>();

    for (const r of dailyCommitsRes.rows) {
      if (!r.date) continue;
      const curr = dateDistMap.get(r.date) || { date: r.date, commits: 0, prs: 0, reviews: 0, issues: 0 };
      curr.commits = parseInt(r.count, 10);
      dateDistMap.set(r.date, curr);
    }
    for (const r of dailyPRsRes.rows) {
      if (!r.date) continue;
      const curr = dateDistMap.get(r.date) || { date: r.date, commits: 0, prs: 0, reviews: 0, issues: 0 };
      curr.prs = parseInt(r.count, 10);
      dateDistMap.set(r.date, curr);
    }
    for (const r of dailyReviewsRes.rows) {
      if (!r.date) continue;
      const curr = dateDistMap.get(r.date) || { date: r.date, commits: 0, prs: 0, reviews: 0, issues: 0 };
      curr.reviews = parseInt(r.count, 10);
      dateDistMap.set(r.date, curr);
    }
    for (const r of dailyIssuesRes.rows) {
      if (!r.date) continue;
      const curr = dateDistMap.get(r.date) || { date: r.date, commits: 0, prs: 0, reviews: 0, issues: 0 };
      curr.issues = parseInt(r.count, 10);
      dateDistMap.set(r.date, curr);
    }

    const activityDistribution = Array.from(dateDistMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Construct activity timeline
    let activityTimeline = timelineRes.rows.map((t) => {
      let typeStr: 'commit' | 'pull_request' | 'review' | 'issue' = 'commit';
      if (t.event_type.includes('pr') || t.event_type.includes('pull')) typeStr = 'pull_request';
      else if (t.event_type.includes('review')) typeStr = 'review';
      else if (t.event_type.includes('issue')) typeStr = 'issue';

      return {
        id: t.id,
        date: new Date(t.occurred_at).toISOString().split('T')[0],
        displayDate: new Date(t.occurred_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: new Date(t.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: typeStr,
        title: t.metadata?.message || t.metadata?.title || `Activity: ${t.event_type}`,
        repoName: t.repo_name || 'Repository',
        url: t.metadata?.url,
        linesAdded: t.metadata?.additions,
        linesDeleted: t.metadata?.deletions,
      };
    });

    // Fallback activity timeline if activity_events table is empty
    if (activityTimeline.length === 0) {
      const fallbackCommitsRes = await pool.query(
        `SELECT c.id, c.message, c.commit_url, c.committed_at, c.additions, c.deletions, r.name as repo_name
         FROM commits c
         JOIN repositories r ON r.id = c.repository_id
         WHERE c.developer_id = $1
         ORDER BY c.committed_at DESC
         LIMIT 20`,
        [developerId]
      );
      activityTimeline = fallbackCommitsRes.rows.map((c) => ({
        id: c.id,
        date: new Date(c.committed_at).toISOString().split('T')[0],
        displayDate: new Date(c.committed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: new Date(c.committed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'commit' as const,
        title: c.message,
        repoName: c.repo_name,
        url: c.commit_url,
        linesAdded: parseInt(c.additions || '0', 10),
        linesDeleted: parseInt(c.deletions || '0', 10),
      }));
    }

    // Filter activityTimeline by activityType filter if provided
    if (activityType && activityType !== 'all') {
      const typeKey = activityType.toLowerCase();
      activityTimeline = activityTimeline.filter((t) => {
        if (typeKey === 'commit' && t.type === 'commit') return true;
        if (typeKey === 'pull_request' && t.type === 'pull_request') return true;
        if (typeKey === 'review' && t.type === 'review') return true;
        if (typeKey === 'issue' && t.type === 'issue') return true;
        return false;
      });
    }

    const projectsList = projectsRes.rows.map((p) => ({ id: p.id, name: p.name }));
    const reposList = reposRes.rows.map((r) => ({ id: r.id, name: r.name, fullName: r.full_name }));

    return {
      developer: {
        id: dev.id,
        githubUserId: dev.github_user_id,
        login: dev.login,
        name: dev.name || dev.login,
        avatarUrl: dev.avatar_url || `https://github.com/${dev.login}.png`,
        profileUrl: dev.html_url || `https://github.com/${dev.login}`,
        email: dev.email,
        type: dev.type,
        createdAt: dev.created_at,
        updatedAt: dev.updated_at,
        projects: projectsList,
        repositories: reposList,
        metrics: {
          projectsCount: projectsList.length,
          repositoriesCount: reposList.length,
          commitsCount: metrics.commitCount,
          prsCount: metrics.prCount,
          reviewsCount: metrics.reviewCount,
          issuesCount: metrics.issueCount,
          linesAdded: metrics.additions,
          linesDeleted: metrics.deletions,
          changedFiles: metrics.changedFiles,
          lastActivityAt: dev.updated_at,
        },
      },
      commitStats: {
        totalCommits: metrics.commitCount,
        avgAdditionsPerCommit: Math.round(metrics.additions / (metrics.commitCount || 1)),
        topRepo: reposList[0]?.name || 'Main Repository',
        commitsByDay: dailyCommitsRes.rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) })),
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
        trend: codeTrendRes.rows.map((r) => ({
          date: r.date,
          additions: parseInt(r.additions || '0', 10),
          deletions: parseInt(r.deletions || '0', 10),
        })),
      },
      activityTimeline,
      activityDistribution,
    };
  }

  // Factual Developer Analytics (Raw measurements only, no AI performance judgments)
  async getFactualDeveloperAnalytics(
    developerIdOrLogin: string,
    filters: {
      organizationId?: string;
      dateFrom?: string;
      dateTo?: string;
      repositoryId?: string;
      projectId?: string;
    }
  ) {
    let dev = await developerRepository.findById(developerIdOrLogin);
    if (!dev) {
      dev = await developerRepository.findByLogin(developerIdOrLogin);
    }
    if (!dev) return null;

    const developerId = dev.id;

    let dFrom: Date | undefined = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
    let dTo: Date | undefined = filters.dateTo ? new Date(filters.dateTo) : undefined;
    if (typeof filters.dateFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(filters.dateFrom.trim())) {
      dFrom = new Date(`${filters.dateFrom.trim()}T00:00:00.000Z`);
    }
    if (typeof filters.dateTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(filters.dateTo.trim())) {
      dTo = new Date(`${filters.dateTo.trim()}T23:59:59.999Z`);
    }

    // 1. Commits metrics
    const commitParams: any[] = [developerId];
    let commitWhere = 'WHERE (c.developer_id = $1)';
    let pIdx = 2;

    if (filters.organizationId) {
      commitWhere += ` AND (r.organization_id = $${pIdx} OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $${pIdx}))`;
      commitParams.push(filters.organizationId);
      pIdx++;
    }
    if (filters.repositoryId) {
      commitWhere += ` AND (c.repository_id = $${pIdx} OR r.full_name = $${pIdx} OR r.name = $${pIdx})`;
      commitParams.push(filters.repositoryId);
      pIdx++;
    }
    if (filters.projectId) {
      commitWhere += ` AND r.project_id = $${pIdx}`;
      commitParams.push(filters.projectId);
      pIdx++;
    }
    if (dFrom) {
      commitWhere += ` AND c.committed_at >= $${pIdx}`;
      commitParams.push(dFrom);
      pIdx++;
    }
    if (dTo) {
      commitWhere += ` AND c.committed_at <= $${pIdx}`;
      commitParams.push(dTo);
      pIdx++;
    }

    // 2. PR metrics parameters
    const prParams: any[] = [developerId];
    let prWhere = 'WHERE pr.author_developer_id = $1';
    let prIdx = 2;

    if (filters.organizationId) {
      prWhere += ` AND (r.organization_id = $${prIdx} OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $${prIdx}))`;
      prParams.push(filters.organizationId);
      prIdx++;
    }
    if (filters.repositoryId) {
      prWhere += ` AND (pr.repository_id = $${prIdx} OR r.full_name = $${prIdx} OR r.name = $${prIdx})`;
      prParams.push(filters.repositoryId);
      prIdx++;
    }
    if (filters.projectId) {
      prWhere += ` AND r.project_id = $${prIdx}`;
      prParams.push(filters.projectId);
      prIdx++;
    }
    if (dFrom) {
      prWhere += ` AND pr.created_at >= $${prIdx}`;
      prParams.push(dFrom);
      prIdx++;
    }
    if (dTo) {
      prWhere += ` AND pr.created_at <= $${prIdx}`;
      prParams.push(dTo);
      prIdx++;
    }

    // 3. Review metrics parameters
    const reviewParams: any[] = [developerId];
    let reviewWhere = 'WHERE prr.reviewer_developer_id = $1';
    let revIdx = 2;

    if (filters.organizationId) {
      reviewWhere += ` AND (r.organization_id = $${revIdx} OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $${revIdx}))`;
      reviewParams.push(filters.organizationId);
      revIdx++;
    }
    if (filters.repositoryId) {
      reviewWhere += ` AND (pr.repository_id = $${revIdx} OR r.full_name = $${revIdx} OR r.name = $${revIdx})`;
      reviewParams.push(filters.repositoryId);
      revIdx++;
    }
    if (filters.projectId) {
      reviewWhere += ` AND r.project_id = $${revIdx}`;
      reviewParams.push(filters.projectId);
      revIdx++;
    }
    if (dFrom) {
      reviewWhere += ` AND prr.submitted_at >= $${revIdx}`;
      reviewParams.push(dFrom);
      revIdx++;
    }
    if (dTo) {
      reviewWhere += ` AND prr.submitted_at <= $${revIdx}`;
      reviewParams.push(dTo);
      revIdx++;
    }

    // 4. Issue metrics parameters
    const issueParams: any[] = [developerId];
    let issueWhere = 'WHERE i.author_developer_id = $1';
    let issIdx = 2;

    if (filters.organizationId) {
      issueWhere += ` AND (r.organization_id = $${issIdx} OR r.project_id IN (SELECT id FROM projects WHERE organization_id = $${issIdx}))`;
      issueParams.push(filters.organizationId);
      issIdx++;
    }
    if (filters.repositoryId) {
      issueWhere += ` AND (i.repository_id = $${issIdx} OR r.full_name = $${issIdx} OR r.name = $${issIdx})`;
      issueParams.push(filters.repositoryId);
      issIdx++;
    }
    if (filters.projectId) {
      issueWhere += ` AND r.project_id = $${issIdx}`;
      issueParams.push(filters.projectId);
      issIdx++;
    }
    if (dFrom) {
      issueWhere += ` AND i.created_at >= $${issIdx}`;
      issueParams.push(dFrom);
      issIdx++;
    }
    if (dTo) {
      issueWhere += ` AND i.created_at <= $${issIdx}`;
      issueParams.push(dTo);
      issIdx++;
    }

    // Execute all factual analytics queries concurrently with Promise.all
    const [commitRes, prRes, reviewRes, issueRes, timelineResult] = await Promise.all([
      pool.query(
        `SELECT 
          COUNT(*) as commits,
          COALESCE(SUM(c.additions), 0) as additions,
          COALESCE(SUM(c.deletions), 0) as deletions,
          COALESCE(SUM(c.changed_files), 0) as changed_files
         FROM commits c
         JOIN repositories r ON r.id = c.repository_id
         ${commitWhere}`,
        commitParams
      ),
      pool.query(
        `SELECT 
          COUNT(*) as pull_requests,
          COUNT(*) FILTER (WHERE pr.merged = true OR UPPER(pr.state) = 'MERGED') as merged_prs
         FROM pull_requests pr
         JOIN repositories r ON r.id = pr.repository_id
         ${prWhere}`,
        prParams
      ),
      pool.query(
        `SELECT COUNT(*) as reviews
         FROM pull_request_reviews prr
         JOIN pull_requests pr ON pr.id = prr.pull_request_id
         JOIN repositories r ON r.id = pr.repository_id
         ${reviewWhere}`,
        reviewParams
      ),
      pool.query(
        `SELECT COUNT(*) as issues
         FROM issues i
         JOIN repositories r ON r.id = i.repository_id
         ${issueWhere}`,
        issueParams
      ),
      activityRepository.findActivityFeed({
        organizationId: filters.organizationId,
        developerId,
        repositoryId: filters.repositoryId,
        projectId: filters.projectId,
        from: dFrom,
        to: dTo,
        limit: 100,
      }),
    ]);

    const cRow = commitRes.rows[0] || {};
    const prRow = prRes.rows[0] || {};
    const rRow = reviewRes.rows[0] || {};
    const iRow = issueRes.rows[0] || {};

    return {
      developer: {
        id: dev.id,
        login: dev.login,
        name: dev.name || dev.login,
        avatarUrl: dev.avatar_url || `https://github.com/${dev.login}.png`,
        profileUrl: dev.html_url || `https://github.com/${dev.login}`,
      },
      metrics: {
        commits: parseInt(cRow.commits || '0', 10),
        additions: parseInt(cRow.additions || '0', 10),
        deletions: parseInt(cRow.deletions || '0', 10),
        changedFiles: parseInt(cRow.changed_files || '0', 10),
        pullRequests: parseInt(prRow.pull_requests || '0', 10),
        mergedPRs: parseInt(prRow.merged_prs || '0', 10),
        reviews: parseInt(rRow.reviews || '0', 10),
        issues: parseInt(iRow.issues || '0', 10),
      },
      activityTimeline: timelineResult.data,
    };
  }
}

export const developerService = new DeveloperService();

