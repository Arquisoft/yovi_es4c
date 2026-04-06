import { AppBar, Box, Button, Chip, Container, IconButton, Toolbar, Tooltip, Typography } from '@mui/material';
import HexagonIcon from '@mui/icons-material/Hexagon';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import HistoryIcon from '@mui/icons-material/History';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
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
  const navLinks = isAuthenticated
    ? [
        { view: 'game' as AppView, label: 'Jugar', icon: <SportsEsportsIcon fontSize="small" /> },
        { view: 'history' as AppView, label: 'Historial', icon: <HistoryIcon fontSize="small" /> },
        { view: 'profile' as AppView, label: 'Perfil', icon: <AccountCircleIcon fontSize="small" /> },
        { view: 'leaderboard' as AppView, label: 'Ranking',   icon: <LeaderboardIcon fontSize="small" /> },
      ]
    : [];

  return (
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
          {/* Logo */}
          <Box
            onClick={() => onNavigate('landing')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              textDecoration: 'none',
              flexShrink: 0,
              '&:hover .logo-icon': { color: '#6effff', filter: 'drop-shadow(0 0 8px #00e5ff)' },
            }}
          >
            <HexagonIcon
              className="logo-icon"
              sx={{
                color: '#00e5ff',
                fontSize: 28,
                transition: 'all 0.3s ease',
                filter: 'drop-shadow(0 0 4px #00e5ff88)',
              }}
            />
            <Typography
              variant="h6"
              sx={{
                fontFamily: '"Orbitron", sans-serif',
                fontWeight: 900,
                letterSpacing: '0.15em',
                fontSize: { xs: '0.85rem', sm: '1rem' },
                background: 'linear-gradient(90deg, #00e5ff, #6effff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textTransform: 'uppercase',
              }}
            >
              Y-Game
            </Typography>
          </Box>

          {/* Nav links */}
          <Box sx={{ display: 'flex', gap: 0.5, flex: 1, ml: 2 }}>
            {navLinks.map(({ view, label, icon }) => (
              <Button
                key={view}
                startIcon={icon}
                onClick={() => onNavigate(view)}
                size="small"
                sx={{
                  color: currentView === view ? '#00e5ff' : '#7a9bb5',
                  borderBottom: currentView === view ? '2px solid #00e5ff' : '2px solid transparent',
                  borderRadius: 0,
                  px: 2,
                  py: 1.5,
                  fontSize: '0.8rem',
                  letterSpacing: '0.1em',
                  transition: 'all 0.2s',
                  '&:hover': { color: '#00e5ff', backgroundColor: '#00e5ff0a' },
                }}
              >
                {label}
              </Button>
            ))}
          </Box>

          {/* Auth area */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            {isAuthenticated ? (
              <>
                <Chip
                  icon={<PersonIcon sx={{ fontSize: '14px !important', color: '#00e5ff !important' }} />}
                  label={username}
                  size="small"
                  sx={{
                    backgroundColor: '#00e5ff11',
                    border: '1px solid #00e5ff33',
                    color: '#00e5ff',
                    fontFamily: '"Rajdhani", sans-serif',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    display: { xs: 'none', sm: 'flex' },
                  }}
                />
                <Tooltip title="Cerrar sesión">
                  <IconButton
                    onClick={onLogout}
                    size="small"
                    data-testid="btn-logout"
                    sx={{
                      color: '#7a9bb5',
                      border: '1px solid #ff3d7122',
                      borderRadius: 1,
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
                  borderColor: '#00e5ff44',
                  color: '#00e5ff',
                  fontSize: '0.75rem',
                  letterSpacing: '0.1em',
                  '&:hover': { borderColor: '#00e5ff', backgroundColor: '#00e5ff11', boxShadow: '0 0 12px #00e5ff33' },
                }}
              >
                Acceder
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

interface NavBarProps {
  isAuthenticated: boolean;
  username: string;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onLoginClick: () => void;
  onLogout: () => void;
}