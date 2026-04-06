import { useState } from 'react';
import {
  AppBar, Box, Button, Chip, Container, Divider, Drawer,
  IconButton, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Toolbar, Tooltip, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import HexagonIcon        from '@mui/icons-material/Hexagon';
import SportsEsportsIcon  from '@mui/icons-material/SportsEsports';
import HistoryIcon        from '@mui/icons-material/History';
import LeaderboardIcon    from '@mui/icons-material/Leaderboard';
import LoginIcon          from '@mui/icons-material/Login';
import LogoutIcon         from '@mui/icons-material/Logout';
import PersonIcon         from '@mui/icons-material/Person';
import AccountCircleIcon  from '@mui/icons-material/AccountCircle';
import MenuIcon           from '@mui/icons-material/Menu';
import CloseIcon          from '@mui/icons-material/Close';
import type { AppView } from '../../App';

interface NavBarProps {
  isAuthenticated: boolean;
  username: string;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onLoginClick: () => void;
  onLogout: () => void;
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navLinks = isAuthenticated
    ? [
        { view: 'game'        as AppView, label: 'Jugar',    icon: <SportsEsportsIcon fontSize="small" /> },
        { view: 'history'     as AppView, label: 'Historial', icon: <HistoryIcon fontSize="small" /> },
        { view: 'profile'     as AppView, label: 'Perfil',    icon: <AccountCircleIcon fontSize="small" /> },
        { view: 'leaderboard' as AppView, label: 'Ranking',   icon: <LeaderboardIcon fontSize="small" /> },
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

  const Logo = () => (
    <Box
      onClick={() => handleNavigate('landing')}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        cursor: 'pointer', flexShrink: 0,
        '&:hover .logo-icon': { color: '#6effff', filter: 'drop-shadow(0 0 8px #00e5ff)' },
      }}
    >
      <HexagonIcon
        className="logo-icon"
        sx={{ color: '#00e5ff', fontSize: 28, transition: 'all 0.3s ease', filter: 'drop-shadow(0 0 4px #00e5ff88)' }}
      />
      <Typography
        variant="h6"
        sx={{
          fontFamily: '"Orbitron", sans-serif', fontWeight: 900,
          letterSpacing: '0.15em', fontSize: { xs: '0.85rem', sm: '1rem' },
          background: 'linear-gradient(90deg, #00e5ff, #6effff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          textTransform: 'uppercase',
        }}
      >
        Y-Game
      </Typography>
    </Box>
  );

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

            <Logo />

            {/* Desktop nav links */}
            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 0.5, flex: 1, ml: 2 }}>
                {navLinks.map(({ view, label, icon }) => (
                  <Button
                    key={view}
                    startIcon={icon}
                    onClick={() => handleNavigate(view)}
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
            )}

            {/* Spacer en móvil */}
            {isMobile && <Box sx={{ flex: 1 }} />}

            {/* Desktop auth area */}
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
                {isAuthenticated ? (
                  <>
                    <Chip
                      icon={<PersonIcon sx={{ fontSize: '14px !important', color: '#00e5ff !important' }} />}
                      label={username}
                      size="small"
                      sx={{
                        backgroundColor: '#00e5ff11', border: '1px solid #00e5ff33',
                        color: '#00e5ff', fontFamily: '"Rajdhani", sans-serif',
                        fontWeight: 600, letterSpacing: '0.05em',
                      }}
                    />
                    <Tooltip title="Cerrar sesión">
                      <IconButton
                        onClick={onLogout}
                        size="small"
                        data-testid="btn-logout"
                        sx={{
                          color: '#7a9bb5', border: '1px solid #ff3d7122', borderRadius: 1,
                          '&:hover': { color: '#ff3d71', borderColor: '#ff3d71', backgroundColor: '#ff3d7111' },
                        }}
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
                    sx={{
                      borderColor: '#00e5ff44', color: '#00e5ff',
                      fontSize: '0.75rem', letterSpacing: '0.1em',
                      '&:hover': { borderColor: '#00e5ff', backgroundColor: '#00e5ff11', boxShadow: '0 0 12px #00e5ff33' },
                    }}
                  >
                    Acceder
                  </Button>
                )}
              </Box>
            )}

            {/* Mobile hamburger */}
            {isMobile && (
              <IconButton
                onClick={() => setDrawerOpen(true)}
                sx={{ color: '#00e5ff', border: '1px solid #00e5ff33', borderRadius: 1 }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            background: 'linear-gradient(180deg, #0d1526 0%, #060b18 100%)',
            borderLeft: '1px solid #00e5ff22',
          },
        }}
      >
        {/* Drawer header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
          <Logo />
          <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: '#7a9bb5' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: '#00e5ff22' }} />

        {/* Usuario autenticado */}
        {isAuthenticated && (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Chip
              icon={<PersonIcon sx={{ fontSize: '14px !important', color: '#00e5ff !important' }} />}
              label={username}
              size="small"
              sx={{
                backgroundColor: '#00e5ff11', border: '1px solid #00e5ff33',
                color: '#00e5ff', fontFamily: '"Rajdhani", sans-serif',
                fontWeight: 600, letterSpacing: '0.05em', width: '100%',
                justifyContent: 'flex-start',
              }}
            />
          </Box>
        )}

        {/* Nav links */}
        <List sx={{ flex: 1, pt: 0 }}>
          {navLinks.map(({ view, label, icon }) => (
            <ListItem key={view} disablePadding>
              <ListItemButton
                onClick={() => handleNavigate(view)}
                selected={currentView === view}
                sx={{
                  px: 2, py: 1.2,
                  '&.Mui-selected': {
                    backgroundColor: '#00e5ff0f',
                    borderLeft: '3px solid #00e5ff',
                    '& .MuiListItemIcon-root': { color: '#00e5ff' },
                    '& .MuiListItemText-primary': { color: '#00e5ff' },
                  },
                  '&:hover': { backgroundColor: '#00e5ff08' },
                  borderLeft: currentView === view ? '3px solid #00e5ff' : '3px solid transparent',
                }}
              >
                <ListItemIcon sx={{ color: '#7a9bb5', minWidth: 36 }}>
                  {icon}
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem', letterSpacing: '0.08em',
                    color: currentView === view ? '#00e5ff' : '#7a9bb5',
                    fontFamily: '"Rajdhani", sans-serif', fontWeight: 600,
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ borderColor: '#00e5ff22' }} />

        {/* Auth actions */}
        <Box sx={{ p: 2 }}>
          {isAuthenticated ? (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              data-testid="btn-logout"
              sx={{
                borderColor: '#ff3d7144', color: '#ff3d71',
                '&:hover': { borderColor: '#ff3d71', backgroundColor: '#ff3d7111' },
              }}
            >
              Cerrar sesión
            </Button>
          ) : (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<LoginIcon />}
              onClick={() => { onLoginClick(); setDrawerOpen(false); }}
              sx={{
                borderColor: '#00e5ff44', color: '#00e5ff',
                '&:hover': { borderColor: '#00e5ff', backgroundColor: '#00e5ff11' },
              }}
            >
              Acceder
            </Button>
          )}
        </Box>
      </Drawer>
    </>
  );
}