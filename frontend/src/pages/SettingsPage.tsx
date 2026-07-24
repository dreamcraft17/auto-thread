import { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, FormControlLabel, Switch, TextField, Button, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Stack,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Layout from '../components/Layout/Layout';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setUser } from '../store/slices/authSlice';
import { getMe, updatePreferences } from '../services/auth';
import { getLivePublishSetting, setLivePublishEnabled } from '../services/settings';
import { getAiUsage, getBrandGuidelines, saveBrandGuidelines } from '../services/ai';
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

  const [brandId, setBrandId] = useState<string | undefined>();
  const [brandName, setBrandName] = useState('DN Tech Default');
  const [voice, setVoice] = useState('');
  const [example, setExample] = useState('');
  const [tonePref, setTonePref] = useState('casual');
  const [hashtags, setHashtags] = useState('#dntech #threads');
  const [brandSaved, setBrandSaved] = useState(false);

  const [usage, setUsage] = useState<{
    totalCaptions: number;
    totalCost: number;
    avgCost: number;
    costByProvider: Array<{ provider: string; captions: number; cost: number }>;
    recommendedProvider: string;
    overBudget: boolean;
    activeProvider: string;
  } | null>(null);

  useEffect(() => {
    getMe().then((u) => {
      dispatch(setUser(u));
      if (u.notificationPreferences) setPrefs(u.notificationPreferences);
    });
    getLivePublishSetting()
      .then((s) => setLiveEnabled(Boolean(s.value)))
      .catch(() => setLiveEnabled(false));
    getBrandGuidelines()
      .then((rows) => {
        const active = rows.find((r) => r.isActive) || rows[0];
        if (active) {
          setBrandId(active.id);
          setBrandName(active.name || 'DN Tech');
          setVoice(active.voiceDescription || '');
          setExample(active.exampleCaption || '');
          setTonePref(active.tonePreference || 'casual');
          setHashtags(active.hashtagDefaults || '');
        }
      })
      .catch(() => undefined);
    getAiUsage()
      .then(setUsage)
      .catch(() => setUsage(null));
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

  const handleSaveBrand = async () => {
    setLoading(true);
    try {
      const row = await saveBrandGuidelines({
        id: brandId,
        name: brandName,
        voiceDescription: voice,
        exampleCaption: example,
        tonePreference: tonePref,
        hashtagDefaults: hashtags,
        isActive: true,
      });
      setBrandId(row.id);
      setBrandSaved(true);
      setTimeout(() => setBrandSaved(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setLiveError(msg || 'Failed to save brand guidelines');
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
      {brandSaved && <Alert severity="success" sx={{ mb: 2 }}>Brand guidelines saved!</Alert>}
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
          <Typography variant="h6" gutterBottom>Brand Guidelines (AI)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Prompt AI captions to match DN Tech voice.
          </Typography>
          <TextField label="Name" fullWidth size="small" value={brandName} onChange={(e) => setBrandName(e.target.value)} sx={{ mb: 2 }} />
          <TextField
            label="Brand voice"
            fullWidth
            multiline
            rows={3}
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Example caption"
            fullWidth
            multiline
            rows={2}
            value={example}
            onChange={(e) => setExample(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField label="Tone preference" size="small" fullWidth value={tonePref} onChange={(e) => setTonePref(e.target.value)} />
            <TextField label="Default hashtags" size="small" fullWidth value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
          </Stack>
          <Button variant="contained" onClick={() => void handleSaveBrand()} disabled={loading}>
            Save Brand Guidelines
          </Button>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>AI Usage & Cost</Typography>
          {!usage ? (
            <Typography variant="body2" color="text.secondary">No usage data yet (generate a caption first).</Typography>
          ) : (
            <>
              {usage.overBudget && (
                <Alert severity="warning" sx={{ mb: 2 }}>Monthly AI budget exceeded.</Alert>
              )}
              <Typography variant="body2">Active provider: <strong>{usage.activeProvider}</strong></Typography>
              <Typography variant="body2">Captions this month: <strong>{usage.totalCaptions}</strong></Typography>
              <Typography variant="body2">Total cost: <strong>${usage.totalCost.toFixed(4)}</strong></Typography>
              <Typography variant="body2">Avg / caption: <strong>${usage.avgCost.toFixed(4)}</strong></Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Recommended (cheapest avg): <strong>{usage.recommendedProvider}</strong>
              </Typography>
              <Stack spacing={0.5}>
                {usage.costByProvider.map((p) => (
                  <Typography key={p.provider} variant="caption">
                    {p.provider}: {p.captions} captions · ${p.cost.toFixed(4)}
                  </Typography>
                ))}
              </Stack>
            </>
          )}
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
