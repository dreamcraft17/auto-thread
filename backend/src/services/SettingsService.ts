import db from '../config/database';

export class SettingsService {
  async get(key: string): Promise<{ key: string; value: string; updated_at?: Date; updated_by?: string | null } | null> {
    const row = await db('settings').where({ key }).first();
    if (!row) return null;
    return {
      key: row.key,
      value: row.value,
      updated_at: row.updated_at,
      updated_by: row.updated_by,
    };
  }

  async isLivePublishEnabled(): Promise<boolean> {
    const row = await this.get('live_publish_enabled');
    return row?.value === 'true';
  }

  async setLivePublishEnabled(value: boolean, userId: string) {
    const before = await this.isLivePublishEnabled();
    const existing = await db('settings').where({ key: 'live_publish_enabled' }).first();
    if (existing) {
      await db('settings')
        .where({ key: 'live_publish_enabled' })
        .update({
          value: value ? 'true' : 'false',
          updated_at: db.fn.now(),
          updated_by: userId,
        });
    } else {
      await db('settings').insert({
        key: 'live_publish_enabled',
        value: value ? 'true' : 'false',
        updated_by: userId,
      });
    }

    await db('audit_log').insert({
      user_id: userId,
      action: 'LIVE_MODE_TOGGLE',
      details: { before, after: value },
    });

    return this.get('live_publish_enabled');
  }
}
