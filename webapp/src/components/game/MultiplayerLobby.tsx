/**
 * MultiplayerLobby.tsx
 *
 * Pantalla de lobby multijugador con dos flujos:
 *
 *  CREAR SALA:
 *   → Pulsar "Crear sala" → servidor genera un roomCode de 6 caracteres
 *   → Se muestra el código para compartir con el amigo
 *   → Spinner mientras se espera al oponente
 *
 *  UNIRSE A SALA:
 *   → Introducir el código de 6 caracteres y pulsar "Unirse"
 *   → Si el código existe y tiene sitio, comienza la partida
 *
 *  CHAT:
 *   → Disponible en ambos estados (waiting / playing) para chatear antes de empezar
 */
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HexagonIcon     from '@mui/icons-material/Hexagon';
import WifiIcon        from '@mui/icons-material/Wifi';
import WifiOffIcon     from '@mui/icons-material/WifiOff';
import SendIcon        from '@mui/icons-material/Send';
import ArrowBackIcon   from '@mui/icons-material/ArrowBack';
import AddIcon         from '@mui/icons-material/Add';
import LoginIcon       from '@mui/icons-material/Login';
import { type KeyboardEvent, useRef, useState } from 'react';
import type { ChatMessage, RoomState } from '../hooks/useWebSocketRoom';

interface MultiplayerLobbyProps {
  username:    string;
  boardSize:   number;
  roomState:   RoomState;
  onCreateRoom: () => void;
  onJoinRoom:  (code: string) => void;
  onDisconnect: () => void;
  onSendChat:  (text: string) => void;
}

export default function MultiplayerLobby({
  username,
  boardSize,
  roomState,
  onCreateRoom,
  onJoinRoom,
  onDisconnect,
  onSendChat,
}: MultiplayerLobbyProps) {
  const [tab, setTab]           = useState<0 | 1>(0); // 0 = Crear, 1 = Unirse
  const [joinCode, setJoinCode] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied]     = useState(false);
  const chatEndRef              = useRef<HTMLDivElement>(null);

  const isIdle      = roomState.status === 'idle' || roomState.status === 'error';
  const isConnecting = roomState.status === 'connecting';
  const isWaiting   = roomState.status === 'waiting';
  const isConnected = !isIdle;

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length === 6) onJoinRoom(code);
  };

  const handleJoinKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleJoin();
  };

  const handleSend = () => {
    const text = chatInput.trim();
    if (!text) return;
    onSendChat(text);
    setChatInput('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleChatKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
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

        {/* ---- Estado: idle → mostrar tabs Crear/Unirse ---- */}
        {isIdle && (
          <>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{ mb: 3 }}
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab icon={<AddIcon />} iconPosition="start" label="Crear sala" data-testid="tab-create" />
              <Tab icon={<LoginIcon />} iconPosition="start" label="Unirse a sala" data-testid="tab-join" />
            </Tabs>

            {tab === 0 && (
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Crea una sala nueva y comparte el código de 6 caracteres con tu amigo.
                  El tablero será de <strong>{boardSize}×{boardSize}</strong>.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={onCreateRoom}
                  data-testid="btn-create-room"
                >
                  Crear sala
                </Button>
              </Paper>
            )}

            {tab === 1 && (
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Introduce el código de 6 caracteres que te ha compartido tu amigo.
                </Typography>
                <TextField
                  fullWidth
                  label="Código de sala"
                  placeholder="ABC123"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  onKeyDown={handleJoinKey}
                  inputProps={{
                    maxLength: 6,
                    style: { textTransform: 'uppercase', letterSpacing: '0.3em', fontSize: '1.4rem', textAlign: 'center' },
                    'data-testid': 'join-code-input',
                  }}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<LoginIcon />}
                  onClick={handleJoin}
                  disabled={joinCode.trim().length !== 6}
                  data-testid="btn-join-room"
                >
                  Unirse
                </Button>
              </Paper>
            )}
          </>
        )}

        {/* ---- Estado: connecting ---- */}
        {isConnecting && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">Conectando…</Typography>
          </Box>
        )}

        {/* ---- Estado: waiting (sala creada, esperando oponente) ---- */}
        {isWaiting && (
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <WifiIcon sx={{ color: 'success.main', fontSize: 18 }} />
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                Sala creada — esperando oponente
              </Typography>
            </Box>

            {/* Código de sala grande y copiable */}
            <Typography variant="caption" color="text.secondary">Código de sala:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
              <Typography
                variant="h4"
                sx={{ fontFamily: '"Orbitron"', color: 'primary.main', letterSpacing: '0.3em' }}
                data-testid="room-code-display"
              >
                {roomState.roomCode}
              </Typography>
              <IconButton onClick={copyCode} size="small" title="Copiar código">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
              {copied && (
                <Typography variant="caption" color="success.main">¡Copiado!</Typography>
              )}
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Comparte este código con tu amigo. El tablero es <strong>{roomState.boardSize}×{roomState.boardSize}</strong>.
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={16} color="warning" />
              <Typography variant="body2" color="warning.main" fontWeight={700}>
                Esperando a otro jugador…
              </Typography>
            </Box>
          </Paper>
        )}

        {/* ---- Error ---- */}
        {roomState.status === 'error' && roomState.error && (
          <Alert severity="error" sx={{ mb: 3 }} data-testid="ws-error">
            {roomState.error}
          </Alert>
        )}

        {/* ---- Chat de sala (cuando hay conexión activa) ---- */}
        {isConnected && !isConnecting && (
          <>
            <Divider sx={{ borderColor: '#00e5ff15', mb: 2 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <WifiOffIcon sx={{ display: 'none' }} />
              <Typography variant="overline" color="text.secondary">Chat de sala</Typography>
            </Box>

            <Paper variant="outlined" sx={{
              mb: 1.5, height: 200, overflowY: 'auto', p: 1.5,
              display: 'flex', flexDirection: 'column', gap: 0.5,
              bgcolor: 'background.default',
            }} data-testid="lobby-chat-box">
              {roomState.chat.length === 0 && (
                <Typography variant="caption" color="text.secondary"
                  sx={{ textAlign: 'center', mt: 5, display: 'block' }}>
                  Sé el primero en escribir…
                </Typography>
              )}
              {roomState.chat.map((msg, i) => (
                <ChatBubble key={i} msg={msg} own={msg.from === username} />
              ))}
              <div ref={chatEndRef} />
            </Paper>

            <TextField
              fullWidth size="small"
              placeholder="Escribe un mensaje y pulsa Enter…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={handleChatKey}
              inputProps={{ 'data-testid': 'lobby-chat-input', maxLength: 200 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleSend}
                      disabled={!chatInput.trim()} data-testid="lobby-chat-send">
                      <SendIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </>
        )}
      </Container>
    </Box>
  );
}

function ChatBubble({ msg, own }: { msg: ChatMessage; own: boolean }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start' }}>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25 }}>
        {msg.from}
      </Typography>
      <Box sx={{
        px: 1.5, py: 0.6, borderRadius: 1, maxWidth: '80%',
        bgcolor: own ? '#00e5ff14' : 'background.paper',
        border: '1px solid', borderColor: own ? '#00e5ff33' : '#00e5ff15',
      }}>
        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{msg.text}</Typography>
      </Box>
    </Box>
  );
}
