import { parse } from 'csv-parse/sync';
import { PostRepository } from '../repositories/PostRepository';
import { ActivityLogRepository } from '../repositories/ActivityLogRepository';
import { JobQueueService } from './JobQueueService';
import { AppError } from './AuthService';
import { ImportResult, Post, PostFilters } from '../types';

export class PostService {
  constructor(
    private postRepo = new PostRepository(),
    private activityLogRepo = new ActivityLogRepository(),
    private jobQueueService = new JobQueueService()
  ) {}

  validatePostData(data: { caption?: string; scheduledTime?: string | Date }) {
    if (!data.caption || data.caption.trim().length === 0) {
      throw new AppError('VALIDATION_ERROR', 'Caption is required');
    }
    if (data.caption.length > 500) {
      throw new AppError('VALIDATION_ERROR', 'Caption must be 500 characters or less');
    }
    const scheduled = new Date(data.scheduledTime!);
    if (isNaN(scheduled.getTime())) {
      throw new AppError('VALIDATION_ERROR', 'Invalid scheduled time');
    }
    if (scheduled <= new Date()) {
      throw new AppError('VALIDATION_ERROR', 'Scheduled time must be in the future');
    }
    return scheduled;
  }

  async createPost(userId: string, data: {
    caption: string;
    mediaUrls?: string[];
    scheduledTime: string;
  }): Promise<Post> {
    const scheduledTime = this.validatePostData(data);

    const post = await this.postRepo.create(userId, {
      caption: data.caption.trim(),
      mediaUrls: data.mediaUrls,
      scheduledTime,
    });

    await this.jobQueueService.enqueuePost(post);

    await this.activityLogRepo.create({
      userId,
      postId: post.id,
      action: 'CREATE',
      details: { scheduledTime: scheduledTime.toISOString() },
    });

    return post;
  }

  async getPost(id: string, userId: string): Promise<Post> {
    const post = await this.postRepo.getByIdForUser(id, userId);
    if (!post) throw new AppError('POST_NOT_FOUND', 'Post not found', 404);
    return post;
  }

  async listPosts(userId: string, filters: PostFilters, limit = 10, offset = 0) {
    return this.postRepo.list(userId, filters, limit, offset);
  }

  async updatePost(id: string, userId: string, data: {
    caption?: string;
    scheduledTime?: string;
    mediaUrls?: string[];
  }): Promise<Post> {
    const post = await this.getPost(id, userId);

    if (post.status !== 'scheduled') {
      throw new AppError('INVALID_STATUS', 'Only scheduled posts can be edited');
    }

    const updates: Record<string, unknown> = {};

    if (data.caption !== undefined) {
      if (data.caption.length === 0 || data.caption.length > 500) {
        throw new AppError('VALIDATION_ERROR', 'Caption must be 1-500 characters');
      }
      updates.caption = data.caption.trim();
    }

    if (data.scheduledTime !== undefined) {
      const scheduled = this.validatePostData({ caption: data.caption || post.caption, scheduledTime: data.scheduledTime });
      updates.scheduled_time = scheduled;
    }

    if (data.mediaUrls !== undefined) {
      updates.media_urls = data.mediaUrls;
    }

    const updated = await this.postRepo.update(id, updates);

    if (data.scheduledTime) {
      await this.jobQueueService.removePostJob(id);
      await this.jobQueueService.enqueuePost(updated);
    }

    await this.activityLogRepo.create({
      userId,
      postId: id,
      action: 'UPDATE',
      details: updates,
    });

    return updated;
  }

  async deletePost(id: string, userId: string): Promise<void> {
    const post = await this.getPost(id, userId);

    if (post.status === 'published') {
      throw new AppError('INVALID_STATUS', 'Published posts cannot be deleted');
    }

    await this.jobQueueService.removePostJob(id);
    await this.postRepo.update(id, { status: 'cancelled' });

    await this.activityLogRepo.create({
      userId,
      postId: id,
      action: 'DELETE',
    });
  }

  async importPosts(userId: string, csvContent: string): Promise<ImportResult> {
    const records: Record<string, string>[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length > 500) {
      throw new AppError('IMPORT_TOO_LARGE', 'Maximum 500 posts per import');
    }

    const errors: ImportResult['errors'] = [];
    const validPosts: Array<{ caption: string; scheduledTime: Date; timezone?: string }> = [];

    records.forEach((row, index) => {
      const rowNum = index + 2;
      const caption = row.caption?.trim();
      const date = row.date?.trim();
      const time = row.time?.trim();
      const timezone = row.timezone?.trim() || 'UTC';

      if (!caption || caption.length > 500) {
        errors.push({ row: rowNum, caption, error: 'Caption must be 1-500 characters' });
        return;
      }

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        errors.push({ row: rowNum, caption, error: 'Invalid date format (YYYY-MM-DD)' });
        return;
      }

      if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        errors.push({ row: rowNum, caption, error: 'Invalid time format (HH:MM)' });
        return;
      }

      const scheduledTime = new Date(`${date}T${time}:00`);
      if (isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) {
        errors.push({ row: rowNum, caption, error: 'Scheduled time must be in the future' });
        return;
      }

      validPosts.push({ caption, scheduledTime, timezone });
    });

    const errorRate = errors.length / records.length;
    if (records.length > 0 && errorRate > 0.1) {
      return {
        imported: 0,
        failed: errors.length,
        errors,
        rolledBack: true,
      };
    }

    const posts = await this.postRepo.createMany(
      userId,
      validPosts.map((p) => ({ caption: p.caption, scheduledTime: p.scheduledTime }))
    );

    for (const post of posts) {
      await this.jobQueueService.enqueuePost(post);
    }

    await this.activityLogRepo.create({
      userId,
      action: 'IMPORT',
      details: { imported: posts.length, failed: errors.length },
    });

    return { imported: posts.length, failed: errors.length, errors };
  }

  async retryPost(id: string, userId: string): Promise<Post> {
    const post = await this.getPost(id, userId);

    if (post.status !== 'failed') {
      throw new AppError('INVALID_STATUS', 'Only failed posts can be retried');
    }

    const updated = await this.postRepo.update(id, {
      status: 'scheduled',
      retry_count: 0,
      last_error: null,
      scheduled_time: new Date(),
    });

    await this.jobQueueService.enqueuePost(updated);

    await this.activityLogRepo.create({
      userId,
      postId: id,
      action: 'RETRY',
    });

    return updated;
  }

  async getStats(userId: string) {
    const stats = await this.postRepo.getStats(userId);
    const total = stats.published + stats.failed;
    const publishRate = total > 0 ? Math.round((stats.published / total) * 1000) / 10 : 100;

    return {
      totalPosts: stats.total,
      publishedToday: stats.publishedToday,
      scheduledCount: stats.scheduled,
      failedCount: stats.failed,
      postsThisWeek: stats.thisWeek,
      publishRate,
    };
  }

  async getTimeline(userId: string, startDate: string, endDate: string) {
    return this.postRepo.getTimeline(userId, startDate, endDate);
  }
}
