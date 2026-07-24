import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Box, IconButton, Badge,
  Menu, MenuItem, Divider, Container,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout as logoutAction } from '../../store/slices/authSlice';
import { logout } from '../../services/auth';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../services/posts';
import { Notification } from '../../types';
import { formatRelative } from '../../utils/formatters';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const handleOpenNotifications = async (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
    const data = await getNotifications();
    setNotifications(data);
  };

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    dispatch(logoutAction());
    navigate('/login');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f7' }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: '#fff', color: '#1a1a1a', borderBottom: '1px solid #e0e0e0' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700, flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>
            Threads Automation
          </Typography>
          <IconButton onClick={handleOpenNotifications} sx={{ mr: 1 }}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Button startIcon={<SettingsIcon />} onClick={() => navigate('/settings')} sx={{ mr: 1 }}>
            Settings
          </Button>
          <Typography variant="body2" sx={{ mr: 2, color: 'text.secondary' }}>
            @{user?.username}
          </Typography>
          <Button startIcon={<LogoutIcon />} onClick={handleLogout} color="inherit">
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { width: 360, maxHeight: 400 } }}>
        <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600}>Notifications</Typography>
          <Button size="small" onClick={async () => { await markAllNotificationsRead(); setNotifications((n) => n.map((x) => ({ ...x, read: true }))); }}>
            Mark all read
          </Button>
        </Box>
        <Divider />
        {notifications.length === 0 ? (
          <MenuItem disabled>No notifications</MenuItem>
        ) : (
          notifications.map((n) => (
            <MenuItem key={n.id} onClick={async () => { await markNotificationRead(n.id); setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x)); }} sx={{ whiteSpace: 'normal', opacity: n.read ? 0.6 : 1 }}>
              <Box>
                <Typography variant="body2" fontWeight={n.read ? 400 : 600}>{n.title}</Typography>
                <Typography variant="caption" color="text.secondary">{n.message}</Typography>
                <Typography variant="caption" display="block" color="text.secondary">{formatRelative(n.createdAt)}</Typography>
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
