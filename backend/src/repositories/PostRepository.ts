import db from '../config/database';
import { Post, PostFilters, PostStatus } from '../types';

function mapRow(row: Record<string, unknown>): Post {
  return {
    ...row,
    media_urls: Array.isArray(row.media_urls) ? row.media_urls : [],
  } as Post;
}

export class PostRepository {
  async create(userId: string, data: {
    caption: string;
    mediaUrls?: string[];
    scheduledTime: Date;
    status?: PostStatus;
  }): Promise<Post> {
    const mediaUrls = data.mediaUrls || [];
    const [post] = await db('posts')
      .insert({
        user_id: userId,
        caption: data.caption,
        media_urls: mediaUrls,
        media_count: mediaUrls.length,
        scheduled_time: data.scheduledTime,
        status: data.status || 'scheduled',
      })
      .returning('*');
    return mapRow(post);
  }

  async createMany(userId: string, posts: Array<{
    caption: string;
    mediaUrls?: string[];
    scheduledTime: Date;
  }>): Promise<Post[]> {
    const rows = posts.map((p) => {
      const mediaUrls = p.mediaUrls || [];
      return {
        user_id: userId,
        caption: p.caption,
        media_urls: mediaUrls,
        media_count: mediaUrls.length,
        scheduled_time: p.scheduledTime,
        status: 'scheduled' as PostStatus,
      };
    });
    const inserted = await db('posts').insert(rows).returning('*');
    return inserted.map(mapRow);
  }

  async getById(id: string): Promise<Post | undefined> {
    const post = await db('posts').where({ id }).first();
    return post ? mapRow(post) : undefined;
  }

  async getByIdForUser(id: string, userId: string): Promise<Post | undefined> {
    const post = await db('posts').where({ id, user_id: userId }).first();
    return post ? mapRow(post) : undefined;
  }

  async list(userId: string, filters: PostFilters, limit = 10, offset = 0): Promise<{ posts: Post[]; total: number }> {
    let query = db('posts').where({ user_id: userId });
    let countQuery = db('posts').where({ user_id: userId });

    if (filters.status) {
      query = query.where({ status: filters.status });
      countQuery = countQuery.where({ status: filters.status });
    }

    if (filters.search) {
      const term = `%${filters.search}%`;
      query = query.whereILike('caption', term);
      countQuery = countQuery.whereILike('caption', term);
    }

    if (filters.startDate) {
      query = query.where('scheduled_time', '>=', filters.startDate);
      countQuery = countQuery.where('scheduled_time', '>=', filters.startDate);
    }

    if (filters.endDate) {
      query = query.where('scheduled_time', '<=', filters.endDate);
      countQuery = countQuery.where('scheduled_time', '<=', filters.endDate);
    }

    const sortField = filters.sort?.startsWith('-') ? filters.sort.slice(1) : (filters.sort || 'scheduled_time');
    const sortDir = filters.sort?.startsWith('-') ? 'desc' : 'asc';
    const dbField = sortField === 'scheduledTime' ? 'scheduled_time' : sortField;

    const [{ count }] = await countQuery.count('* as count');
    const posts = await query.orderBy(dbField, sortDir).limit(limit).offset(offset);
    return { posts: posts.map(mapRow), total: parseInt(String(count), 10) };
  }

  async getDuePosts(): Promise<Post[]> {
    const posts = await db('posts')
      .where({ status: 'scheduled' })
      .where('scheduled_time', '<=', new Date())
      .orderBy('scheduled_time', 'asc')
      .limit(10);
    return posts.map(mapRow);
  }

  async update(id: string, data: Partial<{
    caption: string;
    media_urls: string[];
    media_count: number;
    scheduled_time: Date;
    status: PostStatus;
    published_time: Date;
    retry_count: number;
    last_error: string | null;
    threads_post_id: string;
    updated_at: Date;
  }>): Promise<Post> {
    const payload = { ...data, updated_at: new Date() } as Record<string, unknown>;
    if (Array.isArray(data.media_urls) && data.media_count === undefined) {
      payload.media_count = data.media_urls.length;
    }
    const [post] = await db('posts')
      .where({ id })
      .update(payload)
      .returning('*');
    return mapRow(post);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const deleted = await db('posts').where({ id, user_id: userId }).delete();
    return deleted > 0;
  }

  async getStats(userId: string): Promise<{
    total: number;
    publishedToday: number;
    scheduled: number;
    failed: number;
    thisWeek: number;
    published: number;
  }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const [total] = await db('posts').where({ user_id: userId }).count('* as count');
    const [publishedToday] = await db('posts')
      .where({ user_id: userId, status: 'published' })
      .where('published_time', '>=', startOfDay)
      .count('* as count');
    const [scheduled] = await db('posts').where({ user_id: userId, status: 'scheduled' }).count('* as count');
    const [failed] = await db('posts').where({ user_id: userId, status: 'failed' }).count('* as count');
    const [thisWeek] = await db('posts')
      .where({ user_id: userId })
      .where('created_at', '>=', startOfWeek)
      .count('* as count');
    const [published] = await db('posts').where({ user_id: userId, status: 'published' }).count('* as count');

    return {
      total: parseInt(String(total.count), 10),
      publishedToday: parseInt(String(publishedToday.count), 10),
      scheduled: parseInt(String(scheduled.count), 10),
      failed: parseInt(String(failed.count), 10),
      thisWeek: parseInt(String(thisWeek.count), 10),
      published: parseInt(String(published.count), 10),
    };
  }

  async getTimeline(userId: string, startDate: string, endDate: string) {
    const rows = await db('posts')
      .where({ user_id: userId })
      .whereBetween('scheduled_time', [startDate, endDate])
      .select(
        db.raw("DATE(scheduled_time) as date"),
        db.raw("COUNT(*) FILTER (WHERE status = 'published') as published"),
        db.raw("COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled"),
        db.raw("COUNT(*) FILTER (WHERE status = 'failed') as failed")
      )
      .groupByRaw('DATE(scheduled_time)')
      .orderBy('date', 'asc');

    return rows.map((r) => ({
      date: r.date,
      published: parseInt(String(r.published), 10),
      scheduled: parseInt(String(r.scheduled), 10),
      failed: parseInt(String(r.failed), 10),
    }));
  }
}
