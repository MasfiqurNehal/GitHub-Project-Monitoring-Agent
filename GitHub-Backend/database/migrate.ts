import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('[Migration] Starting Neon PostgreSQL database migrations...');
  const client = await pool.connect();

  try {
    // 1. Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Read all .sql files in database/migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // 3. Get applied migrations
    const appliedRes = await client.query('SELECT migration_name FROM schema_migrations');
    const appliedMigrations = new Set(appliedRes.rows.map(r => r.migration_name));

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        console.log(`[Migration] Skipped (Already applied): ${file}`);
        continue;
      }

      console.log(`[Migration] Executing: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
      console.log(`[Migration] Successfully applied: ${file}`);
    }

    console.log('[Migration] All database migrations completed successfully!');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[Migration Error]', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
