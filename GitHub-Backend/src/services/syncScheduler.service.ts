import { repositoryRepository } from '../repositories/repository.repository.js';
import { syncService } from './sync.service.js';
import { logger } from '../utils/logger.js';

export class SyncSchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  public startScheduler(): void {
    const isEnabled = process.env.ENABLE_SYNC_SCHEDULER !== 'false';
    if (!isEnabled) {
      logger.info('SCHEDULER', 'Periodic Sync Scheduler is disabled (ENABLE_SYNC_SCHEDULER=false).');
      return;
    }

    if (this.timer) {
      logger.warn('SCHEDULER', 'Periodic Sync Scheduler is already running. Preventing duplicate scheduler instance.');
      return;
    }

    const intervalMinutes = parseInt(process.env.GITHUB_SYNC_INTERVAL_MINUTES || process.env.SYNC_INTERVAL_MINUTES || '5', 10);
    const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

    logger.info('SCHEDULER', `Starting Periodic Repository Sync Scheduler (Interval: ${intervalMinutes} minutes).`);

    // Run an initial sync cycle after 15 seconds of server startup
    setTimeout(() => {
      this.runSyncCycle().catch((err) => {
        logger.error('SCHEDULER', `Error in initial periodic sync cycle: ${err.message}`);
      });
    }, 15000);

    // Schedule recurring periodic sync
    this.timer = setInterval(() => {
      this.runSyncCycle().catch((err) => {
        logger.error('SCHEDULER', `Error in periodic sync cycle: ${err.message}`);
      });
    }, intervalMs);
  }

  public stopScheduler(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('SCHEDULER', 'Periodic Sync Scheduler stopped.');
    }
  }

  public async runSyncCycle(): Promise<void> {
    if (this.isRunning) {
      logger.warn('SCHEDULER', 'Sync cycle already in progress. Skipping this interval.');
      return;
    }

    this.isRunning = true;

    try {
      // Find active monitored repositories across all tenants
      const repos = await repositoryRepository.findAll();
      logger.info('SCHEDULER', `Periodic Sync Cycle triggered. Processing ${repos.length} monitored repositories...`);

      for (const repo of repos) {
        try {
          logger.info('SCHEDULER', `Syncing repository ${repo.full_name} (Last synced: ${repo.last_synced_at ? repo.last_synced_at.toISOString() : 'Never'})...`);
          
          // Execute incremental sync (uses since=repo.last_synced_at)
          await syncService.syncRepositoryIncremental(repo.id, repo.organization_id || undefined);

          logger.info('SCHEDULER', `Successfully synced repository ${repo.full_name}.`);
        } catch (repoErr: any) {
          logger.error('SCHEDULER', `Failed periodic sync for repository ${repo.full_name}: ${repoErr.message}`);
          await repositoryRepository.updateSyncStatus(repo.id, 'FAILED', undefined, repoErr.message);
          // Continue processing remaining repositories if one fails!
        }
      }
    } catch (cycleErr: any) {
      logger.error('SCHEDULER', `Fatal error during periodic sync cycle: ${cycleErr.message}`);
    } finally {
      this.isRunning = false;
    }
  }
}

export const syncSchedulerService = new SyncSchedulerService();

/**
 * PRODUCTION / CLOUD DEPLOYMENT ARCHITECTURE NOTE:
 * For multi-instance / horizontally-scaled cloud deployments (e.g. multiple Node.js backend instances running behind a load balancer),
 * this single-process Node.js scheduler must be upgraded to use a distributed locking mechanism
 * (such as PostgreSQL advisory locks `SELECT pg_try_advisory_lock(...)` or Redis/BullMQ distributed queue)
 * to prevent duplicate concurrent sync execution across instances.
 */
