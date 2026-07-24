import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Button, Grid, Paper, TextField, InputAdornment,
  Pagination, CircularProgress, Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SearchIcon from '@mui/icons-material/Search';
import Layout from '../components/Layout/Layout';
import PostCard from '../components/PostCard/PostCard';
import ScheduleForm from '../components/ScheduleForm/ScheduleForm';
import ImportDialog from '../components/ImportDialog/ImportDialog';
import GenerateCaptionModal from '../components/GenerateCaptionModal/GenerateCaptionModal';
import BatchGenerateDialog from '../components/BatchGenerateDialog/BatchGenerateDialog';
import { useAppSelector } from '../store/hooks';
import {
  getScheduledPosts, getPublishedPosts, getFailedPosts, getStats,
  deletePost, retryPost,
} from '../services/posts';
import { Post, DashboardStats } from '../types';

export default function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [scheduled, setScheduled] = useState<Post[]>([]);
  const [published, setPublished] = useState<Post[]>([]);
  const [failed, setFailed] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [aiCaption, setAiCaption] = useState<string | undefined>();
  const [aiSchedule, setAiSchedule] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, scheduledData, publishedData, failedData] = await Promise.all([
        getStats(),
        getScheduledPosts(10, (page - 1) * 10),
        getPublishedPosts(10),
        getFailedPosts(10),
      ]);
      setStats(statsData);
      setScheduled(scheduledData.posts);
      setPublished(publishedData.posts);
      setFailed(failedData.posts);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const filteredScheduled = search
    ? scheduled.filter((p) => p.caption.toLowerCase().includes(search.toLowerCase()))
    : scheduled;

  const handleDelete = async (post: Post) => {
    if (!confirm('Cancel this scheduled post?')) return;
    await deletePost(post.id);
    loadData();
  };

  const handleRetry = async (post: Post) => {
    await retryPost(post.id);
    loadData();
  };

  const handleEdit = (post: Post) => {
    setEditPost(post);
    setScheduleOpen(true);
  };

  if (loading && !stats) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight={700}>Dashboard</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => setGenerateOpen(true)}
          >
            Generate Caption
          </Button>
          <Button variant="outlined" startIcon={<AutoAwesomeIcon />} onClick={() => setBatchOpen(true)}>
            Batch Generate
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditPost(null); setAiCaption(undefined); setAiSchedule(undefined); setScheduleOpen(true); }}>
            Schedule Post
          </Button>
          <Button variant="outlined" startIcon={<UploadFileIcon />} onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
        </Stack>
      </Box>

      {stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {[
            { label: 'Total Posts', value: stats.totalPosts },
            { label: 'Published Today', value: stats.publishedToday },
            { label: 'Scheduled', value: stats.scheduledCount },
            { label: 'Failed', value: stats.failedCount },
            { label: 'This Week', value: stats.postsThisWeek },
            { label: 'Success Rate', value: `${stats.publishRate}%` },
          ].map((s) => (
            <Grid item xs={6} sm={4} md={2} key={s.label}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <TextField
        placeholder="Search by caption..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        sx={{ mb: 3, maxWidth: 400 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
      />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
            Upcoming ({filteredScheduled.length})
          </Typography>
          {filteredScheduled.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No scheduled posts</Typography>
          ) : (
            filteredScheduled.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                timezone={user?.timezone}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
            Recently Published ({published.length})
          </Typography>
          {published.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No published posts yet</Typography>
          ) : (
            published.map((post) => (
              <PostCard key={post.id} post={post} timezone={user?.timezone} />
            ))
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>
            Failed ({failed.length})
          </Typography>
          {failed.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No failed posts</Typography>
          ) : (
            failed.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                timezone={user?.timezone}
                onRetry={handleRetry}
                onDelete={handleDelete}
              />
            ))
          )}
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Pagination count={5} page={page} onChange={(_, p) => setPage(p)} />
      </Box>

      <ScheduleForm
        open={scheduleOpen}
        onClose={() => { setScheduleOpen(false); setEditPost(null); setAiCaption(undefined); setAiSchedule(undefined); }}
        onSuccess={loadData}
        editPost={editPost}
        initialCaption={aiCaption}
        initialScheduledTime={aiSchedule}
      />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} onSuccess={loadData} />
      <GenerateCaptionModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onUseCaption={(caption, scheduledTime) => {
          setEditPost(null);
          setAiCaption(caption);
          setAiSchedule(scheduledTime);
          setScheduleOpen(true);
        }}
        onScheduled={loadData}
      />
      <BatchGenerateDialog open={batchOpen} onClose={() => setBatchOpen(false)} onDone={loadData} />
    </Layout>
  );
}
