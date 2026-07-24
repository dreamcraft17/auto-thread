export type PostStatus = 'scheduled' | 'published' | 'failed' | 'cancelled';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  threads_username: string | null;
  threads_password_encrypted: string | null;
  threads_session_token: string | null;
  timezone: string;
  notification_preferences: NotificationPreferences;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  login_attempts: number;
  locked_until: Date | null;
}

export interface NotificationPreferences {
  emailOnSuccess?: boolean;
  emailOnFailure?: boolean;
  dailySummary?: boolean;
  dailySummaryTime?: string;
}

export interface Post {
  id: string;
  user_id: string;
  caption: string;
  media_urls: string[];
  scheduled_time: Date;
  published_time: Date | null;
  status: PostStatus;
  retry_count: number;
  last_error: string | null;
  threads_post_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Job {
  id: string;
  post_id: string;
  job_type: string;
  status: JobStatus;
  attempt_number: number;
  next_retry_time: Date | null;
  error_message: string | null;
  execution_logs: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  post_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  post_id: string | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: Date;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PostFilters {
  status?: PostStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
}

export interface ImportError {
  row: number;
  caption?: string;
  error: string;
}

export interface ImportResult {
  imported: number;
  failed: number;
  errors: ImportError[];
  rolledBack?: boolean;
}

export interface DashboardStats {
  totalPosts: number;
  publishedToday: number;
  scheduledCount: number;
  failedCount: number;
  postsThisWeek: number;
  publishRate: number;
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}
