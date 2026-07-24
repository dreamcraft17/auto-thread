import db from '../config/database';

export type PublishMode = 'live' | 'dry-run';
export type PublishHistoryStatus = 'pending' | 'success' | 'fail';

export interface PublishHistoryRow {
  id: string;
  post_id: string;
  user_id: string | null;
  timestamp: Date;
  mode: PublishMode;
  status: PublishHistoryStatus;
  error_msg: string | null;
  threads_url: string | null;
  created_at: Date;
}

export class PublishHistoryRepository {
  async createPending(data: { postId: string; userId: string; mode: PublishMode }): Promise<PublishHistoryRow> {
    const [row] = await db('publish_history')
      .insert({
        post_id: data.postId,
        user_id: data.userId,
        mode: data.mode,
        status: 'pending',
      })
      .returning('*');
    return row;
  }

  async markSuccess(id: string, threadsUrl?: string | null) {
    const [row] = await db('publish_history')
      .where({ id })
      .update({ status: 'success', threads_url: threadsUrl || null, error_msg: null })
      .returning('*');
    return row;
  }

  async markFail(id: string, errorMsg: string) {
    const [row] = await db('publish_history')
      .where({ id })
      .update({ status: 'fail', error_msg: errorMsg })
      .returning('*');
    return row;
  }

  async listByPost(postId: string, limit = 20, offset = 0): Promise<PublishHistoryRow[]> {
    return db('publish_history')
      .where({ post_id: postId })
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .offset(offset);
  }

  async deleteOlderThan(days: number) {
    return db('publish_history')
      .where('created_at', '<', db.raw(`NOW() - INTERVAL '${Math.max(1, days)} days'`))
      .del();
  }
}
