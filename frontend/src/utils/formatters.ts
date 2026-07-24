import { format, formatDistanceToNow } from 'date-fns';

export function formatDateTime(iso: string, timezone?: string): string {
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatRelative(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function toLocalDatetimeInput(iso?: string): string {
  const date = iso ? new Date(iso) : new Date(Date.now() + 3600000);
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function statusColor(status: string): 'default' | 'primary' | 'success' | 'error' | 'warning' {
  switch (status) {
    case 'scheduled': return 'primary';
    case 'published': return 'success';
    case 'failed': return 'error';
    case 'cancelled': return 'default';
    default: return 'default';
  }
}
