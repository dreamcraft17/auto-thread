import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, FormControlLabel, Switch, TextField, Button, Alert,
} from '@mui/material';
import Layout from '../components/Layout/Layout';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setUser } from '../store/slices/authSlice';
import { getMe, updatePreferences } from '../services/auth';
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

  useEffect(() => {
    getMe().then((u) => {
      dispatch(setUser(u));
      if (u.notificationPreferences) setPrefs(u.notificationPreferences);
    });
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

  return (
    <Layout>
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>Settings</Typography>

      {saved && <Alert severity="success" sx={{ mb: 2 }}>Preferences saved!</Alert>}

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
    </Layout>
  );
}
