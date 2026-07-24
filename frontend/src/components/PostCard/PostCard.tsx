import { useState } from 'react';
import {
  Card, CardContent, Typography, Chip, Box, IconButton, Tooltip, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableHead,
  TableRow, TableCell, TableBody, Link, CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ReplayIcon from '@mui/icons-material/Replay';
import HistoryIcon from '@mui/icons-material/History';
import ImageIcon from '@mui/icons-material/Image';
import { Post, PublishHistoryItem } from '../../types';
import { formatDateTime, formatRelative, statusColor } from '../../utils/formatters';
import { getPostHistory, exportPostHistoryCsv } from '../../services/posts';

interface PostCardProps {
  post: Post;
  timezone?: string;
  onEdit?: (post: Post) => void;
  onDelete?: (post: Post) => void;
  onRetry?: (post: Post) => void;
}

export default function PostCard({ post, timezone, onEdit, onDelete, onRetry }: PostCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<PublishHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const timeLabel = post.status === 'published' && post.publishedTime
    ? `Published ${formatRelative(post.publishedTime)}`
    : `Scheduled ${formatDateTime(post.scheduledTime, timezone)}`;

  const openHistory = async () => {
    setHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const rows = await getPostHistory(post.id);
      setHistory(rows);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const mediaCount = post.mediaCount ?? post.mediaUrls?.length ?? 0;

  return (
    <>
      <Card variant="outlined" sx={{ mb: 1.5, '&:hover': { boxShadow: 1 } }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Chip label={post.status} color={statusColor(post.status)} size="small" />
                {mediaCount > 0 && (
                  <Chip icon={<ImageIcon />} label={`${mediaCount} media`} size="small" variant="outlined" />
                )}
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
              <Tooltip title="View History">
                <IconButton size="small" onClick={() => void openHistory()}>
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
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

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Publish History</DialogTitle>
        <DialogContent>
          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : history.length === 0 ? (
            <Typography color="text.secondary">No publish attempts yet.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>URL / Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{new Date(h.timestamp).toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={h.mode}
                        size="small"
                        color={h.mode === 'live' ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{h.status}</TableCell>
                    <TableCell>
                      {h.threadsUrl ? (
                        <Link href={h.threadsUrl} target="_blank" rel="noreferrer">{h.threadsUrl}</Link>
                      ) : (
                        h.errorMsg || '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => void exportPostHistoryCsv(post.id)}>Export CSV</Button>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
