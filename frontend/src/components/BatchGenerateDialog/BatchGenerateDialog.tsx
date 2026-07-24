import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  Box, Typography, Alert, CircularProgress, Chip, Stack, LinearProgress,
} from '@mui/material';
import { batchGenerate, approveAndSchedule, GeneratedCaption } from '../../services/ai';

interface Props {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}

export default function BatchGenerateDialog({ open, onClose, onDone }: Props) {
  const [topicsText, setTopicsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<GeneratedCaption[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const handleGenerate = async () => {
    const topics = topicsText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!topics.length) {
      setError('Enter at least one topic (one per line)');
      return;
    }
    if (topics.length > 10) {
      setError('Max 10 topics per batch');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await batchGenerate(topics);
      setResults(data.results);
      setSlots(data.suggestedSlots || []);
      const sel: Record<string, boolean> = {};
      data.results.forEach((r) => {
        if (r.ok && r.id) sel[r.id] = true;
      });
      setSelected(sel);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Batch generation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleAll = async () => {
    const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
    if (!ids.length) return;
    setScheduling(true);
    setError('');
    try {
      let okCount = 0;
      for (let i = 0; i < ids.length; i++) {
        await approveAndSchedule(ids[i], slots[i]);
        okCount++;
      }
      alert(`${okCount} posts scheduled (staggered Mon–Fri style slots).`);
      setResults([]);
      setTopicsText('');
      onDone();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Failed to schedule some posts');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Batch Generate Captions</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          One topic per line (max 10). Approve selected → schedule with staggered times.
        </Typography>
        <TextField
          value={topicsText}
          onChange={(e) => setTopicsText(e.target.value)}
          fullWidth
          multiline
          rows={6}
          placeholder={"Product launch tips\nEngineering challenges\nCulture snapshot"}
        />
        {(loading || scheduling) && <LinearProgress sx={{ mt: 2 }} />}

        {results.length > 0 && (
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {results.map((r, idx) => (
              <Box key={r.id || idx} sx={{ p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Chip label={r.ok ? 'OK' : 'Fail'} color={r.ok ? 'success' : 'error'} size="small" />
                  <Typography variant="caption" color="text.secondary">{r.topic}</Typography>
                  {r.ok && slots[idx] && (
                    <Typography variant="caption">→ {new Date(slots[idx]).toLocaleString()}</Typography>
                  )}
                </Stack>
                {r.ok ? (
                  <>
                    <Typography variant="body2">{r.caption}</Typography>
                    <Button
                      size="small"
                      sx={{ mt: 0.5 }}
                      onClick={() => setSelected((s) => ({ ...s, [r.id]: !s[r.id] }))}
                    >
                      {selected[r.id] ? '✓ Selected' : 'Select'}
                    </Button>
                  </>
                ) : (
                  <Typography color="error" variant="body2">{r.error}</Typography>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button onClick={() => void handleGenerate()} disabled={loading} variant="outlined">
          {loading ? <CircularProgress size={18} /> : 'Generate All'}
        </Button>
        <Button
          onClick={() => void handleScheduleAll()}
          disabled={scheduling || !Object.values(selected).some(Boolean)}
          variant="contained"
        >
          Schedule Selected
        </Button>
      </DialogActions>
    </Dialog>
  );
}
