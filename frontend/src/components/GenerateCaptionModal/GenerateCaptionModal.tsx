import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button,
  Box, Typography, Alert, MenuItem, CircularProgress, Chip, Stack, FormControl, InputLabel, Select,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { approveAndSchedule, approveCaption, generateCaption, GeneratedCaption, getBestTime } from '../../services/ai';
import { toLocalDatetimeInput } from '../../utils/formatters';

interface Props {
  open: boolean;
  onClose: () => void;
  onUseCaption: (caption: string, scheduledTime?: string) => void;
  onScheduled?: () => void;
}

export default function GenerateCaptionModal({ open, onClose, onUseCaption, onScheduled }: Props) {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('casual');
  const [length, setLength] = useState('medium');
  const [result, setResult] = useState<GeneratedCaption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [regenLeft, setRegenLeft] = useState(3);
  const [bestTime, setBestTime] = useState<string>('');
  const [bestIso, setBestIso] = useState<string>('');
  const [checklist, setChecklist] = useState({ brand: false, grammar: false, relevant: false });

  const reset = () => {
    setResult(null);
    setError('');
    setBestTime('');
    setBestIso('');
    setChecklist({ brand: false, grammar: false, relevant: false });
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await generateCaption(topic, tone, length);
      setResult(data);
      if (regenLeft < 3) setRegenLeft((n) => Math.max(0, n - 1));
      const bt = await getBestTime();
      setBestTime(bt.suggestion);
      setBestIso(bt.suggestedAt || '');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Generation failed. Try again or write manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (regenLeft <= 0) return;
    setRegenLeft((n) => n - 1);
    await handleGenerate();
  };

  const handleUse = () => {
    if (!result) return;
    onUseCaption(result.caption, bestIso || undefined);
    reset();
    onClose();
  };

  const handleApproveSchedule = async () => {
    if (!result) return;
    setLoading(true);
    try {
      await approveCaption(result.id);
      await approveAndSchedule(result.id, bestIso || undefined);
      onScheduled?.();
      reset();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Failed to schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => { reset(); onClose(); }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesomeIcon color="primary" /> Generate Caption
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. Shipped new feature that saves 2 hours/day"
          fullWidth
          multiline
          rows={2}
          sx={{ mt: 1, mb: 2 }}
        />

        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Tone</InputLabel>
            <Select label="Tone" value={tone} onChange={(e) => setTone(e.target.value)}>
              <MenuItem value="casual">Casual</MenuItem>
              <MenuItem value="professional">Professional</MenuItem>
              <MenuItem value="DN-culture">DN-culture</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Length</InputLabel>
            <Select label="Length" value={length} onChange={(e) => setLength(e.target.value)}>
              <MenuItem value="short">Short</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Button
          variant="contained"
          onClick={() => void handleGenerate()}
          disabled={!topic.trim() || loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
        >
          {loading ? 'Generating…' : 'Generate'}
        </Button>

        {result && (
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f7ff', borderRadius: 2, border: '1px solid #d6e0ff' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Chip label="Generated" color="primary" size="small" />
              <Chip label={result.provider} size="small" variant="outlined" />
              <Typography variant="caption">{result.characterCount}/500</Typography>
            </Stack>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>{result.caption}</Typography>

            {result.validation?.warnings?.length > 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                {result.validation.warnings.join(' · ')}
              </Alert>
            )}

            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Brand fit: {result.validation?.brandFitScore}/5
              {bestTime ? ` · 💡 Best time: ${bestTime}` : ''}
              {bestIso ? ` (${toLocalDatetimeInput(bestIso).replace('T', ' ')})` : ''}
            </Typography>

            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">Quick check (optional)</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                {([
                  ['brand', 'Sounds like DN Tech'],
                  ['grammar', 'No typos'],
                  ['relevant', 'Relevant'],
                ] as const).map(([key, label]) => (
                  <Chip
                    key={key}
                    label={label}
                    size="small"
                    color={checklist[key] ? 'success' : 'default'}
                    onClick={() => setChecklist((c) => ({ ...c, [key]: !c[key] }))}
                    variant={checklist[key] ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>
            </Box>

            <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
              <Button variant="contained" size="small" onClick={handleUse}>Use Caption</Button>
              <Button variant="outlined" size="small" onClick={() => void handleApproveSchedule()} disabled={loading}>
                Approve & Schedule
              </Button>
              <Button size="small" onClick={() => void handleRegenerate()} disabled={regenLeft <= 0 || loading}>
                Regenerate ({regenLeft})
              </Button>
              <Button size="small" color="inherit" onClick={reset}>Discard</Button>
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { reset(); onClose(); }}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
