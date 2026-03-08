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
  Divider,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

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

  useEffect(() => {
    fetchGameHistory();
  }, [refreshTrigger]);

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
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // Filter games where the current user participated (by user_id)
  const visibleGames = showOnlyMine
    ? games.filter(g => g.players.some(p => p.user_id === userId))
    : games;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {error}
        </Alert>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchGameHistory}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header + toggle */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h6" fontWeight={700}>
          📊 Game History ({visibleGames.length}{showOnlyMine ? ` of ${games.length}` : ''})
        </Typography>

        <Box display="flex" gap={1}>
          <ButtonGroup variant="outlined" size="small">
            <Button
              startIcon={<PeopleIcon />}
              variant={!showOnlyMine ? 'contained' : 'outlined'}
              onClick={() => setShowOnlyMine(false)}
            >
              All games
            </Button>
            <Button
              startIcon={<PersonIcon />}
              variant={showOnlyMine ? 'contained' : 'outlined'}
              onClick={() => setShowOnlyMine(true)}
            >
              My games
            </Button>
          </ButtonGroup>

          <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={fetchGameHistory}>
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Empty state */}
      {visibleGames.length === 0 && (
        <Alert severity="info">
          {showOnlyMine
            ? `No games found for ${username} yet. Play a game to see it here!`
            : 'No games recorded yet.'}
        </Alert>
      )}

      {/* Game cards */}
      <Box display="flex" flexDirection="column" gap={2}>
        {visibleGames.map((game) => {
          const isMyGame = game.players.some(p => p.user_id === userId);
          const iWon = game.players.some(p => p.user_id === userId && p.is_winner);

          return (
            <Card
              key={game.id}
              variant="outlined"
              sx={{
                borderLeft: isMyGame ? '4px solid' : '4px solid transparent',
                borderLeftColor: isMyGame ? (iWon ? 'success.main' : 'primary.main') : 'transparent',
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Game #{game.id}
                    </Typography>
                    {isMyGame && (
                      <Chip
                        size="small"
                        icon={iWon ? <EmojiEventsIcon /> : undefined}
                        label={iWon ? 'You won!' : 'You played'}
                        color={iWon ? 'success' : 'primary'}
                        variant="outlined"
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(game.created_at)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Typography variant="body2" color="text.secondary" mb={1}>
                  <strong>YEN notation:</strong>
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    fontSize: '0.75rem',
                    bgcolor: 'grey.100',
                    p: 1,
                    borderRadius: 1,
                    overflow: 'auto',
                    mb: 1,
                    fontFamily: 'monospace',
                  }}
                >
                  {game.yen}
                </Box>

                <Typography variant="body2" color="text.secondary" mb={0.5}>
                  <strong>Players ({game.players.length}):</strong>
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5}>
                  {game.players.map((player) => (
                    <Chip
                      key={player.id}
                      label={player.player_name}
                      size="small"
                      icon={player.is_winner ? <EmojiEventsIcon /> : undefined}
                      color={
                        player.user_id === userId
                          ? player.is_winner ? 'success' : 'primary'
                          : player.is_winner ? 'warning' : 'default'
                      }
                      variant={player.user_id === userId ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}