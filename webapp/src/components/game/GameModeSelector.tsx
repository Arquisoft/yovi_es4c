/**
 * GameModeSelector.tsx
 *
 * Pantalla previa al juego donde el usuario elige:
 *  - Modo: vs Bot | vs Jugador (multijugador)
 *  - Tamaño del tablero
 *  - En modo bot: dificultad del bot y quién empieza (jugador o bot)
 *
 * Al pulsar "Jugar" llama a onStart(config) y el padre decide qué montar.
 */
import {
  Box, Button, Container, Divider, FormControl, FormControlLabel,
  InputLabel, MenuItem, Paper, Radio, RadioGroup, Select, Typography,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import GroupIcon from '@mui/icons-material/Group';
import HexagonIcon from '@mui/icons-material/Hexagon';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useState } from 'react';

// ---- Tipos públicos ----
export type GameMode = 'bot' | 'multiplayer';

export interface GameConfig {
  mode: GameMode;
  boardSize: number;
  /** Solo relevante en modo bot */
  botDifficulty: string;
  /** Solo relevante en modo bot: 0 = jugador empieza, 1 = bot empieza */
  humanPlayerIndex: 0 | 1;
}

// ---- Constantes ----
const BOT_DIFFICULTIES = [
  { id: 'random_bot',  label: 'Fácil — Aleatorio' },
  { id: 'greedy_bot',  label: 'Medio — Greedy'    },
  { id: 'minimax_bot', label: 'Difícil — Minimax'  },
];
const MIN_SIZE = 5;
const MAX_SIZE = 14;

// ---- Props ----
interface GameModeSelectorProps {
  onStart: (config: GameConfig) => void;
}

export default function GameModeSelector({ onStart }: GameModeSelectorProps) {
  const [mode, setMode]               = useState<GameMode>('bot');
  const [boardSize, setBoardSize]     = useState(7);
  const [botDiff, setBotDiff]         = useState('random_bot');
  const [humanIdx, setHumanIdx]       = useState<0 | 1>(0); // 0 = jugador empieza

  const changeSize = (d: number) =>
    setBoardSize(s => Math.min(MAX_SIZE, Math.max(MIN_SIZE, s + d)));

  const handleStart = () =>
    onStart({ mode, boardSize, botDifficulty: botDiff, humanPlayerIndex: humanIdx });

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        background: 'radial-gradient(ellipse 80% 40% at 50% 0%, #00e5ff06 0%, transparent 60%), #060b18',
        display: 'flex',
        alignItems: 'center',
        py: 6,
      }}
    >
      <Container maxWidth="xs">
        {/* Título */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 5 }}>
          <HexagonIcon sx={{ color: '#00e5ff', fontSize: 22, filter: 'drop-shadow(0 0 4px #00e5ff88)' }} />
          <Typography variant="h5">NUEVA PARTIDA</Typography>
          <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, #00e5ff22, transparent)' }} />
        </Box>

        {/* Selección de modo */}
        <Typography variant="overline" color="text.secondary">Modo de juego</Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 1, mb: 4 }}>
          <ModeCard
            icon={<SmartToyIcon />}
            label="vs Bot"
            sublabel="Juega contra la IA"
            selected={mode === 'bot'}
            onClick={() => setMode('bot')}
            data-testid="mode-bot"
          />
          <ModeCard
            icon={<GroupIcon />}
            label="vs Jugador"
            sublabel="Sala multijugador online"
            selected={mode === 'multiplayer'}
            onClick={() => setMode('multiplayer')}
            data-testid="mode-multiplayer"
          />
        </Box>

        <Divider sx={{ borderColor: '#00e5ff15', mb: 4 }} />

        {/* Tamaño del tablero */}
        <Typography variant="overline" color="text.secondary">Tamaño del tablero</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, mb: 4 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => changeSize(-1)}
            disabled={boardSize <= MIN_SIZE}
            aria-label="reducir tamaño"
            data-testid="size-decrease"
          >
            <RemoveIcon fontSize="small" />
          </Button>
          <Typography
            variant="h4"
            sx={{ minWidth: 40, textAlign: 'center', color: 'primary.main' }}
            data-testid="board-size-value"
          >
            {boardSize}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={() => changeSize(1)}
            disabled={boardSize >= MAX_SIZE}
            aria-label="aumentar tamaño"
            data-testid="size-increase"
          >
            <AddIcon fontSize="small" />
          </Button>
          <Typography variant="body2" color="text.secondary">
            {boardSize}×{boardSize}
          </Typography>
        </Box>

        {/* Opciones extra solo para modo bot */}
        {mode === 'bot' && (
          <>
            <Typography variant="overline" color="text.secondary">Dificultad del bot</Typography>
            <FormControl fullWidth size="small" sx={{ mt: 1, mb: 3 }}>
              <InputLabel id="diff-label">Dificultad</InputLabel>
              <Select
                labelId="diff-label"
                value={botDiff}
                label="Dificultad"
                onChange={e => setBotDiff(e.target.value)}
                inputProps={{ 'data-testid': 'difficulty-select' }}
              >
                {BOT_DIFFICULTIES.map(b => (
                  <MenuItem key={b.id} value={b.id}>{b.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="overline" color="text.secondary">¿Quién empieza?</Typography>
            <Paper variant="outlined" sx={{ mt: 1, mb: 4, px: 2, py: 1 }}>
              <RadioGroup
                row
                value={String(humanIdx)}
                onChange={e => setHumanIdx(Number(e.target.value) as 0 | 1)}
                aria-label="quién empieza"
              >
                <FormControlLabel
                  value="0"
                  control={<Radio size="small" />}
                  label="Yo (Azul)"
                  data-testid="starts-human"
                />
                <FormControlLabel
                  value="1"
                  control={<Radio size="small" />}
                  label="Bot (Azul)"
                  data-testid="starts-bot"
                />
              </RadioGroup>
            </Paper>
          </>
        )}

        {/* Botón de inicio */}
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleStart}
          data-testid="btn-start-game"
        >
          {mode === 'bot' ? '⚡ JUGAR CONTRA BOT' : '🌐 BUSCAR SALA'}
        </Button>
      </Container>
    </Box>
  );
}

// ---- Sub-componente de tarjeta de modo ----
interface ModeCardProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  selected: boolean;
  onClick: () => void;
  'data-testid'?: string;
}

function ModeCard({ icon, label, sublabel, selected, onClick, 'data-testid': testId }: ModeCardProps) {
  return (
    <Box
      role="button"
      aria-pressed={selected}
      onClick={onClick}
      data-testid={testId}
      sx={{
        flex: 1,
        p: 2,
        border: `2px solid ${selected ? 'primary.main' : '#00e5ff15'}`,
        borderColor: selected ? 'primary.main' : '#00e5ff15',
        borderRadius: 1,
        cursor: 'pointer',
        background: selected ? '#00e5ff0d' : 'background.paper',
        transition: 'all 0.2s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        '&:hover': { borderColor: 'primary.dark', background: '#00e5ff08' },
      }}
    >
      <Box sx={{ color: selected ? 'primary.main' : 'text.secondary', '& svg': { fontSize: 28 } }}>
        {icon}
      </Box>
      <Typography variant="subtitle2" sx={{ color: selected ? 'primary.main' : 'text.primary' }}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
        {sublabel}
      </Typography>
    </Box>
  );
}
