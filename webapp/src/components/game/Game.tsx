import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import GridOnIcon from '@mui/icons-material/GridOn';
import RefreshIcon from '@mui/icons-material/Refresh';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { type YEN, chooseMove, makeHumanMove } from '../../api/gameyClient';

interface GameProps {
  size?: number;
  onGameReset?: () => void;
  userId?: number | null;
  username?: string;
}

const BOT_DIFFICULTIES = [
  { id: 'random_bot', label: 'Fácil — Aleatorio' },
  { id: 'greedy_bot', label: 'Medio — Greedy' },
  { id: 'minimax_bot', label: 'Difícil — Minimax' },
];

const Game: React.FC<GameProps> = ({ size = 5, onGameReset, userId = null, username = 'Azul' }) => {
  const [boardSize, setBoardSize] = useState<number>(size);
  const [yen, setYen] = useState<YEN>({ size, turn: 0, players: ['B', 'R'], layout: '' });
  const [status, setStatus] = useState<string>('Tu turno');
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedBot, setSelectedBot] = useState<string>(BOT_DIFFICULTIES[0].id);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [playerWon, setPlayerWon] = useState<boolean | null>(null);

  const initializeLayout = (s: number): string => {
    const rows: string[] = [];
    for (let i = 1; i <= s; i++) rows.push('.'.repeat(i));
    return rows.join('/');
  };

  const createInitialGame = (s: number): YEN => ({
    size: s, turn: 0, players: ['B', 'R'], layout: initializeLayout(s),
  });

  useEffect(() => {
    setYen(createInitialGame(boardSize));
    setStatus('Tu turno');
    setGameOver(false);
    setPlayerWon(null);
  }, [boardSize]);

  const saveGame = async (layoutStr: string, botWon: boolean) => {
    const players = [
      { userId, name: username, isWinner: !botWon },
      { userId: null, name: 'Bot (Rojo)', isWinner: botWon },
    ];
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yen: layoutStr, players }),
      });
    } catch (e) {
      console.error('Failed to save game', e);
    }
  };

  const toCubeCoords = (row: number, col: number, s: number) => {
    const x = s - 1 - row;
    const y = col;
    const z = s - 1 - x - y;
    return { x, y, z };
  };

  const handleCellClick = async (row: number, col: number) => {
    if (yen.turn !== 0 || loading || gameOver) return;
    const rows = yen.layout.split('/');
    if (rows[row][col] !== '.') return;

    setLoading(true);
    setStatus('Procesando...');

    try {
      const coords = toCubeCoords(row, col, boardSize);
      const humanResult = await makeHumanMove(yen, coords, 0);
      setYen(humanResult.yen);

      if (humanResult.status === 'Finished') {
        setStatus('¡Has ganado!');
        setGameOver(true);
        setPlayerWon(true);
        await saveGame(humanResult.yen.layout, false);
        setLoading(false);
        return;
      }

      setStatus('Bot pensando...');
      const botChoice = await chooseMove(humanResult.yen, selectedBot);
      const botResult = await makeHumanMove(humanResult.yen, botChoice.coords, 1);
      setYen(botResult.yen);

      if (botResult.status === 'Finished') {
        setStatus('El bot ha ganado');
        setGameOver(true);
        setPlayerWon(false);
        await saveGame(botResult.yen.layout, true);
      } else {
        setStatus('Tu turno');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error desconocido';
      setStatus(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetGame = () => {
    setYen(createInitialGame(boardSize));
    setStatus('Tu turno');
    setLoading(false);
    setGameOver(false);
    setPlayerWon(null);
    onGameReset?.();
  };

  const renderBoard = () => {
    const rows = yen.layout.split('/');
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', py: 2 }}>
        {rows.map((rowStr, rowIndex) => (
          <Box key={rowIndex} sx={{ display: 'flex', gap: '4px', ml: `${rowIndex * -10}px` }}>
            {rowStr.split('').map((cell, colIndex) => {
              const isEmpty = cell === '.';
              const isBlue = cell === 'B';
              const isRed = cell === 'R';
              const clickable = isEmpty && yen.turn === 0 && !gameOver && !loading;

              return (
                <Box
                  key={colIndex}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  sx={{
                    width: { xs: 28, sm: 34 },
                    height: { xs: 28, sm: 34 },
                    borderRadius: '50%',
                    backgroundColor: isBlue
                      ? '#3b82f6'
                      : isRed
                      ? '#ef4444'
                      : '#0d1f35',
                    border: isBlue
                      ? '2px solid #60a5fa'
                      : isRed
                      ? '2px solid #f87171'
                      : '2px solid #00e5ff22',
                    cursor: clickable ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                    boxShadow: isBlue
                      ? '0 0 10px #3b82f688'
                      : isRed
                      ? '0 0 10px #ef444488'
                      : 'none',
                    '&:hover': clickable
                      ? {
                          backgroundColor: '#1a3a5c',
                          border: '2px solid #00e5ff88',
                          boxShadow: '0 0 12px #00e5ff44',
                          transform: 'scale(1.15)',
                        }
                      : {},
                  }}
                />
              );
            })}
          </Box>
        ))}
      </Box>
    );
  };

  const getStatusColor = () => {
    if (playerWon === true) return '#00e676';
    if (playerWon === false) return '#ff3d71';
    if (loading) return '#ffab40';
    return '#00e5ff';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Config panel */}
      <Paper
        sx={{
          p: 2.5,
          border: '1px solid #00e5ff15',
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel sx={{ color: '#7a9bb5', fontFamily: '"Rajdhani"', '&.Mui-focused': { color: '#00e5ff' } }}>
            <GridOnIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            Tamaño
          </InputLabel>
          <Select
            value={boardSize}
            label="⬡ Tamaño"
            onChange={(e) => setBoardSize(Number(e.target.value))}
            disabled={loading}
            sx={{
              color: '#e8f4fd',
              fontFamily: '"Rajdhani"',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#00e5ff22' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00e5ff44' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00e5ff' },
              '& .MuiSvgIcon-root': { color: '#7a9bb5' },
            }}
          >
            {[5, 6, 7, 8, 9, 10].map(n => (
              <MenuItem key={n} value={n} sx={{ fontFamily: '"Rajdhani"', color: '#e8f4fd', backgroundColor: '#0d1526', '&:hover': { backgroundColor: '#00e5ff11' }, '&.Mui-selected': { backgroundColor: '#00e5ff1a' } }}>
                {n} × {n}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel sx={{ color: '#7a9bb5', fontFamily: '"Rajdhani"', '&.Mui-focused': { color: '#00e5ff' } }}>
            <SmartToyIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
            Dificultad
          </InputLabel>
          <Select
            value={selectedBot}
            label="🤖 Dificultad"
            onChange={(e) => setSelectedBot(e.target.value)}
            disabled={loading}
            sx={{
              color: '#e8f4fd',
              fontFamily: '"Rajdhani"',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#00e5ff22' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00e5ff44' },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00e5ff' },
              '& .MuiSvgIcon-root': { color: '#7a9bb5' },
            }}
          >
            {BOT_DIFFICULTIES.map(bot => (
              <MenuItem key={bot.id} value={bot.id} sx={{ fontFamily: '"Rajdhani"', color: '#e8f4fd', backgroundColor: '#0d1526', '&:hover': { backgroundColor: '#00e5ff11' }, '&.Mui-selected': { backgroundColor: '#00e5ff1a' } }}>
                {bot.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ ml: 'auto' }}>
          <Button
            onClick={resetGame}
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            sx={{ borderColor: '#00e5ff22', color: '#7a9bb5', '&:hover': { borderColor: '#00e5ff', color: '#00e5ff', backgroundColor: '#00e5ff0a' } }}
          >
            Nueva
          </Button>
        </Box>
      </Paper>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#3b82f6', boxShadow: '0 0 6px #3b82f6' }} />
          <Typography sx={{ color: '#7a9bb5', fontSize: '0.8rem', fontFamily: '"Rajdhani"', fontWeight: 600 }}>{username}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 6px #ef4444' }} />
          <Typography sx={{ color: '#7a9bb5', fontSize: '0.8rem', fontFamily: '"Rajdhani"', fontWeight: 600 }}>Bot</Typography>
        </Box>
      </Box>

      {/* Board */}
      <Paper
        sx={{
          p: { xs: 2, sm: 3 },
          border: '1px solid #00e5ff15',
          background: 'linear-gradient(135deg, #0a1628 0%, #0d1526 100%)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='35'%3E%3Cpolygon points='15,3 27,9 27,26 15,32 3,26 3,9' fill='none' stroke='%2300e5ff' stroke-width='0.5' opacity='0.06'/%3E%3C/svg%3E")`,
            backgroundSize: '30px 35px',
            pointerEvents: 'none',
          },
        }}
      >
        {renderBoard()}
      </Paper>

      {/* Status */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          py: 1.5,
          px: 3,
          borderRadius: 1,
          border: `1px solid ${getStatusColor()}33`,
          backgroundColor: `${getStatusColor()}08`,
          transition: 'all 0.3s ease',
        }}
      >
        {gameOver && playerWon && <EmojiEventsIcon sx={{ color: '#00e676', fontSize: 20 }} />}
        {gameOver && !playerWon && <SmartToyIcon sx={{ color: '#ff3d71', fontSize: 20 }} />}
        <Typography
          sx={{
            color: getStatusColor(),
            fontFamily: '"Orbitron"',
            fontWeight: 700,
            fontSize: '0.85rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {status}
        </Typography>
        {loading && (
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: '2px solid #ffab4033',
              borderTopColor: '#ffab40',
              animation: 'spin 0.8s linear infinite',
              '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
            }}
          />
        )}
      </Box>

      {/* Chip players */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
        <Chip
          label={`Turno: ${yen.turn === 0 ? username : 'Bot'}`}
          size="small"
          sx={{
            backgroundColor: yen.turn === 0 ? '#3b82f611' : '#ef444411',
            border: `1px solid ${yen.turn === 0 ? '#3b82f644' : '#ef444444'}`,
            color: yen.turn === 0 ? '#93c5fd' : '#fca5a5',
            fontFamily: '"Rajdhani"',
            fontWeight: 600,
            fontSize: '0.75rem',
          }}
        />
        <Chip
          label={`Tamaño: ${boardSize}`}
          size="small"
          sx={{ backgroundColor: '#00e5ff0a', border: '1px solid #00e5ff22', color: '#7a9bb5', fontFamily: '"Rajdhani"' }}
        />
      </Box>

      {/* Win/Lose buttons */}
      {gameOver && (
        <Button
          onClick={resetGame}
          variant="contained"
          size="large"
          startIcon={<RefreshIcon />}
          fullWidth
          sx={{
            mt: 1,
            py: 1.5,
            background: playerWon
              ? 'linear-gradient(135deg, #00e676 0%, #00b248 100%)'
              : 'linear-gradient(135deg, #ff3d71 0%, #c4003f 100%)',
            color: '#fff',
            boxShadow: playerWon ? '0 0 25px #00e67644' : '0 0 25px #ff3d7144',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: playerWon ? '0 0 40px #00e67666' : '0 0 40px #ff3d7166',
            },
          }}
        >
          Jugar de nuevo
        </Button>
      )}
    </Box>
  );
};

export default Game;
