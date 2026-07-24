import api from './api';
import { User, NotificationPreferences } from '../types';

export async function login(username: string, password: string, timezone?: string) {
  const { data } = await api.post('/auth/login', { username, password, timezone });
  return data.data as { token: string; user: User; expiresIn: number };
}

export async function logout() {
  await api.post('/auth/logout');
  localStorage.removeItem('token');
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data.data as User;
}

export async function updatePreferences(prefs: NotificationPreferences) {
  const { data } = await api.put('/auth/preferences', prefs);
  return data.data;
}
