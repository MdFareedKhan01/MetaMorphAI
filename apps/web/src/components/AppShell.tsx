import { useEffect, useState } from 'react';
import { Link as RouterLink, Outlet, matchPath, useLocation, useNavigate } from 'react-router';
import {
  AppBar, Avatar, Box, Button, Chip, Divider, Drawer, IconButton, LinearProgress, List, ListItemButton,
  ListItemIcon, ListItemText, Menu, MenuItem, Stack, Toolbar, Tooltip, Typography,
} from '@mui/material';
import MenuRounded from '@mui/icons-material/MenuRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import AddCircleOutlineRounded from '@mui/icons-material/AddCircleOutlineRounded';
import CollectionsOutlined from '@mui/icons-material/CollectionsOutlined';
import LoginRounded from '@mui/icons-material/LoginRounded';
import PersonAddAltRounded from '@mui/icons-material/PersonAddAltRounded';
import { setToken } from '../api';
import { useActiveBatch } from '../activity';
import { useRequestsInFlight, useSession } from '../session';

const TITLES: [string, string][] = [
  ['/login', 'Sign in'], ['/signup', 'Create account'], ['/sources/:id', 'Confirm source'],
  ['/batches/:id', 'Workspace'], ['/gallery', 'Gallery'], ['/', 'New source'],
];

function Brand({ to, onClick }: { to: string; onClick?: () => void }) {
  return (
    <Box component={RouterLink} to={to} onClick={onClick} aria-label="MetaMorph-AI home"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25, textDecoration: 'none', color: 'text.primary', mr: 2 }}>
      <Box aria-hidden sx={{ width: 32, height: 32, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff',
        fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700, background: 'linear-gradient(135deg,#0f766e,#14b8a6)' }}>M</Box>
      <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700, fontSize: 16, letterSpacing: '.01em' }}>
        MetaMorph<Box component="span" sx={{ color: 'primary.main' }}>-AI</Box>
      </Typography>
    </Box>
  );
}

export default function AppShell() {
  const where = useLocation();
  const navigate = useNavigate();
  const { user } = useSession();
  const busy = useRequestsInFlight();
  const batch = useActiveBatch();
  const [drawer, setDrawer] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  // Route-aware page title, and a closed drawer after every navigation.
  useEffect(() => {
    const hit = TITLES.find(([p]) => matchPath({ path: p, end: true }, where.pathname));
    document.title = hit ? `${hit[1]} · MetaMorph-AI` : 'MetaMorph-AI';
    setDrawer(false);
  }, [where.pathname]);

  const nav = user
    ? [{ to: '/', label: 'New source', icon: <AddCircleOutlineRounded /> }, { to: '/gallery', label: 'Gallery', icon: <CollectionsOutlined /> }]
    : [{ to: '/login', label: 'Sign in', icon: <LoginRounded /> }, { to: '/signup', label: 'Create account', icon: <PersonAddAltRounded /> }];
  const current = (to: string) => where.pathname === to;

  function signOut() {
    setAnchor(null); setDrawer(false);
    setToken(null);
    navigate('/login');
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box component="a" href="#main" sx={{ position: 'absolute', left: -9999, '&:focus': { left: 8, top: 8, zIndex: 2000, bgcolor: 'background.paper', p: 1.5, borderRadius: 2 } }}>
        Skip to content
      </Box>
      <AppBar position="sticky" color="inherit" elevation={0}
        sx={{ bgcolor: 'rgba(255,255,255,.92)', backdropFilter: 'blur(14px)', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1, minHeight: { xs: 60, md: 66 }, maxWidth: 1560, width: '100%', mx: 'auto', px: { xs: 2, sm: 3 } }}>
          <IconButton edge="start" aria-label="Open navigation" onClick={() => setDrawer(true)} sx={{ display: { md: 'none' } }}>
            <MenuRounded />
          </IconButton>
          <Brand to={user ? '/' : '/login'} />

          <Stack component="nav" aria-label="Main navigation" direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1 }}>
            {nav.map((n) => (
              <Button key={n.to} component={RouterLink} to={n.to} color="inherit" startIcon={n.icon} aria-current={current(n.to) ? 'page' : undefined}
                sx={{ color: current(n.to) ? 'primary.main' : 'text.secondary', bgcolor: current(n.to) ? 'rgba(15,118,110,.08)' : 'transparent' }}>
                {n.label}
              </Button>
            ))}
          </Stack>
          <Box sx={{ flexGrow: { xs: 1, md: 0 } }} />

          {batch && (
            <Tooltip title="Open the batch that is generating">
              <Chip component={RouterLink} to={`/batches/${batch.batchId}`} clickable size="small"
                color={batch.overall === 'running' || batch.overall === 'queued' ? 'primary' : 'default'}
                variant={batch.overall === 'running' || batch.overall === 'queued' ? 'filled' : 'outlined'}
                label={`${batch.ready}/${batch.total} ready`} sx={{ display: { xs: 'none', sm: 'inline-flex' } }} />
            </Tooltip>
          )}
          {user && (
            <>
              <Chip size="small" variant="outlined" label={user.role} sx={{ textTransform: 'capitalize', display: { xs: 'none', sm: 'inline-flex' } }} />
              <Tooltip title={user.name}>
                <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label={`Account menu for ${user.name}`}
                  aria-haspopup="menu" aria-expanded={anchor ? true : undefined}>
                  <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>{user.name.slice(0, 1).toUpperCase()}</Avatar>
                </IconButton>
              </Tooltip>
              <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { minWidth: 220, mt: 1 } } }}>
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="caption" color="text.secondary">Signed in as</Typography>
                  <Typography noWrap sx={{ fontWeight: 600 }}>{user.name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{user.role}</Typography>
                </Box>
                <Divider />
                <MenuItem onClick={signOut}><ListItemIcon><LogoutRounded fontSize="small" /></ListItemIcon>Sign out</MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
        {busy && <LinearProgress aria-label="Loading" sx={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2 }} />}
      </AppBar>

      <Drawer anchor="left" open={drawer} onClose={() => setDrawer(false)} slotProps={{ paper: { sx: { width: 280 } } }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
          <Brand to={user ? '/' : '/login'} onClick={() => setDrawer(false)} />
          <IconButton aria-label="Close navigation" onClick={() => setDrawer(false)}><CloseRounded /></IconButton>
        </Stack>
        <Divider />
        <List component="nav" aria-label="Main navigation" sx={{ p: 1 }}>
          {nav.map((n) => (
            <ListItemButton key={n.to} component={RouterLink} to={n.to} selected={current(n.to)} sx={{ borderRadius: 2, minHeight: 48 }}>
              <ListItemIcon sx={{ minWidth: 40 }}>{n.icon}</ListItemIcon><ListItemText primary={n.label} />
            </ListItemButton>
          ))}
          {batch && (
            <ListItemButton component={RouterLink} to={`/batches/${batch.batchId}`} sx={{ borderRadius: 2, minHeight: 48 }}>
              <ListItemText primary="Current batch" secondary={`${batch.ready}/${batch.total} ready`} />
            </ListItemButton>
          )}
          {user && (
            <ListItemButton onClick={signOut} sx={{ borderRadius: 2, minHeight: 48 }}>
              <ListItemIcon sx={{ minWidth: 40 }}><LogoutRounded /></ListItemIcon><ListItemText primary="Sign out" secondary={`${user.name} · ${user.role}`} />
            </ListItemButton>
          )}
        </List>
      </Drawer>

      <Box id="main" tabIndex={-1} sx={{ flexGrow: 1, outline: 'none' }}><Outlet /></Box>
    </Box>
  );
}
