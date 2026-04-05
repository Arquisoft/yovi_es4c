import { useEffect, useState, useCallback } from 'react';
import {
  Box, CircularProgress, Container, Paper, Typography, IconButton, Tooltip,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
 
// ── Types ────────────────────────────────────────────────────────────────────
 
interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
}
 
interface LeaderboardResponse {
  data: LeaderboardEntry[];
  pagination: { total: number; limit: number; offset: number };
}
 
// ── Constants ────────────────────────────────────────────────────────────────
 
const LIMIT = 10;
 
const RANK_META: Record<number, { color: string; medal: string }> = {
  1: { color: '#ffab40', medal: '🥇' },
  2: { color: '#b0bec5', medal: '🥈' },
  3: { color: '#ff7043', medal: '🥉' },
};
 
function rankColor(rank: number): string {
  return RANK_META[rank]?.color ?? '#4a6a85';
}
 
// ── Sub-components ───────────────────────────────────────────────────────────
 
function TableHeader() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '56px 1fr 90px 90px 150px',
        px: 2,
        pb: 1,
        color: '#4a6a85',
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: '0.7rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      }}
    >
      <span>#</span>
      <span>Jugador</span>
      <span style={{ textAlign: 'right' }}>Partidas</span>
      <span style={{ textAlign: 'right' }}>Victorias</span>
      <span style={{ paddingLeft: 14 }}>Win Rate</span>
    </Box>
  );
}
 
function EntryRow({ entry }: { entry: LeaderboardEntry }) {
  const color = rankColor(entry.rank);
  const isTop3 = entry.rank <= 3;
  const meta = RANK_META[entry.rank];
 
  return (
    <Paper
      sx={{
        display: 'grid',
        gridTemplateColumns: '56px 1fr 90px 90px 150px',
        alignItems: 'center',
        px: 2,
        py: 1.5,
        border: `1px solid ${isTop3 ? `${color}33` : '#00e5ff0a'}`,
        borderLeft: `3px solid ${color}`,
        backgroundColor: isTop3 ? `${color}06` : '#0d1526',
        transition: 'all 0.2s ease',
        '&:hover': {
          border: `1px solid ${color}55`,
          borderLeft: `3px solid ${color}`,
          boxShadow: `0 2px 18px ${color}14`,
        },
      }}
    >
      {/* Rank */}
      <Typography
        sx={{
          fontFamily: '"Orbitron", sans-serif',
          fontWeight: 900,
          fontSize: isTop3 ? '1.1rem' : '0.8rem',
          color,
          filter: isTop3 ? `drop-shadow(0 0 5px ${color}99)` : 'none',
          lineHeight: 1,
        }}
      >
        {meta ? meta.medal : `#${entry.rank}`}
      </Typography>
 
      {/* Username */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            flexShrink: 0,
            background: `linear-gradient(135deg, ${color}44 0%, ${color}1a 100%)`,
            border: `1px solid ${color}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontWeight: 900,
              fontSize: '0.65rem',
              color,
            }}
          >
            {entry.username.charAt(0).toUpperCase()}
          </Typography>
        </Box>
        <Typography
          noWrap
          sx={{
            fontFamily: '"Rajdhani", sans-serif',
            fontWeight: 700,
            fontSize: '1rem',
            letterSpacing: '0.03em',
            color: isTop3 ? '#e8f4fd' : '#a0c4d8',
          }}
        >
          {entry.username}
        </Typography>
      </Box>
 
      {/* Games played */}
      <Typography
        sx={{
          fontFamily: '"Orbitron", sans-serif',
          fontWeight: 600,
          fontSize: '0.8rem',
          color: '#7a9bb5',
          textAlign: 'right',
        }}
      >
        {entry.gamesPlayed}
      </Typography>
 
      {/* Wins */}
      <Typography
        sx={{
          fontFamily: '"Orbitron", sans-serif',
          fontWeight: 700,
          fontSize: '0.9rem',
          color: '#00e676',
          textAlign: 'right',
        }}
      >
        {entry.wins}
      </Typography>
 
      {/* Win rate + bar */}
      <Box sx={{ pl: 1.5 }}>
        <Typography
          sx={{
            fontFamily: '"Orbitron", sans-serif',
            fontWeight: 700,
            fontSize: '0.78rem',
            color,
            mb: 0.5,
            lineHeight: 1,
          }}
        >
          {entry.winRate}%
        </Typography>
        <Box
          sx={{
            height: 4,
            borderRadius: 2,
            backgroundColor: '#00e5ff0a',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${entry.winRate}%`,
              background: `linear-gradient(90deg, ${color}, ${color}88)`,
              borderRadius: 2,
              transition: 'width 0.8s ease',
            }}
          />
        </Box>
      </Box>
    </Paper>
  );
}
 
