import api from './api';

export async function getLivePublishSetting() {
  const { data } = await api.get('/settings', { params: { key: 'live_publish_enabled' } });
  return data.data as { key: string; value: boolean; updated_at?: string; updated_by?: string | null };
}

export async function setLivePublishEnabled(value: boolean) {
  const { data } = await api.patch('/settings', { key: 'live_publish_enabled', value });
  return data.data as { key: string; value: boolean; updated_at?: string; updated_by?: string | null };
}
