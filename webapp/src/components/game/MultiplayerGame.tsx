/**
 * MultiplayerGame.tsx
 *
 * Vista de la partida multijugador en tiempo real.
 *
 * Flujo de un movimiento:
 *  1. El jugador (mi turno) hace click en una celda.
 *  2. Se llama a makeHumanMove (API Rust /play) con el estado actual.
 *     → Rust valida y devuelve el nuevo layout + status.
 *  3. Se difunde el resultado al oponente vía WebSocket (broadcastMove).
 *  4. Si la partida ha terminado, se guarda en la BD via gateway.
 *
 * El oponente recibe 'board_update' / 'game_over' desde el servidor WS
 * y su estado se actualiza en useWebSocketRoom → RoomState.
 *
 * Chat integrado en panel lateral.
 */
import {
  Alert,
  Box,
  Button,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SmartToyIcon    from '@mui/icons-material/SmartToy';
import ArrowBackIcon   from '@mui/icons-material/ArrowBack';
import SendIcon        from '@mui/icons-material/Send';
import { type KeyboardEvent, useRef, useState } from 'react';
import HexBoard from './HexBoard';
import type { RoomState } from '../../hooks/useWebSocketRoom';
import { makeHumanMove } from '../../api/gameyClient';

interface MultiplayerGameProps {
  username: string;
  userId:   number | null;
  roomState: RoomState;
  onSendChat:     (text: string) => void;
  /** Difunde el tablero actualizado al oponente y actualiza el estado local */
  onBroadcastMove: (layout: string, turn: number, finished: boolean, winner?: number) => void;
  onLeave:    () => void;
  onSaveGame: (layout: string, winnerIdx: number) => Promise<void>;
}

export default function MultiplayerGame({
  username,
  userId: _userId,
  roomState,
  onSendChat,
  onBroadcastMove,
  onLeave,
  onSaveGame,
}: MultiplayerGameProps) {
  const [chatInput, setChatInput] = useState('');
  const [moveError, setMoveError] = useState<string | null>(null);
  const [moving, setMoving]       = useState(false);
  const chatEndRef                = useRef<HTMLDivElement>(null);

  const myIdx      = roomState.playerIndex ?? 0;
  const isMyTurn   = roomState.currentTurn === myIdx && roomState.status === 'playing';
  const isFinished = roomState.status === 'finished';
  const iWon       = isFinished && roomState.winner === myIdx;

  // ---- Conversión de coordenadas fila/col → cubicas ----
  const toCube = (row: number, col: number, size: number) => ({
    x: size - 1 - row,
    y: col,
    z: size - 1 - (size - 1 - row) - col,
  });

  // ---- Manejar click en celda ----
  const handleCellClick = async (row: number, col: number) => {
    if (!isMyTurn || moving) return;
    setMoving(true);
    setMoveError(null);

    try {
      const yen = {
        size:    roomState.boardSize,
        turn:    roomState.currentTurn,
        players: ['B', 'R'],
        layout:  roomState.layout,
      };
      const result = await makeHumanMove(yen, toCube(row, col, roomState.boardSize), myIdx);
      const finished = result.status === 'Finished';

      if (finished && result.winner !== undefined) {
        await onSaveGame(result.yen.layout, result.winner);
      }

      const nextTurn = (myIdx + 1) % 2;
      onBroadcastMove(
        result.yen.layout,
        finished ? myIdx : nextTurn,
        finished,
        result.winner,
      );
    } catch (e) {
      setMoveError(e instanceof Error ? e.message : 'Error al procesar movimiento');
    } finally {
      setMoving(false);
    }
  };

  // ---- Chat ----
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

  // ---- Colores / textos de estado ----
  const myColor  = myIdx === 0 ? '🔵 Azul' : '🔴 Rojo';
  const oppColor = myIdx === 0 ? '🔴 Rojo' : '🔵 Azul';
  const oppName  = roomState.opponentName ?? 'Oponente';

  const statusColor = iWon ? 'success.main' : isFinished ? 'error.main' : isMyTurn ? 'primary.main' : 'warning.main';
  const statusText  = isFinished
    ? (iWon ? '¡Has ganado!' : `${oppName} ha ganado`)
    : isMyTurn
    ? 'Tu turno'
    : `Turno de ${oppName}…`;

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>

        {/* ---- Panel izquierdo: tablero ---- */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Cabecera */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Tooltip title="Abandonar partida">
              <Button
                size="small"
                variant="text"
                startIcon={<ArrowBackIcon />}
                onClick={onLeave}
                sx={{ color: 'text.secondary' }}
                data-testid="btn-leave"
              >
                Salir
              </Button>
            </Tooltip>

            {/* Leyenda de colores */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              {([
                {
                  fill:   myIdx === 0 ? '#1d4ed8' : '#b91c1c',
                  stroke: myIdx === 0 ? '#60a5fa' : '#f87171',
                  label: `${username} (${myColor})`,
                },
                {
                  fill:   myIdx === 0 ? '#b91c1c' : '#1d4ed8',
                  stroke: myIdx === 0 ? '#f87171' : '#60a5fa',
                  label: `${oppName} (${oppColor})`,
                },
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

          {/* Tablero */}
          <HexBoard
            layout={roomState.layout}
            boardSize={roomState.boardSize}
            currentTurn={roomState.currentTurn}
            canInteract={isMyTurn}
            gameOver={isFinished}
            loading={moving}
            onCellClick={handleCellClick}
          />

          {/* Barra de estado */}
          <Box
            sx={{
              mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 1.5, py: 1.2, px: 2, borderRadius: 1,
              border: '1px solid', borderColor: `${statusColor}33`,
              bgcolor: `${statusColor}08`,
              transition: 'all 0.3s',
            }}
          >
            {iWon         && <EmojiEventsIcon sx={{ color: 'success.main', fontSize: 18 }} />}
            {isFinished && !iWon && <SmartToyIcon sx={{ color: 'error.main', fontSize: 18 }} />}
            <Typography
              variant="button"
              sx={{ color: statusColor, letterSpacing: '0.1em' }}
              data-testid="mp-game-status"
            >
              {statusText}
            </Typography>
            {moving && (
              <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid',
                borderColor: 'warning.light', borderTopColor: 'warning.main',
                animation: 'spin 0.8s linear infinite',
                '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }}
              />
            )}
          </Box>

          {moveError && <Alert severity="error" sx={{ mt: 1 }} data-testid="mp-move-error">{moveError}</Alert>}

          {isFinished && (
            <Button
              variant="contained"
              fullWidth
              startIcon={<ArrowBackIcon />}
              onClick={onLeave}
              sx={{ mt: 2 }}
              data-testid="btn-back-lobby"
            >
              Volver al menú
            </Button>
          )}
        </Box>

        {/* ---- Panel derecho: chat ---- */}
        <Box sx={{ width: { xs: '100%', md: 260 }, flexShrink: 0 }}>
          <Typography variant="overline" color="text.secondary">Chat en vivo</Typography>

          <Paper
            variant="outlined"
            sx={{
              mt: 1, mb: 1.5, height: 320, overflowY: 'auto', p: 1.5,
              display: 'flex', flexDirection: 'column', gap: 0.5,
              bgcolor: 'background.default',
            }}
            data-testid="mp-chat-box"
          >
            {roomState.chat.length === 0 && (
              <Typography variant="caption" color="text.secondary"
                sx={{ textAlign: 'center', mt: 6, display: 'block' }}>
                Sin mensajes aún…
              </Typography>
            )}
            {roomState.chat.map((msg, i) => {
              const own = msg.from === username;
              return (
                <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.2 }}>
                    {msg.from}
                  </Typography>
                  <Box sx={{
                    px: 1.5, py: 0.5, borderRadius: 1, maxWidth: '90%',
                    bgcolor: own ? '#00e5ff14' : 'background.paper',
                    border: '1px solid', borderColor: own ? '#00e5ff33' : '#00e5ff15',
                  }}>
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{msg.text}</Typography>
                  </Box>
                </Box>
              );
            })}
            <div ref={chatEndRef} />
          </Paper>

          <TextField
            fullWidth
            size="small"
            placeholder="Mensaje…"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={handleChatKey}
            inputProps={{ 'data-testid': 'mp-chat-input', maxLength: 200 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={handleSend}
                    disabled={!chatInput.trim()}
                    data-testid="mp-chat-send"
                  >
                    <SendIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>
    </Container>
  );
}
