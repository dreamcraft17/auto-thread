import { postQueue } from '../config/queue';
import { Post } from '../types';
import { logger } from '../utils/logger';

export class JobQueueService {
  async enqueuePost(post: Post): Promise<void> {
    const delayMs = Math.max(0, new Date(post.scheduled_time).getTime() - Date.now());

    await postQueue.add(
      'publish',
      { postId: post.id, userId: post.user_id },
      {
        delay: delayMs,
        jobId: `post-${post.id}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
      }
    );

    logger.info(`Enqueued post ${post.id} with delay ${delayMs}ms`);
  }

  async enqueueRetry(postId: string, userId: string, delayMs: number): Promise<void> {
    await postQueue.add(
      'publish',
      { postId, userId },
      {
        delay: delayMs,
        jobId: `retry-${postId}-${Date.now()}`,
        attempts: 1,
      }
    );
    logger.info(`Enqueued retry for post ${postId} with delay ${delayMs}ms`);
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      postQueue.getWaitingCount(),
      postQueue.getActiveCount(),
      postQueue.getCompletedCount(),
      postQueue.getFailedCount(),
      postQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async removePostJob(postId: string): Promise<void> {
    const job = await postQueue.getJob(`post-${postId}`);
    if (job) await job.remove();
  }
}
