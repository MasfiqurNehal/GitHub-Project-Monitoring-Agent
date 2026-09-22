import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[Database] WARNING: DATABASE_URL is not set in environment variables.');
}

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[Database Pool Error]', err.message);
});

export async function checkDatabaseHealth(): Promise<{ isHealthy: boolean; timestamp?: string; error?: string }> {
  try {
    const res = await pool.query('SELECT NOW() as current_time');
    return {
      isHealthy: true,
      timestamp: res.rows[0].current_time,
    };
  } catch (err: any) {
    console.error('[Database Health Error]', err.message);
    return {
      isHealthy: false,
      error: err.message,
    };
  }
}
