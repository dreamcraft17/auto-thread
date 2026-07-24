import { postQueue } from '../config/queue';
import { PublishingService } from '../services/PublishingService';
import { logger } from '../utils/logger';
import cron from 'node-cron';

const publishingService = new PublishingService();

export function startWorkers(): void {
  postQueue.process('publish', 3, async (job) => {
    const { postId } = job.data;
    logger.info(`Processing publish job for post ${postId}`);
    await publishingService.executePublish(postId);
  });

  postQueue.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed`, { error: err.message });
  });

  cron.schedule('* * * * *', async () => {
    try {
      await publishingService.processDuePosts();
    } catch (error) {
      logger.error('Cron job error', { error });
    }
  });

  logger.info('Workers started: Bull queue processor + cron scheduler');
}
