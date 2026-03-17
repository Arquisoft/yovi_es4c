import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import HistoryIcon from '@mui/icons-material/History';
import SmartToyIcon from '@mui/icons-material/SmartToy';

interface Player {
  id: number;
  player_name: string;
  is_winner: boolean;
  user_id: number | null;
}

interface GameRecord {
  id: number;
  yen: string;
  created_at: string;
  players: Player[];
}

interface GameHistoryProps {
  refreshTrigger: number;
  userId: number | null;
  username: string;
}

export default function GameHistory({ refreshTrigger, userId, username }: GameHistoryProps) {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  useEffect(() => { fetchGameHistory(); }, [refreshTrigger]);

  const fetchGameHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
      const response = await fetch(`${API_URL}/api/games`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setGames(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  const visibleGames = showOnlyMine
    ? games.filter(g => g.players.some(p => p.user_id === userId))
    : games;

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        background: `radial-gradient(ellipse 60% 40% at 50% 0%, #ff3d7106 0%, transparent 60%), #060b18`,
        py: 4,
      }}
    >
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, animation: 'fadeIn 0.5s ease', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
          <HistoryIcon sx={{ color: '#00e5ff', fontSize: 22, filter: 'drop-shadow(0 0 4px #00e5ff88)' }} />
          <Typography variant="h5" sx={{ fontFamily: '"Orbitron"', fontWeight: 700, letterSpacing: '0.08em', color: '#e8f4fd' }}>
            HISTORIAL
          </Typography>
          <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, #00e5ff22, transparent)' }} />
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchGameHistory}
            sx={{ borderColor: '#00e5ff22', color: '#7a9bb5', '&:hover': { borderColor: '#00e5ff', color: '#00e5ff', backgroundColor: '#00e5ff0a' } }}
          >
            Actualizar
          </Button>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <ButtonGroup size="small">
            <Button
              startIcon={<PeopleIcon />}
              variant={!showOnlyMine ? 'contained' : 'outlined'}
              onClick={() => setShowOnlyMine(false)}
              sx={!showOnlyMine ? {} : { borderColor: '#00e5ff22', color: '#7a9bb5' }}
            >
              Todas
            </Button>
            <Button
              startIcon={<PersonIcon />}
              variant={showOnlyMine ? 'contained' : 'outlined'}
              onClick={() => setShowOnlyMine(true)}
              sx={showOnlyMine ? {} : { borderColor: '#00e5ff22', color: '#7a9bb5' }}
            >
              Las mías
            </Button>
          </ButtonGroup>
          <Typography sx={{ color: '#7a9bb5', fontSize: '0.85rem', fontFamily: '"Rajdhani"' }}>
            {visibleGames.length} partida{visibleGames.length !== 1 ? 's' : ''}
            {showOnlyMine && ` de ${games.length} totales`}
          </Typography>
        </Box>

        {/* Loading */}
        {loading && (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress sx={{ color: '#00e5ff' }} />
          </Box>
        )}

        {/* Error */}
        {error && (
          <Alert
            severity="error"
            sx={{ backgroundColor: '#ff3d710d', border: '1px solid #ff3d7133', color: '#ff8fa3', mb: 2 }}
          >
            Error: {error}
          </Alert>
        )}

        {/* Empty state */}
        {!loading && !error && visibleGames.length === 0 && (
          <Box
            sx={{
              textAlign: 'center',
              py: 10,
              border: '1px dashed #00e5ff22',
              borderRadius: 2,
              backgroundColor: '#00e5ff04',
            }}
          >
            <HistoryIcon sx={{ color: '#7a9bb5', fontSize: 48, mb: 2, opacity: 0.4 }} />
            <Typography sx={{ color: '#7a9bb5', fontFamily: '"Rajdhani"', fontWeight: 600, letterSpacing: '0.05em' }}>
              {showOnlyMine
                ? `Aún no tienes partidas registradas, ${username}`
                : 'No hay partidas registradas todavía'}
            </Typography>
          </Box>
        )}

        {/* Game cards */}
        {!loading && (
          <Box display="flex" flexDirection="column" gap={2}>
            {visibleGames.map((game, idx) => {
              const isMyGame = game.players.some(p => p.user_id === userId);
              const iWon = game.players.some(p => p.user_id === userId && p.is_winner);

              return (
                <Card
                  key={game.id}
                  sx={{
                    border: isMyGame
                      ? `1px solid ${iWon ? '#00e67633' : '#3b82f633'}`
                      : '1px solid #00e5ff15',
                    borderLeft: isMyGame
                      ? `3px solid ${iWon ? '#00e676' : '#3b82f6'}`
                      : '3px solid transparent',
                    animation: `cardIn 0.4s ease ${idx * 0.05}s both`,
                    '@keyframes cardIn': {
                      from: { opacity: 0, transform: 'translateX(-10px)' },
                      to: { opacity: 1, transform: 'translateX(0)' },
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    {/* Card header */}
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1} mb={1.5}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          sx={{
                            fontFamily: '"Orbitron"',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            color: '#7a9bb5',
                            letterSpacing: '0.1em',
                          }}
                        >
                          #{game.id}
                        </Typography>
                        {isMyGame && (
                          <Chip
                            size="small"
                            icon={iWon ? <EmojiEventsIcon sx={{ fontSize: '14px !important' }} /> : undefined}
                            label={iWon ? '¡Ganaste!' : 'Jugaste'}
                            sx={{
                              backgroundColor: iWon ? '#00e67611' : '#3b82f611',
                              border: `1px solid ${iWon ? '#00e67644' : '#3b82f644'}`,
                              color: iWon ? '#69f0ae' : '#93c5fd',
                              fontFamily: '"Rajdhani"',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              letterSpacing: '0.05em',
                            }}
                          />
                        )}
                      </Box>
                      <Typography sx={{ color: '#4a6a85', fontSize: '0.75rem', fontFamily: '"Rajdhani"' }}>
                        {formatDate(game.created_at)}
                      </Typography>
                    </Box>

                    <Divider sx={{ borderColor: '#00e5ff0a', mb: 1.5 }} />

                    {/* YEN notation */}
                    <Typography sx={{ color: '#4a6a85', fontSize: '0.75rem', fontFamily: '"Rajdhani"', letterSpacing: '0.05em', mb: 0.5, textTransform: 'uppercase' }}>
                      Notación YEN
                    </Typography>
                    <Box
                      component="pre"
                      sx={{
                        fontSize: '0.7rem',
                        color: '#00e5ffaa',
                        backgroundColor: '#00e5ff05',
                        border: '1px solid #00e5ff0f',
                        p: 1.5,
                        borderRadius: 1,
                        overflow: 'auto',
                        mb: 2,
                        fontFamily: '"Courier New", monospace',
                        lineHeight: 1.4,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}
                    >
                      {game.yen}
                    </Box>

                    {/* Players */}
                    <Typography sx={{ color: '#4a6a85', fontSize: '0.75rem', fontFamily: '"Rajdhani"', letterSpacing: '0.05em', mb: 1, textTransform: 'uppercase' }}>
                      Jugadores
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.8}>
                      {game.players.map((player) => {
                        const isMe = player.user_id === userId;
                        const isBot = player.user_id === null && player.player_name.toLowerCase().includes('bot');
                        return (
                          <Chip
                            key={player.id}
                            label={player.player_name}
                            size="small"
                            icon={
                              player.is_winner
                                ? <EmojiEventsIcon sx={{ fontSize: '14px !important' }} />
                                : isBot
                                ? <SmartToyIcon sx={{ fontSize: '14px !important' }} />
                                : undefined
                            }
                            sx={{
                              backgroundColor: isMe
                                ? player.is_winner ? '#00e67611' : '#3b82f611'
                                : player.is_winner ? '#ffab4011' : '#ffffff08',
                              border: `1px solid ${isMe ? (player.is_winner ? '#00e67633' : '#3b82f633') : player.is_winner ? '#ffab4033' : '#ffffff15'}`,
                              color: isMe
                                ? player.is_winner ? '#69f0ae' : '#93c5fd'
                                : player.is_winner ? '#ffcc80' : '#7a9bb5',
                              fontFamily: '"Rajdhani"',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                            }}
                          />
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Container>
    </Box>
  );
}
