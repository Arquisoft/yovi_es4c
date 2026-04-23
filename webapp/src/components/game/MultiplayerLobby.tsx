/**
 * MultiplayerLobby.tsx
 *
 * Pantalla de lobby multijugador.
 * - Tab "Crear sala": genera un código de 6 chars para compartir con el rival.
 * - Tab "Unirse":    introduce el código y entra a la sala.
 * - En estado waiting: muestra el código + mensaje animado de espera. Sin chat.
 */
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HexagonIcon     from '@mui/icons-material/Hexagon';
import ArrowBackIcon   from '@mui/icons-material/ArrowBack';
import AddIcon         from '@mui/icons-material/Add';
import LoginIcon       from '@mui/icons-material/Login';
import PeopleIcon      from '@mui/icons-material/People'; 
import { type KeyboardEvent, useState } from 'react';
import type { RoomState } from '../../hooks/useWebSocketRoom';

interface MultiplayerLobbyProps {
  username:     string;
  boardSize:    number;
  roomState:    RoomState;
  onCreateRoom: () => void;
  onJoinRoom:   (code: string) => void;
  onDisconnect: () => void;
  onSendChat:   (text: string) => void;
}

export default function MultiplayerLobby({
  boardSize,
  roomState,
  onCreateRoom,
  onJoinRoom,
  onDisconnect,
}: MultiplayerLobbyProps) {
  const [tab, setTab]           = useState<0 | 1>(0);
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied]     = useState(false);

  const isIdle       = roomState.status === 'idle' || roomState.status === 'error';
  const isConnecting = roomState.status === 'connecting';
  const isWaiting    = roomState.status === 'waiting';
  const isConnected  = !isIdle && !isConnecting;

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length === 6) onJoinRoom(code);
  };

  const handleJoinKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleJoin();
  };

  const copyCode = () => {
    if (roomState.roomCode) {
      navigator.clipboard.writeText(roomState.roomCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Box sx={{
      minHeight: 'calc(100vh - 64px)',
      background: 'radial-gradient(ellipse 80% 40% at 50% 0%, #00e5ff06 0%, transparent 60%), #060b18',
      py: 4,
    }}>
      <Container maxWidth="sm">

        {/* Encabezado */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <HexagonIcon sx={{ color: '#00e5ff', fontSize: 22, filter: 'drop-shadow(0 0 4px #00e5ff88)' }} />
          <Typography variant="h5">SALA MULTIJUGADOR</Typography>
          <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, #00e5ff22, transparent)' }} />
          {isConnected && (
            <Button size="small" variant="text" startIcon={<ArrowBackIcon />}
              onClick={onDisconnect} sx={{ color: 'text.secondary' }} data-testid="btn-disconnect">
              Salir
            </Button>
          )}
        </Box>

        {/* Conectando */}
        {isConnecting && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Conectando…</Typography>
          </Box>
        )}

        {/* Error */}
        {roomState.status === 'error' && roomState.error && (
          <Alert severity="error" sx={{ mb: 3 }} data-testid="ws-error">{roomState.error}</Alert>
        )}

        {/* ── Estado idle: tabs Crear / Unirse ── */}
        {isIdle && (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}
              textColor="primary" indicatorColor="primary">
              <Tab icon={<AddIcon />} iconPosition="start" label="Crear sala" data-testid="tab-create" />
              <Tab icon={<LoginIcon />} iconPosition="start" label="Unirse a sala" data-testid="tab-join" />
            </Tabs>

            {tab === 0 && (
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Crea una sala nueva y comparte el código con tu rival.
                  Tablero: <strong>{boardSize}×{boardSize}</strong>.
                </Typography>
                <Button variant="contained" fullWidth size="large"
                  startIcon={<AddIcon />} onClick={onCreateRoom} data-testid="btn-create-room">
                  Crear sala
                </Button>
              </Paper>
            )}

            {tab === 1 && (
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Introduce el código de 6 caracteres que te ha dado tu rival.
                </Typography>
                <TextField fullWidth label="Código de sala" placeholder="ABC123"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  onKeyDown={handleJoinKey}
                  inputProps={{
                    maxLength: 6,
                    style: { textTransform: 'uppercase', letterSpacing: '0.3em', fontSize: '1.4rem', textAlign: 'center' },
                    'data-testid': 'join-code-input',
                  }}
                  sx={{ mb: 2 }} />
                <Button variant="contained" fullWidth size="large"
                  startIcon={<LoginIcon />} onClick={handleJoin}
                  disabled={joinCode.trim().length !== 6} data-testid="btn-join-room">
                  Unirse
                </Button>
              </Paper>
            )}
          </>
        )}

        {/* ── Estado waiting: código + mensajes de espera ── */}
        {isWaiting && (
          <>
            {/* Código de sala */}
            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Typography variant="caption" color="text.secondary">Tu código de sala</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, mb: 1.5 }}>
                <Typography variant="h4"
                  sx={{ fontFamily: '"Orbitron"', color: 'primary.main', letterSpacing: '0.3em' }}
                  data-testid="room-code-display">
                  {roomState.roomCode}
                </Typography>
                <IconButton onClick={copyCode} size="small" title="Copiar código" data-testid="copy-code-btn"><ContentCopyIcon fontSize="small" />
                </IconButton>
                {copied && <Typography variant="caption" color="success.main" data-testid="copy-confirm">¡Copiado!</Typography>}</Box>
              <Typography variant="body2" color="text.secondary">
                Tablero <strong>{roomState.boardSize}×{roomState.boardSize}</strong>.
                Comparte este código con tu rival para que se una.
              </Typography>
            </Paper>

            {/* Mensajes de espera animados */}
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              py: 4,
              px: 2,
              border: '1px solid #00e5ff15',
              borderRadius: 1,
              bgcolor: '#00e5ff04',
            }}>
              <PeopleIcon sx={{ fontSize: 48, color: '#00e5ff44' }} />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CircularProgress size={20} color="primary" />
                <Typography variant="body1" color="primary.main" fontWeight={700}>
                  Esperando a tu rival…
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Cuando tu rival introduzca el código, la partida comenzará automáticamente.
              </Typography>

              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                La asignación de colores será aleatoria al comenzar.
              </Typography>
            </Box>
          </>
        )}
      </Container>
    </Box>
  );
}