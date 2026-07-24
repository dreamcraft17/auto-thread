import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  FormControlLabel, Checkbox, CircularProgress,
} from '@mui/material';
import { useAppDispatch } from '../store/hooks';
import { setCredentials } from '../store/slices/authSlice';
import { login } from '../services/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const result = await login(username, password, timezone);
      dispatch(setCredentials({ token: result.token, user: result.user }));
      if (!remember) {
        sessionStorage.setItem('sessionOnly', 'true');
      }
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setError(msg || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f7', p: 2 }}>
      <Card sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom align="center">
            Threads Automation
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Sign in with your Threads account to schedule and auto-publish posts.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Threads Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
              autoComplete="username"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              required
              sx={{ mb: 2 }}
              autoComplete="current-password"
            />
            <FormControlLabel
              control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
              label="Remember me"
              sx={{ mb: 2 }}
            />
            <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
              Your credentials are encrypted and used only for automated posting.
            </Alert>
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
              {loading ? <CircularProgress size={24} /> : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
