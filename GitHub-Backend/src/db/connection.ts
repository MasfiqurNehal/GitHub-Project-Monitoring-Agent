import pg from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  logger.warn('DATABASE', 'DATABASE_URL is not set in environment variables.');
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
  logger.error('DATABASE', `Neon PostgreSQL pool error: ${err.message}`, err);
});

export async function checkDatabaseHealth(): Promise<{ isHealthy: boolean; timestamp?: string; error?: string }> {
  try {
    const res = await pool.query('SELECT NOW() as current_time');
    logger.db('Neon PostgreSQL database health check passed successfully.');
    return {
      isHealthy: true,
      timestamp: res.rows[0].current_time,
    };
  } catch (err: any) {
    logger.error('DATABASE', `Neon PostgreSQL database health check failed: ${err.message}`, err);
    return {
      isHealthy: false,
      error: err.message,
    };
  }
}

export async function closeDatabasePool(): Promise<void> {
  try {
    await pool.end();
    logger.info('DATABASE', 'Neon PostgreSQL connection pool closed gracefully.');
  } catch (err: any) {
    logger.error('DATABASE', `Error closing Neon PostgreSQL connection pool: ${err.message}`, err);
  }
}
