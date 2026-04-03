/**
 * Game.tsx  (refactorizado)
 *
 * Partida contra el bot. Usa HexBoard para el tablero (geometría corregida).
 *
 * Novedades respecto al original:
 *  - Acepta `botDifficulty` y `humanPlayerIndex` (0 = humano empieza, 1 = bot empieza)
 *    desde GameModeSelector, eliminando la config inline.
 *  - La lógica de tablero ha salido a HexBoard.tsx.
 *  - Se eliminan los sx inline de MUI en la medida de lo posible.
 *  - Llama a la API Rust para AMBOS movimientos (humano y bot).
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Paper, Typography,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SmartToyIcon    from '@mui/icons-material/SmartToy';
import RefreshIcon     from '@mui/icons-material/Refresh';
import ArrowBackIcon   from '@mui/icons-material/ArrowBack';
import { type YEN, chooseMove, makeHumanMove } from '../../api/gameyClient';
import HexBoard from './HexBoard';

interface GameProps {
  boardSize:        number;
  botDifficulty:    string;
  humanPlayerIndex: 0 | 1;
  onGameEnd?:  () => void;
  onBack?:     () => void;
  userId?:     number | null;
  username?:   string;
}

type GamePhase = 'playing' | 'won' | 'lost';

function buildInitialYen(size: number): YEN {
  return {
    size, turn: 0, players: ['B', 'R'],
    layout: Array.from({ length: size }, (_, i) => '.'.repeat(i + 1)).join('/'),
  };
}

function toCube(row: number, col: number, size: number) {
  return { x: size - 1 - row, y: col, z: size - 1 - (size - 1 - row) - col };
}

const Game: React.FC<GameProps> = ({
  boardSize, botDifficulty, humanPlayerIndex,
  onGameEnd, onBack, userId = null, username = 'Azul',
}) => {
  const [yen,     setYen]     = useState<YEN>(() => buildInitialYen(boardSize));
  const [phase,   setPhase]   = useState<GamePhase>('playing');
  const [status,  setStatus]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const botIdx   = humanPlayerIndex === 0 ? 1 : 0;
  const isMyTurn = yen.turn === humanPlayerIndex && phase === 'playing';

  const saveGame = useCallback(async (finalLayout: string, humanWon: boolean) => {
    const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
    try {
      await fetch(`${API_URL}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yen: finalLayout,
          players: [
            { userId, name: username, isWinner:  humanWon },
            { userId: null, name: 'Bot',         isWinner: !humanWon },
          ],
        }),
      });
      onGameEnd?.();
    } catch (e) { console.error('saveGame error', e); }
  }, [userId, username, onGameEnd]);

  const runBotTurn = useCallback(async (currentYen: YEN) => {
    setStatus('Bot pensando...');
    setLoading(true);
    try {
      const choice    = await chooseMove(currentYen, botDifficulty);
      const botResult = await makeHumanMove(currentYen, choice.coords, botIdx);
      setYen(botResult.yen);
      if (botResult.status === 'Finished') {
        setPhase('lost'); setStatus('El bot ha ganado');
        await saveGame(botResult.yen.layout, false);
      } else {
        setStatus('Tu turno');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error en el turno del bot');
    } finally {
      setLoading(false);
    }
  }, [botDifficulty, botIdx, saveGame]);

  // Si el bot empieza (humanPlayerIndex=1) disparamos su primer turno
  useEffect(() => {
    if (humanPlayerIndex === 1 && phase === 'playing') {
      runBotTurn(yen);
    }
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCellClick = async (row: number, col: number) => {
    if (!isMyTurn || loading) return;
    if (yen.layout.split('/')?.[row]?.[col] !== '.') return;
    setLoading(true); setError(null); setStatus('Procesando...');
    try {
      const humanResult = await makeHumanMove(yen, toCube(row, col, boardSize), humanPlayerIndex);
      setYen(humanResult.yen);
      if (humanResult.status === 'Finished') {
        setPhase('won'); setStatus('¡Has ganado!');
        await saveGame(humanResult.yen.layout, true);
        setLoading(false); return;
      }
      await runBotTurn(humanResult.yen);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    const fresh = buildInitialYen(boardSize);
    setYen(fresh); setPhase('playing'); setError(null);
    setStatus(humanPlayerIndex === 0 ? 'Tu turno' : '');
    if (humanPlayerIndex === 1) runBotTurn(fresh);
  };

  const statusColor = phase === 'won' ? '#00e676' : phase === 'lost' ? '#ff3d71' : loading ? '#ffab40' : '#00e5ff';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Cabecera */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Button size="small" variant="text" startIcon={<ArrowBackIcon />}
          onClick={onBack} sx={{ color: 'text.secondary' }} data-testid="btn-back">
          Menú
        </Button>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {([
            { fill: '#1d4ed8', stroke: '#60a5fa', label: `${username} (${humanPlayerIndex === 0 ? 'Azul' : 'Rojo'})` },
            { fill: '#b91c1c', stroke: '#f87171', label: `Bot (${humanPlayerIndex === 0 ? 'Rojo' : 'Azul'})` },
          ] as const).map(({ fill, stroke, label }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <svg width={12} height={12} viewBox="0 0 12 12">
                <polygon points="6,1 11,3.5 11,8.5 6,11 1,8.5 1,3.5" fill={fill} stroke={stroke} strokeWidth={1.5} />
              </svg>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Tablero SVG corregido */}
      <HexBoard
        layout={yen.layout}
        boardSize={boardSize}
        currentTurn={yen.turn}
        canInteract={isMyTurn}
        gameOver={phase !== 'playing'}
        loading={loading}
        onCellClick={handleCellClick}
      />

      {/* Estado */}
      <Paper variant="outlined"
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 1.5, py: 1.5, px: 3,
          borderColor: `${statusColor}33`, bgcolor: `${statusColor}08`, transition: 'all 0.3s ease' }}>
        {phase === 'won'  && <EmojiEventsIcon sx={{ color: '#00e676', fontSize: 20 }} />}
        {phase === 'lost' && <SmartToyIcon    sx={{ color: '#ff3d71', fontSize: 20 }} />}
        <Typography variant="button" sx={{ color: statusColor, letterSpacing: '0.1em' }}
          data-testid="bot-game-status">{status}</Typography>
        {loading && <CircularProgress size={16} sx={{ color: '#ffab40' }} />}
      </Paper>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      {phase !== 'playing' && (
        <Button variant="contained" size="large" startIcon={<RefreshIcon />}
          onClick={reset} fullWidth color={phase === 'won' ? 'success' : 'error'}
          data-testid="btn-play-again">
          Jugar de nuevo
        </Button>
      )}
    </Box>
  );
};

export default Game;
