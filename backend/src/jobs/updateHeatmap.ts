import db from '../config/database';
import { logger } from '../utils/logger';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Rebuild posting_heatmap from last 30 days of published posts.
 * Without engagement metrics in schema, use publish volume as proxy (+1 per post).
 */
export async function updateHeatmapJob(): Promise<void> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const posts = await db('posts')
    .where({ status: 'published' })
    .where('published_time', '>', since)
    .select('published_time');

  const counts = new Map<string, number>();
  for (const post of posts) {
    if (!post.published_time) continue;
    const date = new Date(post.published_time);
    const day = DAY_NAMES[date.getDay()];
    const hour = date.getHours();
    const key = `${day}_${hour}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  // Soft-blend: keep seeded baseline and add real volume * 10
  const existing = await db('posting_heatmap').select('*');
  for (const row of existing) {
    const key = `${row.day_of_week}_${row.hour_of_day}`;
    const volume = counts.get(key) || 0;
    const baseline = Math.min(row.total_engagement, 80);
    const next = baseline + volume * 10;
    await db('posting_heatmap')
      .where({ id: row.id })
      .update({ total_engagement: next, updated_at: db.fn.now() });
  }

  logger.info(`Heatmap updated from ${posts.length} published posts`);
}
