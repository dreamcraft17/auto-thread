import { env } from '../config/env';
import { PostRepository } from '../repositories/PostRepository';
import { JobRepository } from '../repositories/JobRepository';
import { UserRepository } from '../repositories/UserRepository';
import { ActivityLogRepository } from '../repositories/ActivityLogRepository';
import { AuthService } from './AuthService';
import { JobQueueService } from './JobQueueService';
import { NotificationService } from './NotificationService';
import { publishToThreads } from '../utils/playwright';
import { logger } from '../utils/logger';
import { Post } from '../types';

let lastPublishTime = 0;

export class PublishingService {
  constructor(
    private postRepo = new PostRepository(),
    private jobRepo = new JobRepository(),
    private userRepo = new UserRepository(),
    private activityLogRepo = new ActivityLogRepository(),
    private authService = new AuthService(),
    private jobQueueService = new JobQueueService(),
    private notificationService = new NotificationService()
  ) {}

  private async respectRateLimit(): Promise<void> {
    const elapsed = Date.now() - lastPublishTime;
    if (elapsed < env.publishRateLimitMs) {
      await new Promise((r) => setTimeout(r, env.publishRateLimitMs - elapsed));
    }
    lastPublishTime = Date.now();
  }

  private categorizeError(error: string): string {
    if (error.includes('timeout') || error.includes('network')) return 'network';
    if (error.includes('session') || error.includes('login') || error.includes('auth')) return 'authentication';
    if (error.includes('rate') || error.includes('limit')) return 'rate_limit';
    return 'unknown';
  }

  async executePublish(postId: string): Promise<void> {
    const post = await this.postRepo.getById(postId);
    if (!post || post.status !== 'scheduled') {
      logger.warn(`Skipping publish for post ${postId}: not scheduled`);
      return;
    }

    const job = await this.jobRepo.create({
      postId,
      jobType: 'PUBLISH_POST',
      status: 'processing',
      attemptNumber: post.retry_count + 1,
    });

    await this.jobRepo.appendLog(job.id, `Starting publish attempt ${post.retry_count + 1}`);

    try {
      await this.respectRateLimit();

      const user = await this.userRepo.findById(post.user_id);
      if (!user) throw new Error('User not found');

      let sessionToken = user.threads_session_token;

      if (!sessionToken) {
        sessionToken = await this.authService.refreshThreadsSession(user);
      }

      let result = await publishToThreads(post.caption, sessionToken, post.media_urls);

      if (!result.success && this.categorizeError(result.error || '') === 'authentication') {
        await this.jobRepo.appendLog(job.id, 'Session expired, re-logging in...');
        sessionToken = await this.authService.refreshThreadsSession(user);
        result = await publishToThreads(post.caption, sessionToken, post.media_urls);
      }

      if (!result.success) {
        throw new Error(result.error || 'Publish failed');
      }

      const published = await this.postRepo.update(postId, {
        status: 'published',
        published_time: new Date(),
        threads_post_id: result.threadsPostId,
        last_error: null,
      });

      await this.jobRepo.update(job.id, { status: 'completed' });
      await this.jobRepo.appendLog(job.id, 'Publish successful');

      await this.activityLogRepo.create({
        userId: post.user_id,
        postId,
        action: 'PUBLISH',
        details: { threadsPostId: result.threadsPostId },
      });

      await this.notificationService.notifyPostPublished(published);
      logger.info(`Post ${postId} published successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const category = this.categorizeError(message);
      const newRetryCount = post.retry_count + 1;

      await this.jobRepo.update(job.id, {
        status: 'failed',
        error_message: message,
      });
      await this.jobRepo.appendLog(job.id, `Failed: ${message} (${category})`);

      if (newRetryCount < env.maxRetries && category !== 'unknown') {
        const delayMs = env.backoffDelaysMs[newRetryCount - 1] || env.backoffDelaysMs.at(-1)!;

        await this.postRepo.update(postId, {
          retry_count: newRetryCount,
          last_error: message,
        });

        await this.notificationService.notifyPostRetry(post, newRetryCount, message);
        await this.jobQueueService.enqueueRetry(postId, post.user_id, delayMs);
        logger.info(`Post ${postId} scheduled for retry ${newRetryCount} in ${delayMs}ms`);
      } else {
        const failed = await this.postRepo.update(postId, {
          status: 'failed',
          retry_count: newRetryCount,
          last_error: message,
        });

        await this.notificationService.notifyPostFailed(failed, message);
        logger.error(`Post ${postId} failed permanently: ${message}`);
      }
    }
  }

  async processDuePosts(): Promise<void> {
    const duePosts = await this.postRepo.getDuePosts();
    for (const post of duePosts) {
      await this.executePublish(post.id);
    }
  }
}
