const { pool } = require('./dist/db/connection.js');

async function auditDatabase() {
  console.log('==================================================');
  console.log('DATABASE AUDIT FOR DEVELOPER ANALYTICS PIPELINE');
  console.log('==================================================\n');

  try {
    // 1. Repositories
    const reposRes = await pool.query(`SELECT id, name, full_name, owner, sync_status, last_synced_at, github_repository_id FROM repositories`);
    console.log(`[1] Repositories in DB (${reposRes.rows.length}):`);
    reposRes.rows.forEach(r => {
      console.log(`  - ID: ${r.id} | Name: ${r.full_name} | GitHub Repo ID: ${r.github_repository_id} | Sync Status: ${r.sync_status} | Last Synced: ${r.last_synced_at}`);
    });

    // 2. Developers
    const devsRes = await pool.query(`SELECT id, login, name, github_user_id, email FROM developers LIMIT 20`);
    console.log(`\n[2] Sample Developers in DB (${devsRes.rows.length}):`);
    devsRes.rows.forEach(d => {
      console.log(`  - ID: ${d.id} | Login: ${d.login} | GitHub User ID: ${d.github_user_id} | Email: ${d.email}`);
    });

    // 3. Repository Developers Junction
    const rdRes = await pool.query(`
      SELECT rd.repository_id, r.full_name as repo_name, rd.developer_id, d.login as dev_login
      FROM repository_developers rd
      JOIN repositories r ON r.id = rd.repository_id
      JOIN developers d ON d.id = rd.developer_id
      LIMIT 20
    `);
    console.log(`\n[3] Repository-Developer Links (${rdRes.rows.length}):`);
    rdRes.rows.forEach(link => {
      console.log(`  - Repo: ${link.repo_name} (${link.repository_id}) <---> Dev: @${link.dev_login} (${link.developer_id})`);
    });

    // 4. Commits Total & Breakdown
    const commitCountRes = await pool.query(`SELECT COUNT(*) as total FROM commits`);
    console.log(`\n[4] Total Commits in DB: ${commitCountRes.rows[0].total}`);
    if (parseInt(commitCountRes.rows[0].total, 10) > 0) {
      const commitSample = await pool.query(`
        SELECT c.id, c.github_commit_sha, c.repository_id, r.full_name as repo_name, c.developer_id, d.login as dev_login, c.additions, c.deletions, c.committed_at
        FROM commits c
        JOIN repositories r ON r.id = c.repository_id
        LEFT JOIN developers d ON d.id = c.developer_id
        LIMIT 10
      `);
      console.log('  Sample Commits:');
      commitSample.rows.forEach(c => {
        console.log(`    - SHA: ${c.github_commit_sha.substring(0,7)} | Repo: ${c.repo_name} | Dev: ${c.dev_login || 'NULL'} (${c.developer_id || 'NULL'}) | +${c.additions}/-${c.deletions} | Date: ${c.committed_at}`);
      });
    }

    // 5. Commits grouped by repository & developer
    const commitGroupRes = await pool.query(`
      SELECT c.repository_id, r.full_name as repo_name, c.developer_id, d.login as dev_login, COUNT(*) as commit_count
      FROM commits c
      JOIN repositories r ON r.id = c.repository_id
      LEFT JOIN developers d ON d.id = c.developer_id
      GROUP BY c.repository_id, r.full_name, c.developer_id, d.login
    `);
    console.log(`\n[5] Commits Grouped by Repo & Developer (${commitGroupRes.rows.length} groups):`);
    commitGroupRes.rows.forEach(g => {
      console.log(`  - Repo: ${g.repo_name} | Dev: @${g.dev_login || 'NULL'} | Commits: ${g.commit_count}`);
    });

    // 6. Pull Requests Total & Breakdown
    const prCountRes = await pool.query(`SELECT COUNT(*) as total FROM pull_requests`);
    console.log(`\n[6] Total Pull Requests in DB: ${prCountRes.rows[0].total}`);
    if (parseInt(prCountRes.rows[0].total, 10) > 0) {
      const prGroupRes = await pool.query(`
        SELECT pr.repository_id, r.full_name as repo_name, pr.author_developer_id, d.login as dev_login, COUNT(*) as pr_count
        FROM pull_requests pr
        JOIN repositories r ON r.id = pr.repository_id
        LEFT JOIN developers d ON d.id = pr.author_developer_id
        GROUP BY pr.repository_id, r.full_name, pr.author_developer_id, d.login
      `);
      console.log('  PRs Grouped by Repo & Author:');
      prGroupRes.rows.forEach(g => {
        console.log(`    - Repo: ${g.repo_name} | Author: @${g.dev_login || 'NULL'} | PRs: ${g.pr_count}`);
      });
    }

    // 7. Pull Request Reviews
    const prrCountRes = await pool.query(`SELECT COUNT(*) as total FROM pull_request_reviews`);
    console.log(`\n[7] Total Pull Request Reviews in DB: ${prrCountRes.rows[0].total}`);

    // 8. Issues
    const issueCountRes = await pool.query(`SELECT COUNT(*) as total FROM issues`);
    console.log(`\n[8] Total Issues in DB: ${issueCountRes.rows[0].total}`);

    // 9. Activity Events
    const aeCountRes = await pool.query(`SELECT COUNT(*) as total FROM activity_events`);
    console.log(`\n[9] Total Activity Events in DB: ${aeCountRes.rows[0].total}`);

    // 10. Specifically inspect MasfiqurNehal
    const masfiqurRes = await pool.query(`SELECT * FROM developers WHERE LOWER(login) = 'masfiqurnehal'`);
    if (masfiqurRes.rows.length > 0) {
      const dev = masfiqurRes.rows[0];
      console.log(`\n[10] SPECIFIC INSPECTION: @MasfiqurNehal (ID: ${dev.id})`);
      const devCommits = await pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(additions), 0) as additions, COALESCE(SUM(deletions), 0) as deletions FROM commits WHERE developer_id = $1`, [dev.id]);
      const devPRs = await pool.query(`SELECT COUNT(*) as count FROM pull_requests WHERE author_developer_id = $1`, [dev.id]);
      const devReviews = await pool.query(`SELECT COUNT(*) as count FROM pull_request_reviews WHERE reviewer_developer_id = $1`, [dev.id]);
      const devIssues = await pool.query(`SELECT COUNT(*) as count FROM issues WHERE author_developer_id = $1`, [dev.id]);

      console.log(`  - Commits linked to developer_id=${dev.id}: ${devCommits.rows[0].count} (+${devCommits.rows[0].additions}/-${devCommits.rows[0].deletions})`);
      console.log(`  - PRs linked to author_developer_id=${dev.id}: ${devPRs.rows[0].count}`);
      console.log(`  - Reviews linked to reviewer_developer_id=${dev.id}: ${devReviews.rows[0].count}`);
      console.log(`  - Issues linked to author_developer_id=${dev.id}: ${devIssues.rows[0].count}`);

      // Check if there are commits with author login = 'MasfiqurNehal' or author name = 'MasfiqurNehal' in commits table that are unlinked or linked to another developer_id
      const unlinkedCommits = await pool.query(`
        SELECT c.id, c.github_commit_sha, c.developer_id, c.repository_id, r.full_name
        FROM commits c
        JOIN repositories r ON r.id = c.repository_id
        WHERE c.developer_id != $1 OR c.developer_id IS NULL
      `, [dev.id]);
      console.log(`  - Commits in DB NOT linked to @MasfiqurNehal: ${unlinkedCommits.rows.length}`);
      if (unlinkedCommits.rows.length > 0) {
        unlinkedCommits.rows.slice(0, 5).forEach(uc => {
          console.log(`      * Commit ${uc.github_commit_sha.substring(0,7)} in ${uc.full_name} -> dev_id: ${uc.developer_id || 'NULL'}`);
        });
      }
    }

  } catch (err) {
    console.error('Database Audit Error:', err);
  } finally {
    await pool.end();
  }
}

auditDatabase();
