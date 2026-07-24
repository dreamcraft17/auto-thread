import {
  Card, CardContent, Typography, Chip, Box, IconButton, Tooltip, Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ReplayIcon from '@mui/icons-material/Replay';
import { Post } from '../../types';
import { formatDateTime, formatRelative, statusColor } from '../../utils/formatters';

interface PostCardProps {
  post: Post;
  timezone?: string;
  onEdit?: (post: Post) => void;
  onDelete?: (post: Post) => void;
  onRetry?: (post: Post) => void;
}

export default function PostCard({ post, timezone, onEdit, onDelete, onRetry }: PostCardProps) {
  const timeLabel = post.status === 'published' && post.publishedTime
    ? `Published ${formatRelative(post.publishedTime)}`
    : `Scheduled ${formatDateTime(post.scheduledTime, timezone)}`;

  return (
    <Card variant="outlined" sx={{ mb: 1.5, '&:hover': { boxShadow: 1 } }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Chip label={post.status} color={statusColor(post.status)} size="small" />
              <Typography variant="caption" color="text.secondary">{timeLabel}</Typography>
            </Stack>
            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
              {post.caption}
            </Typography>
            {post.lastError && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                Error: {post.lastError}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            {post.status === 'scheduled' && onEdit && (
              <Tooltip title="Edit">
                <IconButton size="small" onClick={() => onEdit(post)}><EditIcon fontSize="small" /></IconButton>
              </Tooltip>
            )}
            {post.status === 'failed' && onRetry && (
              <Tooltip title="Retry">
                <IconButton size="small" color="primary" onClick={() => onRetry(post)}><ReplayIcon fontSize="small" /></IconButton>
              </Tooltip>
            )}
            {post.status !== 'published' && onDelete && (
              <Tooltip title="Cancel">
                <IconButton size="small" color="error" onClick={() => onDelete(post)}><DeleteIcon fontSize="small" /></IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
