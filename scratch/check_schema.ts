import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), 'GitHub-Backend', '.env') });

import { pool } from '../GitHub-Backend/src/db/connection.js';

async function main() {
  try {
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Tables:', tablesRes.rows.map(r => r.table_name));

    const indexesRes = await pool.query(`
      SELECT tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname;
    `);
    console.log('\nIndexes:');
    for (const row of indexesRes.rows) {
      console.log(`- ${row.tablename}: ${row.indexname} (${row.indexdef})`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error checking schema:', err);
    process.exit(1);
  }
}

main();
