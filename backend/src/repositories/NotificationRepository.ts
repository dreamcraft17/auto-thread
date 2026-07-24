import db from '../config/database';
import { Notification } from '../types';

export class NotificationRepository {
  async create(data: {
    userId: string;
    postId?: string;
    type: string;
    title: string;
    message: string;
  }): Promise<Notification> {
    const [notification] = await db('notifications')
      .insert({
        user_id: data.userId,
        post_id: data.postId || null,
        type: data.type,
        title: data.title,
        message: data.message,
      })
      .returning('*');
    return notification;
  }

  async list(userId: string, unreadOnly = false, limit = 50): Promise<Notification[]> {
    let query = db('notifications').where({ user_id: userId });
    if (unreadOnly) query = query.where({ read: false });
    return query.orderBy('created_at', 'desc').limit(limit);
  }

  async markRead(id: string, userId: string): Promise<void> {
    await db('notifications').where({ id, user_id: userId }).update({ read: true });
  }

  async markAllRead(userId: string): Promise<void> {
    await db('notifications').where({ user_id: userId, read: false }).update({ read: true });
  }
}
