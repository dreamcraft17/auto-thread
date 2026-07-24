import { env } from '../config/env';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { UserRepository } from '../repositories/UserRepository';
import { Post } from '../types';
import { logger } from '../utils/logger';

export class NotificationService {
  constructor(
    private notificationRepo = new NotificationRepository(),
    private userRepo = new UserRepository()
  ) {}

  async notifyPostPublished(post: Post): Promise<void> {
    await this.notificationRepo.create({
      userId: post.user_id,
      postId: post.id,
      type: 'POST_PUBLISHED',
      title: 'Post Published',
      message: `Your post "${post.caption.slice(0, 80)}..." was published successfully.`,
    });

    const user = await this.userRepo.findById(post.user_id);
    if (user?.notification_preferences?.emailOnSuccess !== false) {
      await this.sendEmail(user?.email || '', 'Post Published Successfully', `
        <h2>Post Published</h2>
        <p>Your scheduled post was published at ${post.published_time?.toISOString()}.</p>
        <p><strong>Caption:</strong> ${post.caption.slice(0, 200)}</p>
      `);
    }
  }

  async notifyPostRetry(post: Post, attempt: number, error: string): Promise<void> {
    await this.notificationRepo.create({
      userId: post.user_id,
      postId: post.id,
      type: 'POST_RETRY',
      title: `Retry Attempt ${attempt}`,
      message: `Post failed (${error}). Retrying...`,
    });
  }

  async notifyPostFailed(post: Post, error: string): Promise<void> {
    await this.notificationRepo.create({
      userId: post.user_id,
      postId: post.id,
      type: 'POST_FAILED',
      title: 'Post Failed',
      message: `Post failed after ${post.retry_count} retries: ${error}`,
    });

    const user = await this.userRepo.findById(post.user_id);
    if (user?.notification_preferences?.emailOnFailure !== false) {
      await this.sendEmail(user?.email || '', 'Post Failed - Action Required', `
        <h2>Post Failed</h2>
        <p>Your post could not be published after multiple attempts.</p>
        <p><strong>Error:</strong> ${error}</p>
        <p><strong>Caption:</strong> ${post.caption.slice(0, 200)}</p>
        <p>Please log in to retry manually.</p>
      `);
    }
  }

  async listNotifications(userId: string, unreadOnly = false) {
    return this.notificationRepo.list(userId, unreadOnly);
  }

  async markRead(id: string, userId: string) {
    await this.notificationRepo.markRead(id, userId);
  }

  async markAllRead(userId: string) {
    await this.notificationRepo.markAllRead(userId);
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!env.sendgridApiKey || !to) {
      logger.info(`[Email skipped] To: ${to}, Subject: ${subject}`);
      return;
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: env.emailFrom },
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      });

      if (!response.ok) {
        logger.error('SendGrid email failed', { status: response.status });
      }
    } catch (error) {
      logger.error('Email send error', { error });
    }
  }
}
