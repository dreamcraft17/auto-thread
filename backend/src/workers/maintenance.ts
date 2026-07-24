import cron from 'node-cron';
import { PublishHistoryRepository } from '../repositories/PublishHistoryRepository';
import { MediaService } from '../services/MediaService';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { alertCritical } from '../utils/alerts';
import { publishToThreads, loginToThreads } from '../utils/playwright';
import { updateHeatmapJob } from '../jobs/updateHeatmap';

/**
 * Optional nightly canary (FR-800). Skips when ENABLE_CANARY is not true
 * or staging credentials are missing.
 */
export async function runCanary(): Promise<{ ok: boolean; detail: string }> {
  if (!env.enableCanary) {
    return { ok: true, detail: 'Canary disabled (ENABLE_CANARY!=true)' };
  }
  if (!env.canaryThreadsUsername || !env.canaryThreadsPassword) {
    logger.info('Canary skipped: staging credentials not configured');
    return { ok: true, detail: 'Canary skipped: credentials missing' };
  }

  try {
    const login = await loginToThreads(env.canaryThreadsUsername, env.canaryThreadsPassword, {
      dryRun: env.playwrightDryRun,
    });
    if (!login.success || !login.sessionToken) {
      throw new Error(login.error || 'Canary login failed');
    }

    const textOnly = await publishToThreads(
      `[canary] text ${new Date().toISOString()}`,
      login.sessionToken,
      [],
      { dryRun: env.playwrightDryRun }
    );
    if (!textOnly.success) throw new Error(textOnly.error || 'Canary text publish failed');

    await alertCritical(`✅ Canary passed: ${textOnly.threadsUrl || textOnly.threadsPostId}`);
    return { ok: true, detail: 'Canary passed' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await alertCritical(`❌ Canary failed: ${msg}`);
    return { ok: false, detail: msg };
  }
}

export function startMaintenanceJobs(): void {
  const historyRepo = new PublishHistoryRepository();
  const mediaService = new MediaService();

  cron.schedule('0 3 * * *', async () => {
    try {
      const deleted = await historyRepo.deleteOlderThan(90);
      logger.info(`Pruned ${deleted} publish_history rows older than 90 days`);
      await mediaService.cleanupOldUploads(30);
    } catch (error) {
      logger.error('Maintenance cron error', { error });
    }
  });

  cron.schedule('0 2 * * *', async () => {
    try {
      const result = await runCanary();
      logger.info(`Canary result: ${result.detail}`);
    } catch (error) {
      logger.error('Canary cron error', { error });
    }
  });

  cron.schedule('30 2 * * *', async () => {
    try {
      await updateHeatmapJob();
    } catch (error) {
      logger.error('Heatmap cron error', { error });
    }
  });

  logger.info('Maintenance jobs scheduled (history prune + optional canary + heatmap)');
}