function EmptyState() {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 8,
        border: '1px dashed #00e5ff22',
        borderRadius: 2,
        backgroundColor: '#00e5ff04',
      }}
    >
      <SportsEsportsIcon sx={{ color: '#7a9bb5', fontSize: 44, opacity: 0.35, mb: 1.5 }} />
      <Typography
        sx={{
          color: '#7a9bb5',
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: 600,
          letterSpacing: '0.05em',
        }}
      >
        Aún no hay jugadores en el ranking.
      </Typography>
    </Box>
  );
}
 
function ErrorState({ message }: { message: string }) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        py: 6,
        border: '1px dashed #ff3d7133',
        borderRadius: 2,
        backgroundColor: '#ff3d7108',
      }}
    >
      <Typography
        sx={{
          color: '#ff3d71',
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: 600,
        }}
      >
        {message}
      </Typography>
    </Box>
  );
}
 
// ── Main component ───────────────────────────────────────────────────────────
 
export default function LeaderboardView() {
  const [entries, setEntries]   = useState<LeaderboardEntry[]>([]);
  const [total, setTotal]       = useState(0);
  const [offset, setOffset]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
 
  const fetchLeaderboard = useCallback(async (off: number) => {
    try {
      setLoading(true);
      setError(null);
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
      const res = await fetch(`${API_URL}/api/leaderboard?limit=${LIMIT}&offset=${off}`);
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const json: LeaderboardResponse = await res.json();
      setEntries(json.data);
      setTotal(json.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);
 
  useEffect(() => {
    fetchLeaderboard(offset);
  }, [fetchLeaderboard, offset]);
 
  const totalPages  = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;
  const hasPrev     = offset > 0;
  const hasNext     = offset + LIMIT < total;
 
  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        background: `
          radial-gradient(ellipse 60% 40% at 50% 0%, #00e5ff07 0%, transparent 60%),
          #060b18
        `,
        py: 4,
      }}
    >
      <Container maxWidth="md">
 
        {/* ── Header ── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <LeaderboardIcon
            sx={{
              color: '#00e5ff',
              fontSize: 22,
              filter: 'drop-shadow(0 0 4px #00e5ff88)',
            }}
          />
          <Typography
            variant="h5"
            sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#e8f4fd',
            }}
          >
            LEADERBOARD
          </Typography>
          <Box
            sx={{
              flex: 1,
              height: '1px',
              background: 'linear-gradient(90deg, #00e5ff22, transparent)',
            }}
          />
          {!loading && total > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <EmojiEventsIcon sx={{ color: '#4a6a85', fontSize: 14 }} />
              <Typography
                sx={{
                  color: '#4a6a85',
                  fontFamily: '"Rajdhani", sans-serif',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
              >
                {total} jugadores
              </Typography>
            </Box>
          )}
        </Box>
 
        {/* ── Content ── */}
        {loading ? (
          <Box display="flex" justifyContent="center" py={10}>
            <CircularProgress sx={{ color: '#00e5ff' }} />
          </Box>
        ) : error ? (
          <ErrorState message={error} />
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <TableHeader />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {entries.map((entry) => (
                <EntryRow key={entry.userId} entry={entry} />
              ))}
            </Box>
          </>
        )}
 
        {/* ── Pagination ── */}
        {totalPages > 1 && !loading && !error && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              mt: 3,
            }}
          >
            <Tooltip title="Página anterior">
              <span>
                <IconButton
                  onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
                  disabled={!hasPrev}
                  size="small"
                  sx={{
                    color: '#00e5ff',
                    border: '1px solid #00e5ff22',
                    borderRadius: 1,
                    '&:disabled': { color: '#4a6a85', borderColor: '#ffffff0a' },
                    '&:hover': { backgroundColor: '#00e5ff11', borderColor: '#00e5ff55' },
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>
              </span>
            </Tooltip>
 
            <Typography
              sx={{
                fontFamily: '"Orbitron", sans-serif',
                fontSize: '0.75rem',
                color: '#7a9bb5',
                letterSpacing: '0.1em',
                minWidth: 60,
                textAlign: 'center',
              }}
            >
              {currentPage}{' '}
              <span style={{ color: '#4a6a85' }}>/ {totalPages}</span>
            </Typography>
 
            <Tooltip title="Página siguiente">
              <span>
                <IconButton
                  onClick={() => setOffset((o) => o + LIMIT)}
                  disabled={!hasNext}
                  size="small"
                  sx={{
                    color: '#00e5ff',
                    border: '1px solid #00e5ff22',
                    borderRadius: 1,
                    '&:disabled': { color: '#4a6a85', borderColor: '#ffffff0a' },
                    '&:hover': { backgroundColor: '#00e5ff11', borderColor: '#00e5ff55' },
                  }}
                >
                  <ChevronRightIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        )}
 
      </Container>
    </Box>
  );
}