import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  Box, Typography, Alert, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { createPost, updatePost } from '../../services/posts';
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

interface ScheduleFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editPost?: Post | null;
}

export default function ScheduleForm({ open, onClose, onSuccess, editPost }: ScheduleFormProps) {
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      caption: editPost?.caption || '',
      scheduledTime: toLocalDatetimeInput(editPost?.scheduledTime),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const caption = watch('caption');
  const scheduledTime = watch('scheduledTime');

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      const scheduledIso = new Date(data.scheduledTime).toISOString();
      if (editPost) {
        await updatePost(editPost.id, { caption: data.caption, scheduledTime: scheduledIso });
      } else {
        await createPost({ caption: data.caption, scheduledTime: scheduledIso });
      }
      reset();
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
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select {...register('timezone')} label="Timezone" defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                  {TIMEZONES.map((tz) => (
                    <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={() => setPreview(!preview)} variant="outlined">
            {preview ? 'Edit' : 'Preview'}
          </Button>
          <Button type="submit" variant="contained" disabled={loading || preview}>
            {loading ? 'Saving...' : editPost ? 'Update' : 'Schedule'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
