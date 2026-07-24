export type PostStatus = 'scheduled' | 'published' | 'failed' | 'cancelled';

export interface Post {
  id: string;
  userId: string;
  caption: string;
  mediaUrls: string[];
  mediaCount?: number;
  scheduledTime: string;
  publishedTime: string | null;
  status: PostStatus;
  retryCount: number;
  lastError: string | null;
  threadsPostId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublishHistoryItem {
  id: string;
  timestamp: string;
  mode: 'live' | 'dry-run';
  status: 'pending' | 'success' | 'fail';
  errorMsg: string | null;
  threadsUrl: string | null;
}

export interface User {
  id: string;
  email: string;
  username: string;
  timezone: string;
  notificationPreferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  emailOnSuccess?: boolean;
  emailOnFailure?: boolean;
  dailySummary?: boolean;
  dailySummaryTime?: string;
}

export interface DashboardStats {
  totalPosts: number;
  publishedToday: number;
  scheduledCount: number;
  failedCount: number;
  postsThisWeek: number;
  publishRate: number;
}

export interface Notification {
  id: string;
  userId: string;
  postId: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface ImportResult {
  imported: number;
  failed: number;
  errors: Array<{ row: number; caption?: string; error: string }>;
  rolledBack?: boolean;
}
