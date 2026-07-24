import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  Box, Typography, Alert, FormControl, InputLabel, Select, MenuItem,
  LinearProgress, IconButton, Stack,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import { createPost, updatePost, uploadMedia } from '../../services/posts';
import { Post } from '../../types';
import { toLocalDatetimeInput } from '../../utils/formatters';

const schema = z.object({
  caption: z.string().min(1, 'Caption is required').max(500, 'Max 500 characters'),
  scheduledTime: z.string().min(1, 'Publish time is required'),
  timezone: z.string(),
});

type FormData = z.infer<typeof schema>;

const TIMEZONES = [
  'UTC',
  'Asia/Jakarta',
  'Asia/Singapore',
  'Asia/Tokyo',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
];

const MAX_MEDIA = 4;

interface ScheduleFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editPost?: Post | null;
  initialCaption?: string;
  initialScheduledTime?: string;
}

export default function ScheduleForm({
  open, onClose, onSuccess, editPost, initialCaption, initialScheduledTime,
}: ScheduleFormProps) {
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      caption: editPost?.caption || initialCaption || '',
      scheduledTime: toLocalDatetimeInput(editPost?.scheduledTime || initialScheduledTime),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        caption: editPost?.caption || initialCaption || '',
        scheduledTime: toLocalDatetimeInput(editPost?.scheduledTime || initialScheduledTime),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      setMediaUrls(editPost?.mediaUrls || []);
      setPreview(false);
      setError('');
    }
  }, [open, editPost, initialCaption, initialScheduledTime, reset]);

  const caption = watch('caption');
  const scheduledTime = watch('scheduledTime');

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError('');
    const remaining = MAX_MEDIA - mediaUrls.length;
    if (remaining <= 0) {
      setError('Maximum 4 media files per post');
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('File harus PNG, JPEG, GIF atau WebP (<5MB)');
        }
        const result = await uploadMedia(file);
        uploaded.push(result.media_url);
      }
      setMediaUrls((prev) => [...prev, ...uploaded]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } }; message?: string })
        ?.response?.data?.error?.message || (err as Error)?.message;
      setError(msg || 'File harus PNG, JPEG, GIF atau WebP (<5MB)');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      const scheduledIso = new Date(data.scheduledTime).toISOString();
      if (editPost) {
        await updatePost(editPost.id, {
          caption: data.caption,
          scheduledTime: scheduledIso,
          mediaUrls,
        });
      } else {
        await createPost({ caption: data.caption, scheduledTime: scheduledIso, mediaUrls });
      }
      reset();
      setMediaUrls([]);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Failed to save post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editPost ? 'Edit Post' : 'Schedule New Post'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {preview ? (
            <Box sx={{ p: 2, bgcolor: '#f9f9f9', borderRadius: 2, border: '1px solid #e0e0e0' }}>
              <Typography variant="caption" color="text.secondary">Preview</Typography>
              <Typography variant="body1" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{caption}</Typography>
              {mediaUrls.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                  {mediaUrls.map((url) => (
                    <Box
                      key={url}
                      component="img"
                      src={url}
                      alt=""
                      sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 1 }}
                    />
                  ))}
                </Stack>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Publish: {scheduledTime ? new Date(scheduledTime).toLocaleString() : '-'}
              </Typography>
            </Box>
          ) : (
            <>
              <TextField
                {...register('caption')}
                label="Caption"
                multiline
                rows={4}
                fullWidth
                error={!!errors.caption}
                helperText={errors.caption?.message || `${caption?.length || 0}/500`}
                sx={{ mb: 2 }}
              />
              <TextField
                {...register('scheduledTime')}
                label="Publish Time"
                type="datetime-local"
                fullWidth
                InputLabelProps={{ shrink: true }}
                error={!!errors.scheduledTime}
                helperText={errors.scheduledTime?.message}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Timezone</InputLabel>
                <Select {...register('timezone')} label="Timezone" defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                  {TIMEZONES.map((tz) => (
                    <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ mb: 1 }}>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<AttachFileIcon />}
                  disabled={uploading || mediaUrls.length >= MAX_MEDIA}
                >
                  Attach Media ({mediaUrls.length}/{MAX_MEDIA})
                  <input
                    type="file"
                    hidden
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    multiple
                    onChange={(e) => {
                      void handleFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </Button>
                {uploading && <LinearProgress sx={{ mt: 1 }} />}
              </Box>

              {mediaUrls.length > 0 && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {mediaUrls.map((url) => (
                    <Box key={url} sx={{ position: 'relative' }}>
                      <Box
                        component="img"
                        src={url}
                        alt=""
                        sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1, border: '1px solid #ddd' }}
                      />
                      <IconButton
                        size="small"
                        sx={{ position: 'absolute', top: -8, right: -8, bgcolor: '#fff' }}
                        onClick={() => setMediaUrls((prev) => prev.filter((u) => u !== url))}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={() => setPreview(!preview)} variant="outlined">
            {preview ? 'Edit' : 'Preview'}
          </Button>
          <Button type="submit" variant="contained" disabled={loading || preview || uploading}>
            {loading ? 'Saving...' : editPost ? 'Update' : 'Schedule'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
