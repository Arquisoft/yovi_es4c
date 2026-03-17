import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Button, FormControl, InputLabel, MenuItem,
  Paper, Select, Typography, TextField, InputAdornment,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import RefreshIcon from '@mui/icons-material/Refresh';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
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

const MIN_SIZE = 5;

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

function getBoardLayout(n: number, hexR: number) {
  const hexH = Math.sqrt(3) * hexR;
  const colStep = hexR * 1.5;
  const rowStep = hexH;
  const cells: { row: number; col: number; cx: number; cy: number }[] = [];

  for (let row = 0; row < n; row++) {
    for (let col = 0; col <= row; col++) {
      const cx = (n - 1 - row) * (colStep / 2) + col * colStep + hexR;
      const cy = row * rowStep + hexH / 2;
      cells.push({ row, col, cx, cy });
    }
  }

  const maxCx = Math.max(...cells.map(c => c.cx));
  const maxCy = Math.max(...cells.map(c => c.cy));
  return { cells, totalW: maxCx + hexR, totalH: maxCy + hexH / 2 };
}

const Game: React.FC<GameProps> = ({ size = 5, onGameReset, userId = null, username = 'Azul' }) => {
  const [boardSize, setBoardSize] = useState<number>(size);
  const [sizeInput, setSizeInput] = useState<string>(String(size));
  const [yen, setYen] = useState<YEN>({ size, turn: 0, players: ['B', 'R'], layout: '' });
  const [status, setStatus] = useState<string>('Tu turno');
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedBot, setSelectedBot] = useState<string>(BOT_DIFFICULTIES[0].id);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [playerWon, setPlayerWon] = useState<boolean | null>(null);
  const boardRef = useRef<SVGSVGElement>(null);

  const initializeLayout = (s: number): string =>
    Array.from({ length: s }, (_, i) => '.'.repeat(i + 1)).join('/');

  const createInitialGame = (s: number): YEN => ({
    size: s, turn: 0, players: ['B', 'R'], layout: initializeLayout(s),
  });

  useEffect(() => {
    setYen(createInitialGame(boardSize));
    setStatus('Tu turno');
    setGameOver(false);
    setPlayerWon(null);
  }, [boardSize]);

  const applySize = () => {
    const n = parseInt(sizeInput, 10);
    if (!isNaN(n) && n >= MIN_SIZE) setBoardSize(n);
    else setSizeInput(String(boardSize));
  };

  const changeSize = (delta: number) => {
    const n = Math.max(MIN_SIZE, boardSize + delta);
    setBoardSize(n);
    setSizeInput(String(n));
  };

  const saveGame = async (layoutStr: string, botWon: boolean) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yen: layoutStr,
          players: [
            { userId, name: username, isWinner: !botWon },
            { userId: null, name: 'Bot (Rojo)', isWinner: botWon },
          ],
        }),
      });
    } catch (e) { console.error('Failed to save game', e); }
  };

  const toCubeCoords = (row: number, col: number, s: number) => ({
    x: s - 1 - row, y: col, z: s - 1 - (s - 1 - row) - col,
  });

  const handleCellClick = async (row: number, col: number) => {
    if (yen.turn !== 0 || loading || gameOver) return;
    if (yen.layout.split('/')?.[row]?.[col] !== '.') return;
    setLoading(true); setStatus('Procesando...');
    try {
      const humanResult = await makeHumanMove(yen, toCubeCoords(row, col, boardSize), 0);
      setYen(humanResult.yen);
      if (humanResult.status === 'Finished') {
        setStatus('¡Has ganado!'); setGameOver(true); setPlayerWon(true);
        await saveGame(humanResult.yen.layout, false); setLoading(false); return;
      }
      setStatus('Bot pensando...');
      const botChoice = await chooseMove(humanResult.yen, selectedBot);
      const botResult = await makeHumanMove(humanResult.yen, botChoice.coords, 1);
      setYen(botResult.yen);
      if (botResult.status === 'Finished') {
        setStatus('El bot ha ganado'); setGameOver(true); setPlayerWon(false);
        await saveGame(botResult.yen.layout, true);
      } else setStatus('Tu turno');
    } catch (e: unknown) {
      setStatus(`Error: ${e instanceof Error ? e.message : 'Desconocido'}`);
    } finally { setLoading(false); }
  };

  const resetGame = () => {
    setYen(createInitialGame(boardSize)); setStatus('Tu turno');
    setLoading(false); setGameOver(false); setPlayerWon(null);
    onGameReset?.();
  };

  const statusColor = playerWon === true ? '#00e676' : playerWon === false ? '#ff3d71' : loading ? '#ffab40' : '#00e5ff';
  const HEX_R = Math.max(14, Math.min(30, Math.floor(230 / boardSize)));
  const { cells, totalW, totalH } = getBoardLayout(boardSize, HEX_R);
  const PAD = HEX_R * 1.5;
  const svgW = totalW + PAD * 2;
  const svgH = totalH + PAD * 2;
  const layoutRows = yen.layout ? yen.layout.split('/') : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Config */}
      <Paper sx={{ p: 2, border: '1px solid #00e5ff15', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Button size="small" onClick={() => changeSize(-1)} disabled={boardSize <= MIN_SIZE || loading}
            variant="outlined" sx={{ minWidth: 30, p: '4px', borderColor: '#00e5ff22', color: '#7a9bb5', '&:hover': { borderColor: '#00e5ff', color: '#00e5ff' } }}>
            <RemoveIcon sx={{ fontSize: 14 }} />
          </Button>
          <TextField
            value={sizeInput}
            onChange={(e) => setSizeInput(e.target.value)}
            onBlur={applySize}
            onKeyDown={(e) => e.key === 'Enter' && applySize()}
            size="small" label="Tamaño" disabled={loading}
            inputProps={{ min: MIN_SIZE, style: { textAlign: 'center', width: 34, fontFamily: '"Orbitron"', fontWeight: 700, fontSize: '0.95rem', color: '#00e5ff', padding: '6px 4px' } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Typography sx={{ color: '#7a9bb5', fontSize: '0.7rem', fontFamily: '"Rajdhani"' }}>⬡</Typography></InputAdornment> }}
            sx={{ width: 105 }}
          />
          <Button size="small" onClick={() => changeSize(1)} disabled={loading}
            variant="outlined" sx={{ minWidth: 30, p: '4px', borderColor: '#00e5ff22', color: '#7a9bb5', '&:hover': { borderColor: '#00e5ff', color: '#00e5ff' } }}>
            <AddIcon sx={{ fontSize: 14 }} />
          </Button>
        </Box>

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel sx={{ color: '#7a9bb5', fontFamily: '"Rajdhani"', '&.Mui-focused': { color: '#00e5ff' } }}>Dificultad</InputLabel>
          <Select value={selectedBot} label="Dificultad" onChange={(e) => setSelectedBot(e.target.value)} disabled={loading}
            sx={{ color: '#e8f4fd', fontFamily: '"Rajdhani"', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#00e5ff22' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00e5ff44' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00e5ff' }, '& .MuiSvgIcon-root': { color: '#7a9bb5' } }}>
            {BOT_DIFFICULTIES.map(bot => (
              <MenuItem key={bot.id} value={bot.id} sx={{ fontFamily: '"Rajdhani"', color: '#e8f4fd', backgroundColor: '#0d1526', '&:hover': { backgroundColor: '#00e5ff11' }, '&.Mui-selected': { backgroundColor: '#00e5ff1a' } }}>
                {bot.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ ml: 'auto' }}>
          <Button onClick={resetGame} variant="outlined" size="small" startIcon={<RefreshIcon />}
            sx={{ borderColor: '#00e5ff22', color: '#7a9bb5', '&:hover': { borderColor: '#00e5ff', color: '#00e5ff', backgroundColor: '#00e5ff0a' } }}>
            Nueva
          </Button>
        </Box>
      </Paper>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {[{ color: '#1d4ed8', stroke: '#60a5fa', label: username }, { color: '#b91c1c', stroke: '#f87171', label: 'Bot' }].map(({ color, stroke, label }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <svg width={14} height={14} viewBox="0 0 14 14">
              <polygon points={hexPoints(7, 7, 6)} fill={color} stroke={stroke} strokeWidth={1.5} />
            </svg>
            <Typography sx={{ color: '#7a9bb5', fontSize: '0.8rem', fontFamily: '"Rajdhani"', fontWeight: 600 }}>{label}</Typography>
          </Box>
        ))}
      </Box>

      {/* SVG Board */}
      <Paper sx={{ p: { xs: 1, sm: 2 }, border: '1px solid #00e5ff15', background: 'linear-gradient(135deg, #0a1628 0%, #0d1526 100%)', overflow: 'auto' }}>
        <svg
          ref={boardRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ width: '100%', maxWidth: `${svgW}px`, height: 'auto', display: 'block', margin: '0 auto' }}
        >
          <defs>
            <filter id="glow-b" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-r" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {cells.map(({ row, col, cx, cy }) => {
            const cell = layoutRows[row]?.[col] ?? '.';
            const isBlue = cell === 'B';
            const isRed = cell === 'R';
            const isEmpty = cell === '.';
            const clickable = isEmpty && yen.turn === 0 && !gameOver && !loading;
            const pcx = cx + PAD, pcy = cy + PAD;
            const pts = hexPoints(pcx, pcy, HEX_R - 2);

            return (
              <g key={`${row}-${col}`}
                onClick={() => handleCellClick(row, col)}
                style={{ cursor: clickable ? 'pointer' : 'default' }}>
                <polygon points={pts}
                  fill={isBlue ? '#1d4ed8' : isRed ? '#b91c1c' : '#0d1f35'}
                  stroke={isBlue ? '#60a5fa' : isRed ? '#f87171' : '#00e5ff25'}
                  strokeWidth={isBlue || isRed ? 2 : 1}
                  filter={isBlue ? 'url(#glow-b)' : isRed ? 'url(#glow-r)' : undefined}
                  style={{ transition: 'fill 0.12s, stroke 0.12s' }}
                />
                {(isBlue || isRed) && (
                  <circle cx={pcx} cy={pcy} r={HEX_R * 0.28}
                    fill={isBlue ? '#93c5fd' : '#fca5a5'} opacity={0.75} />
                )}
                {clickable && (
                  <polygon points={hexPoints(pcx, pcy, HEX_R - 1)}
                    fill="transparent" stroke="none"
                    onMouseEnter={(e) => {
                      const sib = e.currentTarget.previousElementSibling as SVGPolygonElement;
                      if (sib) { sib.setAttribute('fill', '#1a3a5c'); sib.setAttribute('stroke', '#00e5ff99'); sib.setAttribute('stroke-width', '2'); }
                    }}
                    onMouseLeave={(e) => {
                      const sib = e.currentTarget.previousElementSibling as SVGPolygonElement;
                      if (sib) { sib.setAttribute('fill', '#0d1f35'); sib.setAttribute('stroke', '#00e5ff25'); sib.setAttribute('stroke-width', '1'); }
                    }}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </Paper>

      {/* Status */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 1.5, px: 3, borderRadius: 1, border: `1px solid ${statusColor}33`, backgroundColor: `${statusColor}08`, transition: 'all 0.3s ease' }}>
        {gameOver && playerWon && <EmojiEventsIcon sx={{ color: '#00e676', fontSize: 20 }} />}
        {gameOver && !playerWon && <SmartToyIcon sx={{ color: '#ff3d71', fontSize: 20 }} />}
        <Typography sx={{ color: statusColor, fontFamily: '"Orbitron"', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {status}
        </Typography>
        {loading && <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #ffab4033', borderTopColor: '#ffab40', animation: 'spin 0.8s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />}
      </Box>

      {gameOver && (
        <Button onClick={resetGame} variant="contained" size="large" startIcon={<RefreshIcon />} fullWidth
          sx={{ mt: 1, py: 1.5, background: playerWon ? 'linear-gradient(135deg,#00e676,#00b248)' : 'linear-gradient(135deg,#ff3d71,#c4003f)', color: '#fff', boxShadow: playerWon ? '0 0 25px #00e67644' : '0 0 25px #ff3d7144', '&:hover': { transform: 'translateY(-2px)' } }}>
          Jugar de nuevo
        </Button>
      )}
    </Box>
  );
};

export default Game;
