import { useEffect, useState, useCallback } from 'react';
import { apiFetch, API_URL } from '../../api/api';
import {
  Box, CircularProgress, Container, Divider, Paper, Typography, Chip,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import StarIcon from '@mui/icons-material/Star';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

interface PlayerStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  topDay: string | null;
  topDayCount: number;
  lastGame: string | null;
  beatenBots: number;
  memberSince: string | null;
}

interface ProfileViewProps { userId: number | null; username: string; }

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent?: string }) {
  const color = accent ?? '#00e5ff';
  return (
    <Box sx={{
      p: 2.5, backgroundColor: '#0d1526',
      border: `1px solid ${color}22`, borderTop: `2px solid ${color}`,
      borderRadius: 1, flex: '1 1 140px',
      transition: 'all 0.2s',
      '&:hover': { boxShadow: `0 4px 20px ${color}12`, border: `1px solid ${color}44`, borderTop: `2px solid ${color}` },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{ color, fontSize: 20, display: 'flex' }}>{icon}</Box>
        <Typography sx={{ color: '#4a6a85', fontSize: '0.7rem', fontFamily: '"Rajdhani"', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</Typography>
      </Box>
      <Typography sx={{ color, fontFamily: '"Orbitron"', fontWeight: 900, fontSize: '1.8rem', lineHeight: 1 }}>{value}</Typography>
    </Box>
  );
}

function WinRateRing({ rate }: { rate: number }) {
  const r = 44, circ = 2 * Math.PI * r;
  const dash = (rate / 100) * circ;
  return (
    <Box sx={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="#00e5ff0f" strokeWidth="8" />
        <circle cx="55" cy="55" r={r} fill="none" stroke="#00e5ff" strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25}
          strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontFamily: '"Orbitron"', fontWeight: 900, fontSize: '1.3rem', color: '#00e5ff', lineHeight: 1 }}>{rate}%</Typography>
        <Typography sx={{ color: '#4a6a85', fontSize: '0.6rem', fontFamily: '"Rajdhani"', fontWeight: 600, textTransform: 'uppercase' }}>victorias</Typography>
      </Box>
    </Box>
  );
}

export default function ProfileView({ userId, username }: ProfileViewProps) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (userId === null) { setLoading(false); return; }
    try {
      setLoading(true);
      const res = await apiFetch(`${API_URL}/api/users/${userId}/stats`);
      if (!res.ok) throw new Error('Error fetching stats');
      setStats(await res.json());
    } catch { setStats(null); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const winRate = stats?.winRate ?? 0;
  const rank = winRate >= 80 ? 'Maestro' : winRate >= 60 ? 'Avanzado' : winRate >= 40 ? 'Intermedio' : !stats || stats.totalGames === 0 ? 'Sin rango' : 'Novato';
  const rankColor = winRate >= 80 ? '#ffab40' : winRate >= 60 ? '#00e5ff' : winRate >= 40 ? '#7c3aed' : '#4a6a85';

  const lastGame = stats?.lastGame
    ? new Date(stats.lastGame).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  const memberSince = stats?.memberSince
    ? new Date(stats.memberSince).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', background: `radial-gradient(ellipse 60% 40% at 50% 0%, #7c3aed08 0%, transparent 60%), #060b18`, py: 4 }}>
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <AccountCircleIcon sx={{ color: '#00e5ff', fontSize: 22, filter: 'drop-shadow(0 0 4px #00e5ff88)' }} />
          <Typography variant="h5" sx={{ fontFamily: '"Orbitron"', fontWeight: 700, letterSpacing: '0.08em', color: '#e8f4fd' }}>PERFIL</Typography>
          <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, #00e5ff22, transparent)' }} />
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: '#00e5ff' }} /></Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Paper sx={{ p: 3, border: '1px solid #00e5ff15', display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              <Box sx={{
                width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid #00e5ff44', boxShadow: '0 0 20px #00e5ff22',
              }}>
                <Typography sx={{ fontFamily: '"Orbitron"', fontWeight: 900, fontSize: '1.6rem', color: '#fff' }}>
                  {username.charAt(0).toUpperCase()}
                </Typography>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
                  <Typography variant="h4" sx={{ fontFamily: '"Orbitron"', fontWeight: 900, color: '#e8f4fd', letterSpacing: '0.05em' }}>
                    {username}
                  </Typography>
                  <Chip label={rank} size="small"
                    icon={<StarIcon sx={{ fontSize: '12px !important', color: `${rankColor} !important` }} />}
                    sx={{ backgroundColor: `${rankColor}15`, border: `1px solid ${rankColor}44`, color: rankColor, fontFamily: '"Rajdhani"', fontWeight: 700, fontSize: '0.75rem' }} />
                </Box>
                <Typography sx={{ color: '#4a6a85', fontFamily: '"Rajdhani"', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccountCircleIcon sx={{ fontSize: 13 }} /> Se unió el: {memberSince}
                </Typography>
                <Typography sx={{ color: '#4a6a85', fontFamily: '"Rajdhani"', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarTodayIcon sx={{ fontSize: 13 }} /> Última partida: {lastGame}
                </Typography>
              </Box>

              <WinRateRing rate={winRate} />
            </Paper>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <StatCard icon={<SportsEsportsIcon />} label="Partidas" value={stats?.totalGames ?? 0} />
              <StatCard icon={<EmojiEventsIcon />} label="Victorias" value={stats?.wins ?? 0} accent="#00e676" />
              <StatCard icon={<SmartToyIcon />} label="Derrotas" value={stats?.losses ?? 0} accent="#ff3d71" />
              <StatCard icon={<TrendingUpIcon />} label="Racha actual" value={stats?.currentStreak ?? 0} accent="#ffab40" />
            </Box>

            <Divider sx={{ borderColor: '#00e5ff0a' }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Paper sx={{ p: 2.5, border: '1px solid #00e5ff15' }}>
                <Typography sx={{ color: '#4a6a85', fontSize: '0.7rem', fontFamily: '"Rajdhani"', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.5 }}>
                  Bots derrotados
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography sx={{ fontFamily: '"Orbitron"', fontWeight: 900, fontSize: '2.2rem', color: '#00e676', lineHeight: 1 }}>{stats?.beatenBots ?? 0}</Typography>
                  <Typography sx={{ color: '#4a6a85', fontFamily: '"Rajdhani"', fontSize: '0.8rem' }}>/ {stats?.totalGames ?? 0} partidas</Typography>
                </Box>
                <Box sx={{ mt: 1.5, height: 6, borderRadius: 3, backgroundColor: '#00e5ff0a', overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${stats && stats.totalGames > 0 ? (stats.beatenBots / stats.totalGames) * 100 : 0}%`, background: 'linear-gradient(90deg, #00e676, #00b248)', borderRadius: 3, transition: 'width 1s ease' }} />
                </Box>
              </Paper>

              <Paper sx={{ p: 2.5, border: '1px solid #00e5ff15' }}>
                <Typography sx={{ color: '#4a6a85', fontSize: '0.7rem', fontFamily: '"Rajdhani"', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1.5 }}>
                  Día más activo
                </Typography>
                <Typography sx={{ fontFamily: '"Orbitron"', fontWeight: 700, fontSize: '1.3rem', color: '#00e5ff', textTransform: 'capitalize', lineHeight: 1.2 }}>
                  {stats?.topDay ?? '—'}
                </Typography>
                <Typography sx={{ color: '#4a6a85', fontFamily: '"Rajdhani"', fontSize: '0.8rem', mt: 0.5 }}>
                  {stats?.topDay ? `${stats.topDayCount} partida${stats.topDayCount !== 1 ? 's' : ''} ese día` : 'Sin datos suficientes'}
                </Typography>
              </Paper>
            </Box>

            {(!stats || stats.totalGames === 0) && (
              <Box sx={{ textAlign: 'center', py: 4, border: '1px dashed #00e5ff22', borderRadius: 2, backgroundColor: '#00e5ff04' }}>
                <SportsEsportsIcon sx={{ color: '#7a9bb5', fontSize: 40, opacity: 0.4, mb: 1 }} />
                <Typography sx={{ color: '#7a9bb5', fontFamily: '"Rajdhani"', fontWeight: 600 }}>
                  Aún no tienes partidas. ¡Ve a jugar!
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Container>
    </Box>
  );
}