import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, FormControlLabel, Switch, TextField, Button, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Layout from '../components/Layout/Layout';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setUser } from '../store/slices/authSlice';
import { getMe, updatePreferences } from '../services/auth';
import { getLivePublishSetting, setLivePublishEnabled } from '../services/settings';
import { NotificationPreferences } from '../types';

export default function SettingsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    emailOnSuccess: true,
    emailOnFailure: true,
    dailySummary: false,
    dailySummaryTime: '09:00',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingLive, setPendingLive] = useState(false);
  const [liveError, setLiveError] = useState('');

  useEffect(() => {
    getMe().then((u) => {
      dispatch(setUser(u));
      if (u.notificationPreferences) setPrefs(u.notificationPreferences);
    });
    getLivePublishSetting()
      .then((s) => setLiveEnabled(Boolean(s.value)))
      .catch(() => setLiveEnabled(false));
  }, [dispatch]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updatePreferences(prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const requestToggle = (next: boolean) => {
    setLiveError('');
    if (next) {
      setPendingLive(true);
      setConfirmOpen(true);
      return;
    }
    void applyLive(false);
  };

  const applyLive = async (value: boolean) => {
    setLoading(true);
    try {
      const updated = await setLivePublishEnabled(value);
      setLiveEnabled(Boolean(updated.value));
      setConfirmOpen(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setLiveError(msg || 'Failed to update live publish setting');
      setConfirmOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>Settings</Typography>

      {saved && <Alert severity="success" sx={{ mb: 2 }}>Preferences saved!</Alert>}
      {liveError && <Alert severity="error" sx={{ mb: 2 }}>{liveError}</Alert>}

      <Card sx={{ mb: 3, border: liveEnabled ? '2px solid #d32f2f' : undefined }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="h6">Publish Mode</Typography>
            {liveEnabled ? (
              <Chip icon={<WarningAmberIcon />} label="LIVE" color="error" size="small" />
            ) : (
              <Chip label="DRY-RUN" color="default" size="small" />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Default is dry-run (safe). Enabling live mode sends real posts to Threads.
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={liveEnabled}
                color="error"
                onChange={(e) => requestToggle(e.target.checked)}
                disabled={loading}
              />
            }
            label={liveEnabled ? '🔴 Live publish enabled' : 'Live publish (off)'}
          />
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Account</Typography>
          <Typography variant="body2" color="text.secondary">Username: @{user?.username}</Typography>
          <Typography variant="body2" color="text.secondary">Timezone: {user?.timezone}</Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Notification Preferences</Typography>

          <FormControlLabel
            control={<Switch checked={prefs.emailOnSuccess ?? true} onChange={(e) => setPrefs({ ...prefs, emailOnSuccess: e.target.checked })} />}
            label="Email on successful publish"
            sx={{ display: 'block', mb: 1 }}
          />
          <FormControlLabel
            control={<Switch checked={prefs.emailOnFailure ?? true} onChange={(e) => setPrefs({ ...prefs, emailOnFailure: e.target.checked })} />}
            label="Email on final failure"
            sx={{ display: 'block', mb: 1 }}
          />
          <FormControlLabel
            control={<Switch checked={prefs.dailySummary ?? false} onChange={(e) => setPrefs({ ...prefs, dailySummary: e.target.checked })} />}
            label="Daily summary email"
            sx={{ display: 'block', mb: 2 }}
          />

          {prefs.dailySummary && (
            <TextField
              label="Summary time (HH:MM)"
              value={prefs.dailySummaryTime || '09:00'}
              onChange={(e) => setPrefs({ ...prefs, dailySummaryTime: e.target.value })}
              size="small"
              sx={{ mb: 2 }}
            />
          )}

          <Box>
            <Button variant="contained" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Preferences'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Enable live publish?</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 1 }}>
            Publishing akan mengirim konten NYATA ke Threads. Baca runbook terlebih dahulu.
          </Alert>
          <Typography variant="body2">
            Pastikan credentials benar dan dry-run sudah diverifikasi sebelum mengaktifkan.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => applyLive(pendingLive)} disabled={loading}>
            OK — Enable Live
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
