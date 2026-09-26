import { pool } from '../GitHub-Backend/src/db/connection.js';

async function inspectSchema() {
  const res = await pool.query(`
    SELECT table_name, column_name, data_type, character_maximum_length
    FROM information_schema.columns
    WHERE table_name IN ('commits', 'developers', 'commit_files', 'activity_events', 'repositories', 'repository_developers')
    ORDER BY table_name, column_name;
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

inspectSchema();
