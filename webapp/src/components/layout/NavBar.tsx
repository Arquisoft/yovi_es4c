/**
 * NavBar.tsx — Barra de navegación responsiva
 *
 * Desktop (sm+): links visibles en la barra horizontal.
 * Móvil  (xs)  : hamburger icon → Drawer lateral con todos los links.
 */
import {
  AppBar, Box, Button, Chip, Container, Divider, Drawer,
  IconButton, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Toolbar, Tooltip, Typography,
} from '@mui/material';
import HexagonIcon       from '@mui/icons-material/Hexagon';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import HistoryIcon       from '@mui/icons-material/History';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LoginIcon         from '@mui/icons-material/Login';
import LogoutIcon        from '@mui/icons-material/Logout';
import PersonIcon        from '@mui/icons-material/Person';
import MenuIcon          from '@mui/icons-material/Menu';
import CloseIcon         from '@mui/icons-material/Close';
import { useState }      from 'react';
import type { AppView }  from '../../App';

interface NavBarProps {
  isAuthenticated: boolean;
  username:        string;
  currentView:     AppView;
  onNavigate:      (view: AppView) => void;
  onLoginClick:    () => void;
  onLogout:        () => void;
}

export default function NavBar({
  isAuthenticated,
  username,
  currentView,
  onNavigate,
  onLoginClick,
  onLogout,
}: NavBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navLinks = isAuthenticated
    ? [
        { view: 'game'    as AppView, label: 'Jugar',    icon: <SportsEsportsIcon fontSize="small" /> },
        { view: 'history' as AppView, label: 'Historial', icon: <HistoryIcon       fontSize="small" /> },
        { view: 'profile' as AppView, label: 'Perfil',    icon: <AccountCircleIcon fontSize="small" /> },
      ]
    : [];

  const handleNavigate = (view: AppView) => {
    onNavigate(view);
    setDrawerOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setDrawerOpen(false);
  };

  // ── Drawer (móvil) ─────────────────────────────────────────────────────
  const drawer = (
    <Box
      sx={{
        width: 260,
        height: '100%',
        bgcolor: '#0d1526',
        display: 'flex',
        flexDirection: 'column',
      }}
      role="navigation"
    >
      {/* Cabecera del drawer */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid #00e5ff22' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HexagonIcon sx={{ color: '#00e5ff', fontSize: 22, filter: 'drop-shadow(0 0 4px #00e5ff88)' }} />
          <Typography variant="h6" sx={{ fontFamily: '"Orbitron"', fontWeight: 900, letterSpacing: '0.15em', fontSize: '0.85rem', background: 'linear-gradient(90deg,#00e5ff,#6effff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Y-Game
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => setDrawerOpen(false)} sx={{ color: '#7a9bb5' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Usuario autenticado */}
      {isAuthenticated && (
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #00e5ff15' }}>
          <Chip
            icon={<PersonIcon sx={{ fontSize: '14px !important', color: '#00e5ff !important' }} />}
            label={username}
            size="small"
            sx={{ bgcolor: '#00e5ff11', border: '1px solid #00e5ff33', color: '#00e5ff', fontFamily: '"Rajdhani"', fontWeight: 600 }}
          />
        </Box>
      )}

      {/* Links de navegación */}
      <List sx={{ flex: 1, pt: 1 }}>
        {navLinks.map(({ view, label, icon }) => (
          <ListItem key={view} disablePadding>
            <ListItemButton
              onClick={() => handleNavigate(view)}
              selected={currentView === view}
              sx={{
                mx: 1, borderRadius: 1,
                '&.Mui-selected': { bgcolor: '#00e5ff11', color: '#00e5ff' },
                '&.Mui-selected .MuiListItemIcon-root': { color: '#00e5ff' },
                '&:hover': { bgcolor: '#00e5ff08' },
                color: currentView === view ? '#00e5ff' : '#7a9bb5',
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{icon}</ListItemIcon>
              <ListItemText
                primary={label}
                slotProps={{ primary: { sx: { fontFamily: '"Rajdhani"', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.95rem' } } }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Pie del drawer: login o logout */}
      <Divider sx={{ borderColor: '#00e5ff15' }} />
      <Box sx={{ p: 2 }}>
        {isAuthenticated ? (
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            Cerrar sesión
          </Button>
        ) : (
          <Button
            fullWidth
            variant="outlined"
            startIcon={<LoginIcon />}
            onClick={() => { onLoginClick(); setDrawerOpen(false); }}
          >
            Acceder
          </Button>
        )}
      </Box>
    </Box>
  );

  // ── AppBar ─────────────────────────────────────────────────────────────
  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'linear-gradient(90deg, #060b18 0%, #0d1526 50%, #060b18 100%)',
          borderBottom: '1px solid #00e5ff22',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: 2, minHeight: '64px !important' }}>

            {/* Hamburger — solo en móvil */}
            <IconButton
              size="small"
              onClick={() => setDrawerOpen(true)}
              sx={{ display: { xs: 'flex', sm: 'none' }, color: '#7a9bb5', mr: 0.5 }}
              aria-label="Abrir menú"
            >
              <MenuIcon />
            </IconButton>

            {/* Logo */}
            <Box
              onClick={() => onNavigate('landing')}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                cursor: 'pointer', flexShrink: 0,
                '&:hover .logo-icon': { color: '#6effff', filter: 'drop-shadow(0 0 8px #00e5ff)' },
              }}
            >
              <HexagonIcon
                className="logo-icon"
                sx={{ color: '#00e5ff', fontSize: 28, transition: 'all 0.3s', filter: 'drop-shadow(0 0 4px #00e5ff88)' }}
              />
              <Typography
                variant="h6"
                sx={{
                  fontFamily: '"Orbitron"', fontWeight: 900, letterSpacing: '0.15em',
                  fontSize: { xs: '0.85rem', sm: '1rem' },
                  background: 'linear-gradient(90deg, #00e5ff, #6effff)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  textTransform: 'uppercase',
                }}
              >
                Y-Game
              </Typography>
            </Box>

            {/* Nav links — solo en desktop */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.5, flex: 1, ml: 2 }}>
              {navLinks.map(({ view, label, icon }) => (
                <Button
                  key={view}
                  startIcon={icon}
                  onClick={() => onNavigate(view)}
                  size="small"
                  sx={{
                    color: currentView === view ? '#00e5ff' : '#7a9bb5',
                    borderBottom: currentView === view ? '2px solid #00e5ff' : '2px solid transparent',
                    borderRadius: 0, px: 2, py: 1.5,
                    fontSize: '0.8rem', letterSpacing: '0.1em', transition: 'all 0.2s',
                    '&:hover': { color: '#00e5ff', backgroundColor: '#00e5ff0a' },
                  }}
                >
                  {label}
                </Button>
              ))}
            </Box>

            {/* Spacer en móvil para empujar auth a la derecha */}
            <Box sx={{ flex: 1, display: { xs: 'flex', sm: 'none' } }} />

            {/* Auth area — desktop */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
              {isAuthenticated ? (
                <>
                  <Chip
                    icon={<PersonIcon sx={{ fontSize: '14px !important', color: '#00e5ff !important' }} />}
                    label={username}
                    size="small"
                    sx={{ bgcolor: '#00e5ff11', border: '1px solid #00e5ff33', color: '#00e5ff', fontFamily: '"Rajdhani"', fontWeight: 600, letterSpacing: '0.05em' }}
                  />
                  <Tooltip title="Cerrar sesión">
                    <IconButton
                      onClick={onLogout}
                      size="small"
                      sx={{ color: '#7a9bb5', border: '1px solid #ff3d7122', borderRadius: 1, '&:hover': { color: '#ff3d71', borderColor: '#ff3d71', bgcolor: '#ff3d7111' } }}
                    >
                      <LogoutIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <Button
                  onClick={onLoginClick}
                  startIcon={<LoginIcon />}
                  variant="outlined"
                  size="small"
                  sx={{ borderColor: '#00e5ff44', color: '#00e5ff', fontSize: '0.75rem', letterSpacing: '0.1em', '&:hover': { borderColor: '#00e5ff', bgcolor: '#00e5ff11', boxShadow: '0 0 12px #00e5ff33' } }}
                >
                  Acceder
                </Button>
              )}
            </Box>

            {/* En móvil: solo icono de logout si está autenticado */}
            {isAuthenticated && (
              <Tooltip title="Cerrar sesión">
                <IconButton
                  onClick={onLogout}
                  size="small"
                  sx={{ display: { xs: 'flex', sm: 'none' }, color: '#7a9bb5', border: '1px solid #ff3d7122', borderRadius: 1, '&:hover': { color: '#ff3d71', borderColor: '#ff3d71', bgcolor: '#ff3d7111' } }}
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}

          </Toolbar>
        </Container>
      </AppBar>

      {/* Drawer — móvil */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { bgcolor: '#0d1526', borderRight: '1px solid #00e5ff22' } }}
      >
        {drawer}
      </Drawer>
    </>
  );
}