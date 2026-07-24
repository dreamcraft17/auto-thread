import db from '../config/database';
import { ActivityLog } from '../types';

export class ActivityLogRepository {
  async create(data: {
    userId: string;
    postId?: string;
    action: string;
    details?: Record<string, unknown>;
  }): Promise<ActivityLog> {
    const [log] = await db('activity_logs')
      .insert({
        user_id: data.userId,
        post_id: data.postId || null,
        action: data.action,
        details: data.details || null,
      })
      .returning('*');
    return log;
  }

  async list(userId: string, limit = 50, offset = 0): Promise<ActivityLog[]> {
    return db('activity_logs')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }
}
