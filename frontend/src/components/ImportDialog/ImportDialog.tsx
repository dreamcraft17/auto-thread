import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert, Typography, Box, List, ListItem, ListItemText,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { importPosts } from '../../services/posts';
import { ImportResult } from '../../types';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportDialog({ open, onClose, onSuccess }: ImportDialogProps) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await importPosts(file);
      setResult(res);
      if (res.imported > 0) onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Posts from CSV</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          CSV format: caption, date (YYYY-MM-DD), time (HH:MM), timezone (optional)
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {result ? (
          <Box>
            {result.rolledBack ? (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Import rolled back: more than 10% of rows had errors.
              </Alert>
            ) : (
              <Alert severity={result.failed > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
                Imported {result.imported} posts. {result.failed} failed.
              </Alert>
            )}
            {result.errors.length > 0 && (
              <List dense>
                {result.errors.slice(0, 10).map((e, i) => (
                  <ListItem key={i}>
                    <ListItemText
                      primary={`Row ${e.row}: ${e.error}`}
                      secondary={e.caption}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        ) : (
          <Button
            component="label"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            disabled={loading}
            fullWidth
            sx={{ py: 3 }}
          >
            {loading ? 'Importing...' : 'Choose CSV File'}
            <input type="file" accept=".csv" hidden onChange={handleFile} />
          </Button>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
