/**
 * GameView.tsx
 *
 * Orquestador de los modos de juego:
 *
 *  'selector' → GameModeSelector
 *  'bot'      → Game (vs bot)
 *  'mp-lobby' → MultiplayerLobby (crear / unirse por código)
 *               Cuando roomState.status = 'playing' → MultiplayerGame
 */
import { useCallback, useState } from 'react';
import { Box, Container, Typography } from '@mui/material';
import HexagonIcon from '@mui/icons-material/Hexagon';
import GameModeSelector, { type GameConfig } from './GameModeSelector';
import Game                                  from './Game';
import MultiplayerLobby                      from './MultiplayerLobby';
import MultiplayerGame                       from './MultiplayerGame';
import { useWebSocketRoom }                  from '../hooks/useWebSocketRoom';

type Phase = 'selector' | 'bot' | 'mp-lobby';

interface GameViewProps {
  userId:       number | null;
  username:     string;
  onGameReset?: () => void;
}

export default function GameView({ userId, username, onGameReset }: GameViewProps) {
  const [phase,  setPhase]  = useState<Phase>('selector');
  const [config, setConfig] = useState<GameConfig | null>(null);

  const { state: room, createRoom, joinRoom, broadcastMove, sendChat, disconnect } =
    useWebSocketRoom(username);

  const handleStart = (cfg: GameConfig) => {
    setConfig(cfg);
    if (cfg.mode === 'bot') {
      setPhase('bot');
    } else {
      setPhase('mp-lobby');
      // No conectamos aún: el jugador elige si crear o unirse en el lobby
    }
  };

  const handleBotGameEnd = useCallback(() => {
    onGameReset?.();
    setPhase('selector');
  }, [onGameReset]);

  const handleMpDisconnect = useCallback(() => {
    disconnect();
    setPhase('selector');
  }, [disconnect]);

  const handleSaveMpGame = useCallback(async (layout: string, winnerIdx: number) => {
    const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
    try {
      const myIdx   = room.playerIndex ?? 0;
      const oppName = room.opponentName ?? 'Oponente';
      await fetch(`${API_URL}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yen: layout,
          players: [
            { userId: myIdx === 0 ? userId : null, name: username,  isWinner: winnerIdx === myIdx },
            { userId: null,                         name: oppName,   isWinner: winnerIdx !== myIdx },
          ],
        }),
      });
      onGameReset?.();
    } catch (e) { console.error('saveMpGame error', e); }
  }, [room.playerIndex, room.opponentName, userId, username, onGameReset]);

  // ---- Render ----

  if (phase === 'selector') {
    return <GameModeSelector onStart={handleStart} />;
  }

  if (phase === 'bot' && config) {
    return (
      <Box sx={{
        minHeight: 'calc(100vh - 64px)',
        background: 'radial-gradient(ellipse 80% 40% at 50% 0%, #00e5ff06 0%, transparent 60%), #060b18',
        py: 4,
      }}>
        <Container maxWidth="sm">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
            <HexagonIcon sx={{ color: '#00e5ff', fontSize: 22, filter: 'drop-shadow(0 0 4px #00e5ff88)' }} />
            <Typography variant="h5">PARTIDA vs BOT</Typography>
            <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, #00e5ff22, transparent)' }} />
          </Box>
          <Game
            boardSize={config.boardSize}
            botDifficulty={config.botDifficulty}
            humanPlayerIndex={config.humanPlayerIndex}
            onGameEnd={handleBotGameEnd}
            onBack={() => setPhase('selector')}
            userId={userId}
            username={username}
          />
        </Container>
      </Box>
    );
  }

  // Modo multijugador
  if (phase === 'mp-lobby') {
    // Transición automática: cuando el servidor envía 'game_start' el status pasa a 'playing'
    const inGame = room.status === 'playing' || room.status === 'finished';

    if (inGame) {
      return (
        <MultiplayerGame
          username={username}
          userId={userId}
          roomState={room}
          onSendChat={sendChat}
          onBroadcastMove={broadcastMove}
          onLeave={handleMpDisconnect}
          onSaveGame={handleSaveMpGame}
        />
      );
    }

    return (
      <MultiplayerLobby
        username={username}
        boardSize={config?.boardSize ?? 7}
        roomState={room}
        onCreateRoom={() => createRoom(config?.boardSize ?? 7)}
        onJoinRoom={(code) => joinRoom(code, config?.boardSize ?? 7)}
        onDisconnect={handleMpDisconnect}
        onSendChat={sendChat}
      />
    );
  }

  return null;
}
