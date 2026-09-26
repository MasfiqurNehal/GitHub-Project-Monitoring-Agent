import { pool } from '../GitHub-Backend/src/db/connection.js';

async function fixActivitySchema() {
  console.log('Altering activity_events column lengths to VARCHAR(64)...');
  await pool.query(`
    ALTER TABLE activity_events ALTER COLUMN id TYPE VARCHAR(64);
    ALTER TABLE activity_events ALTER COLUMN entity_id TYPE VARCHAR(64);
    ALTER TABLE activity_events ALTER COLUMN developer_id TYPE VARCHAR(64);
  `);
  console.log('✅ activity_events column lengths updated.');
  process.exit(0);
}

fixActivitySchema().catch(err => {
  console.error(err);
  process.exit(1);
});
