import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config/index.js';

export const REDIS_CONNECTION_OPTIONS = {
  host: config.redisUrl.includes('://') ? new URL(config.redisUrl).hostname : 'localhost',
  port: parseInt(config.redisUrl.includes('://') ? new URL(config.redisUrl).port || '6379' : '6379', 10),
  maxRetriesPerRequest: null,
};

let syncQueue: Queue | null = null;

try {
  const redisConnection = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  redisConnection.on('error', (err) => {
    console.warn('[Queue] Redis warning (Sync background jobs queued fallback):', err.message);
  });

  syncQueue = new Queue('github-sync-queue', { connection: redisConnection });
} catch (e: any) {
  console.warn('[Queue] Unable to connect to Redis. Queue initialized in passive mode:', e.message);
}

export async function addSyncJob(jobName: string, data: { repositoryId: string; owner: string; name: string }) {
  if (syncQueue) {
    try {
      await syncQueue.add(jobName, data);
      console.log(`[Queue] Added job ${jobName} for repository ${data.owner}/${data.name}`);
    } catch (err: any) {
      console.error(`[Queue] Error adding job ${jobName}:`, err.message);
    }
  } else {
    console.log(`[Queue] Redis inactive. Direct execution recommended for ${data.owner}/${data.name}`);
  }
}
