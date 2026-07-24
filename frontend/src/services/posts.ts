import api from './api';
import { Post, DashboardStats, Pagination, ImportResult, Notification } from '../types';

export async function createPost(payload: { caption: string; scheduledTime: string; mediaUrls?: string[] }) {
  const { data } = await api.post('/posts', payload);
  return data.data as Post;
}

export async function getPosts(params: {
  status?: string;
  limit?: number;
  offset?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
}) {
  const { data } = await api.get('/posts', { params });
  return data.data as { posts: Post[]; pagination: Pagination };
}

export async function getScheduledPosts(limit = 10, offset = 0) {
  const { data } = await api.get('/posts/scheduled', { params: { limit, offset } });
  return data.data as { posts: Post[]; pagination: Pagination };
}

export async function getPublishedPosts(limit = 10, offset = 0) {
  const { data } = await api.get('/posts/published', { params: { limit, offset } });
  return data.data as { posts: Post[]; pagination: Pagination };
}

export async function getFailedPosts(limit = 10, offset = 0) {
  const { data } = await api.get('/posts/failed', { params: { limit, offset } });
  return data.data as { posts: Post[]; pagination: Pagination };
}

export async function updatePost(
  id: string,
  payload: Partial<{ caption: string; scheduledTime: string; mediaUrls: string[] }>
) {
  const { data } = await api.put(`/posts/${id}`, payload);
  return data.data as Post;
}

export async function uploadMedia(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/posts/upload-media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data as { media_url: string; file_size: number; mime_type: string };
}

export async function getPostHistory(postId: string) {
  const { data } = await api.get(`/posts/${postId}/history`);
  return data.data.history as import('../types').PublishHistoryItem[];
}

export async function exportPostHistoryCsv(postId: string) {
  const { data } = await api.get(`/posts/${postId}/history`, {
    params: { format: 'csv' },
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = `publish-history-${postId}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function deletePost(id: string) {
  await api.delete(`/posts/${id}`);
}

export async function retryPost(id: string) {
  const { data } = await api.post(`/posts/${id}/retry`);
  return data.data;
}

export async function importPosts(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/posts/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data as ImportResult;
}

export async function getStats() {
  const { data } = await api.get('/dashboard/stats');
  return data.data as DashboardStats;
}

export async function getNotifications(unreadOnly = false) {
  const { data } = await api.get('/dashboard/notifications', { params: { unreadOnly } });
  return data.data.notifications as Notification[];
}

export async function markNotificationRead(id: string) {
  await api.put(`/dashboard/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  await api.put('/dashboard/notifications/read-all');
}
