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
import { useCallback, useState, useEffect, useRef } from 'react';
import { Box, Container, Typography } from '@mui/material';
import HexagonIcon from '@mui/icons-material/Hexagon';
import GameModeSelector, { type GameConfig } from './GameModeSelector';
import Game                                  from './Game';
import MultiplayerLobby                      from './MultiplayerLobby';
import MultiplayerGame                       from './MultiplayerGame';
import { useWebSocketRoom }                  from '../../hooks/useWebSocketRoom';

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
    useWebSocketRoom(username, userId);

  const handleStart = (cfg: GameConfig) => {
    setConfig(cfg);
    if (cfg.mode === 'bot') {
      setPhase('bot');
    } else {
      setPhase('mp-lobby');
    }
  };

  const handleBotGameEnd = useCallback(() => {
    onGameReset?.();
  }, [onGameReset]);

  const handleBotBack = useCallback(() => {
    setPhase('selector');
  }, []);

  const handleMpDisconnect = useCallback(() => {
    disconnect();
    setPhase('selector');
  }, [disconnect]);

  const gameSavedRef = useRef(false);
  const roomRef      = useRef(room);
  roomRef.current    = room;

  const handleSaveMpGame = useCallback(async (layout: string, winnerIdx: number) => {
    if (gameSavedRef.current) return;
    gameSavedRef.current = true;
    const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
    try {
      const myIdx         = roomRef.current.playerIndex ?? 0;
      const oppName       = roomRef.current.opponentName ?? 'Oponente';
      const oppUserId     = roomRef.current.opponentUserId ?? null;
      // player en índice 0 y 1 con sus userId correctos
      const playersByIdx = [
        { userId: myIdx === 0 ? userId        : oppUserId, name: myIdx === 0 ? username : oppName,  isWinner: winnerIdx === 0 },
        { userId: myIdx === 1 ? userId        : oppUserId, name: myIdx === 1 ? username : oppName,  isWinner: winnerIdx === 1 },
      ];
      await fetch(`${API_URL}/api/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yen: layout, players: playersByIdx }),
      });
      onGameReset?.();
    } catch (e) { console.error('saveMpGame error', e); }
  }, [userId, username, onGameReset]);

  // Resetear el flag al iniciar nueva partida
  useEffect(() => {
    if (room.status === 'playing') {
      gameSavedRef.current = false;
    }
  }, [room.status]);

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
            onBack={handleBotBack}
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