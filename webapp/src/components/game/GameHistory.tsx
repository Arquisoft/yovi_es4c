import { useEffect, useState, useCallback } from 'react';
import { apiFetch, API_URL } from '../../api/api';
import {
  Alert, Box, Button, ButtonGroup, Chip, CircularProgress,
  Container, Divider, Pagination, Typography,
} from '@mui/material';
import RefreshIcon     from '@mui/icons-material/Refresh';
import PersonIcon      from '@mui/icons-material/Person';
import PeopleIcon      from '@mui/icons-material/People';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HistoryIcon     from '@mui/icons-material/History';
import SmartToyIcon    from '@mui/icons-material/SmartToy';

// Importa la geometría y la función de puntos directamente de HexBoard
// para que ambas vistas usen exactamente el mismo algoritmo.
import { buildHexGeometry, flatHexPoints } from './HexBoard';

interface Player     { id: number; player_name: string; is_winner: boolean; user_id: number | null; }
interface GameRecord { id: number; yen: string; created_at: string; players: Player[]; }
interface GameHistoryProps { refreshTrigger: number; userId: number | null; username: string; }

const PAGE_SIZE = 6;

// ---- MiniBoard: tablero en miniatura para las tarjetas del historial ----
// Usa buildHexGeometry + flatHexPoints, idéntico a HexBoard.tsx
function MiniBoard({ yen, size }: { yen: string; size: number }) {
  const rows = yen.split('/');

  // Radio pequeño para la miniatura, sin límite inferior estricto
  const HEX_R    = Math.max(4, Math.round(80 / size));
  const GAP      = 1;
  const RENDER_R = HEX_R - GAP;
  const PAD      = HEX_R;

  const { cells, svgW, svgH } = buildHexGeometry(size, HEX_R);
  const viewW = svgW + PAD * 2;
  const viewH = svgH + PAD * 2;

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      style={{ width: '100%', maxWidth: viewW, height: 'auto', display: 'block', margin: '0 auto' }}
    >
      {cells.map(({ row, col, cx, cy }) => {
        const cell  = rows[row]?.[col] ?? '.';
        const isB   = cell === 'B';
        const isR   = cell === 'R';
        const pcx   = cx + PAD;
        const pcy   = cy + PAD;
        const pts   = flatHexPoints(pcx, pcy, RENDER_R);

        return (
          <g key={`${row}-${col}`}>
            <polygon
              points={pts}
              fill={isB ? '#1d4ed8' : isR ? '#b91c1c' : '#0d1f35'}
              stroke={isB ? '#60a5fa' : isR ? '#f87171' : '#00e5ff18'}
              strokeWidth={isB || isR ? 1.5 : 0.6}
            />
            {(isB || isR) && (
              <circle cx={pcx} cy={pcy} r={RENDER_R * 0.28}
                fill={isB ? '#93c5fd' : '#fca5a5'} opacity={0.8} />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function parseSize(yen: string): number {
  return yen.split('/').length;
}

export default function GameHistory({ refreshTrigger, userId, username }: GameHistoryProps) {
  const [games, setGames]             = useState<GameRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [page, setPage]               = useState(1);

  const fetchGameHistory = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const response = await apiFetch(`${API_URL}/api/games`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setGames(await response.json() || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setGames([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGameHistory(); }, [refreshTrigger, fetchGameHistory]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const visibleGames = showOnlyMine
    ? games.filter(g => g.players.some(p => p.user_id === userId))
    : games;
  const totalPages = Math.ceil(visibleGames.length / PAGE_SIZE);
  const pageGames  = visibleGames.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (mine: boolean) => { setShowOnlyMine(mine); setPage(1); };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 64px)', background: 'radial-gradient(ellipse 60% 40% at 50% 0%, #ff3d7106 0%, transparent 60%), #060b18', py: 4 }}>
      <Container maxWidth="lg">

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <HistoryIcon sx={{ color: '#00e5ff', fontSize: 22, filter: 'drop-shadow(0 0 4px #00e5ff88)' }} />
          <Typography variant="h5" sx={{ fontFamily: '"Orbitron"', fontWeight: 700, letterSpacing: '0.08em', color: '#e8f4fd' }}>
            HISTORIAL
          </Typography>
          <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, #00e5ff22, transparent)' }} />
          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={fetchGameHistory}
            sx={{ borderColor: '#00e5ff22', color: '#7a9bb5', '&:hover': { borderColor: '#00e5ff', color: '#00e5ff', backgroundColor: '#00e5ff0a' } }}>
            Actualizar
          </Button>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <ButtonGroup size="small">
            <Button startIcon={<PeopleIcon />} variant={!showOnlyMine ? 'contained' : 'outlined'}
              onClick={() => handleFilterChange(false)}
              sx={!showOnlyMine ? {} : { borderColor: '#00e5ff22', color: '#7a9bb5' }}>
              All games
            </Button>
            <Button startIcon={<PersonIcon />} variant={showOnlyMine ? 'contained' : 'outlined'}
              onClick={() => handleFilterChange(true)}
              sx={showOnlyMine ? {} : { borderColor: '#00e5ff22', color: '#7a9bb5' }}>
              My games
            </Button>
          </ButtonGroup>
          <Typography sx={{ color: '#7a9bb5', fontSize: '0.85rem', fontFamily: '"Rajdhani"' }}>
            {visibleGames.length} partida{visibleGames.length !== 1 ? 's' : ''}{showOnlyMine && ` de ${games.length} totales`}
          </Typography>
        </Box>

        {loading && <Box display="flex" justifyContent="center" py={8}><CircularProgress sx={{ color: '#00e5ff' }} /></Box>}
        {error   && <Alert severity="error" sx={{ backgroundColor: '#ff3d710d', border: '1px solid #ff3d7133', color: '#ff8fa3', mb: 2 }}>Error: {error}</Alert>}

        {!loading && !error && visibleGames.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 10, border: '1px dashed #00e5ff22', borderRadius: 2, backgroundColor: '#00e5ff04' }}>
            <HistoryIcon sx={{ color: '#7a9bb5', fontSize: 48, mb: 2, opacity: 0.4 }} />
            <Typography sx={{ color: '#7a9bb5', fontFamily: '"Rajdhani"', fontWeight: 600 }}>
              {showOnlyMine ? `Aún no tienes partidas, ${username}` : 'No games recorded yet'}
            </Typography>
          </Box>
        )}

        {/* Grid de tarjetas */}
        {!loading && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            {pageGames.map((game, idx) => {
              const isMyGame = game.players.some(p => p.user_id === userId);
              const iWon     = game.players.some(p => p.user_id === userId && p.is_winner);
              const boardN   = parseSize(game.yen);

              return (
                <Box key={game.id} sx={{
                  backgroundColor: '#0d1526',
                  border:    isMyGame ? `1px solid ${iWon ? '#00e67633' : '#3b82f633'}` : '1px solid #00e5ff15',
                  borderTop: isMyGame ? `3px solid ${iWon ? '#00e676' : '#3b82f6'}` : '3px solid #00e5ff22',
                  borderRadius: 1,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  animation: `cardIn 0.35s ease ${idx * 0.04}s both`,
                  '@keyframes cardIn': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                  '&:hover': {
                    boxShadow: '0 4px 20px #00e5ff12',
                    border:    isMyGame ? `1px solid ${iWon ? '#00e67655' : '#3b82f655'}` : '1px solid #00e5ff30',
                    borderTop: isMyGame ? `3px solid ${iWon ? '#00e676' : '#3b82f6'}` : '3px solid #00e5ff44',
                  },
                }}>
                  {/* Mini tablero */}
                  <Box sx={{ p: 1.5, backgroundColor: '#0a1220', borderBottom: '1px solid #00e5ff0a' }}>
                    <MiniBoard yen={game.yen} size={boardN} />
                  </Box>

                  {/* Info de la tarjeta */}
                  <Box sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography sx={{ fontFamily: '"Orbitron"', fontWeight: 700, fontSize: '0.75rem', color: '#7a9bb5', letterSpacing: '0.1em' }}>
                        Game #{game.id} · {boardN}×{boardN}
                      </Typography>
                      {isMyGame && (
                        <Chip size="small"
                          icon={iWon ? <EmojiEventsIcon sx={{ fontSize: '12px !important' }} /> : undefined}
                          label={iWon ? '¡Ganaste!' : 'Jugaste'}
                          sx={{ backgroundColor: iWon ? '#00e67611' : '#3b82f611', border: `1px solid ${iWon ? '#00e67644' : '#3b82f644'}`, color: iWon ? '#69f0ae' : '#93c5fd', fontFamily: '"Rajdhani"', fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                      )}
                    </Box>

                    <Typography sx={{ color: '#4a6a85', fontSize: '0.7rem', fontFamily: '"Rajdhani"', mb: 1 }}>
                      {formatDate(game.created_at)}
                    </Typography>

                    <Divider sx={{ borderColor: '#00e5ff08', mb: 1 }} />

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {game.players.map((player) => {
                        const isMe  = player.user_id === userId;
                        const isBot = player.user_id === null;
                        return (
                          <Chip key={player.id} label={player.player_name} size="small"
                            icon={player.is_winner ? <EmojiEventsIcon sx={{ fontSize: '11px !important' }} /> : isBot ? <SmartToyIcon sx={{ fontSize: '11px !important' }} /> : undefined}
                            sx={{
                              height: 20, fontSize: '0.65rem', fontFamily: '"Rajdhani"', fontWeight: 600,
                              backgroundColor: isMe ? (player.is_winner ? '#00e67611' : '#3b82f611') : player.is_winner ? '#ffab4011' : '#ffffff08',
                              border: `1px solid ${isMe ? (player.is_winner ? '#00e67633' : '#3b82f633') : player.is_winner ? '#ffab4033' : '#ffffff15'}`,
                              color: isMe ? (player.is_winner ? '#69f0ae' : '#93c5fd') : player.is_winner ? '#ffcc80' : '#7a9bb5',
                            }} />
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination count={totalPages} page={page}
              onChange={(_, v) => { setPage(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              sx={{
                '& .MuiPaginationItem-root': { color: '#7a9bb5', fontFamily: '"Rajdhani"', fontWeight: 600, borderColor: '#00e5ff22' },
                '& .MuiPaginationItem-root.Mui-selected': { backgroundColor: '#00e5ff1a', color: '#00e5ff', borderColor: '#00e5ff44' },
                '& .MuiPaginationItem-root:hover': { backgroundColor: '#00e5ff0a', color: '#00e5ff' },
              }}
              variant="outlined" shape="rounded" />
          </Box>
        )}
      </Container>
    </Box>
  );
}
