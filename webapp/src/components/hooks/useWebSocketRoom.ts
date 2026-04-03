/**
 * useWebSocketRoom.ts
 *
 * Hook que encapsula la lógica WebSocket del modo multijugador.
 *
 * PROTOCOLO CON CÓDIGO DE SALA:
 *
 * Cliente → Servidor:
 *   { type: 'create', username, boardSize }   → crea sala nueva, recibe roomCode
 *   { type: 'join',   username, roomCode }    → se une a sala existente por código
 *   { type: 'board_update', layout, turn }    → difunde movimiento al oponente
 *   { type: 'game_over', layout, winner }     → difunde fin de partida
 *   { type: 'chat', text }                    → mensaje de chat
 *
 * Servidor → Cliente:
 *   { type: 'room_created', roomCode, boardSize }
 *   { type: 'game_start',   opponentName, playerIndex, boardSize }
 *   { type: 'board_update', layout, turn }
 *   { type: 'game_over',    layout, winner }
 *   { type: 'chat',         from, text }
 *   { type: 'error',        message }
 *
 * Flujo:
 *  Jugador A: createRoom(boardSize) → estado 'waiting', recibe roomCode para compartir
 *  Jugador B: joinRoom(roomCode)    → ambos reciben 'game_start' con playerIndex aleatorio
 */
import { useCallback, useEffect, useRef, useState } from 'react';

// ---- Tipos públicos ----
export interface ChatMessage {
  from: string;
  text: string;
  ts: number;
}

export type RoomStatus =
  | 'idle'
  | 'connecting'
  | 'waiting'    // sala creada, esperando que el oponente use el roomCode
  | 'playing'    // game_start recibido, partida en curso
  | 'finished'
  | 'error';

export interface RoomState {
  roomCode: string | null;       // código de 6 chars para compartir
  status: RoomStatus;
  playerIndex: number | null;    // 0 = Azul, 1 = Rojo (asignado aleatoriamente)
  opponentName: string | null;
  layout: string;
  boardSize: number;
  currentTurn: number;           // índice del jugador cuyo turno es
  winner: number | null;
  chat: ChatMessage[];
  error: string | null;
}

const WS_BASE = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:8081';

function initLayout(size: number): string {
  return Array.from({ length: size }, (_, i) => '.'.repeat(i + 1)).join('/');
}

// ---- Hook ----
export function useWebSocketRoom(username: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<RoomState>({
    roomCode: null,
    status: 'idle',
    playerIndex: null,
    opponentName: null,
    layout: '',
    boardSize: 7,
    currentTurn: 0,
    winner: null,
    chat: [],
    error: null,
  });

  // ---- Envío seguro ----
  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  // ---- Conexión base (interna) ----
  const openSocket = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      wsRef.current?.close(1000, 'reconnect');
      const ws = new WebSocket(WS_BASE);
      wsRef.current = ws;

      ws.onopen = () => resolve();

      ws.onmessage = ({ data }: MessageEvent) => {
        try { handleMsg(JSON.parse(data as string)); }
        catch { console.error('[WS] mensaje inválido', data); }
      };

      ws.onerror = () => {
        setState(s => ({ ...s, status: 'error', error: 'Error de conexión WebSocket' }));
        reject(new Error('WebSocket error'));
      };

      ws.onclose = ({ code }) => {
        if (code !== 1000) {
          setState(s =>
            s.status === 'playing' || s.status === 'waiting'
              ? { ...s, status: 'error', error: 'Conexión perdida' }
              : s,
          );
        }
      };
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Crear sala (jugador A) ----
  const createRoom = useCallback(async (boardSize: number) => {
    setState(s => ({ ...s, status: 'connecting', error: null, chat: [], boardSize }));
    try {
      await openSocket();
      send({ type: 'create', username, boardSize });
    } catch {
      setState(s => ({ ...s, status: 'error', error: 'No se pudo conectar al servidor' }));
    }
  }, [username, openSocket, send]);

  // ---- Unirse a sala (jugador B) ----
  const joinRoom = useCallback(async (roomCode: string, boardSize: number) => {
    setState(s => ({ ...s, status: 'connecting', error: null, chat: [], boardSize }));
    try {
      await openSocket();
      send({ type: 'join', username, roomCode: roomCode.toUpperCase().trim() });
    } catch {
      setState(s => ({ ...s, status: 'error', error: 'No se pudo conectar al servidor' }));
    }
  }, [username, openSocket, send]);

  // ---- Procesar mensajes del servidor ----
  function handleMsg(msg: Record<string, unknown>) {
    switch (msg.type) {
      case 'room_created':
        setState(s => ({
          ...s,
          status: 'waiting',
          roomCode: msg.roomCode as string,
          boardSize: msg.boardSize as number,
          layout: initLayout(msg.boardSize as number),
        }));
        break;

      case 'game_start':
        setState(s => ({
          ...s,
          status: 'playing',
          playerIndex: msg.playerIndex as number,
          opponentName: msg.opponentName as string,
          boardSize: msg.boardSize as number,
          layout: initLayout(msg.boardSize as number),
          currentTurn: 0,
        }));
        break;

      case 'board_update':
        setState(s => ({
          ...s,
          layout: msg.layout as string,
          currentTurn: msg.turn as number,
        }));
        break;

      case 'game_over':
        setState(s => ({
          ...s,
          status: 'finished',
          layout: msg.layout as string,
          winner: msg.winner as number,
        }));
        break;

      case 'chat':
        setState(s => ({
          ...s,
          chat: [...s.chat, {
            from: msg.from as string,
            text: msg.text as string,
            ts: Date.now(),
          }],
        }));
        break;

      case 'error':
        setState(s => ({ ...s, status: 'error', error: msg.message as string }));
        break;

      default:
        break;
    }
  }

  /** Difunde al oponente el tablero tras un movimiento ya validado por la API Rust */
  const broadcastMove = useCallback(
    (layout: string, turn: number, finished: boolean, winner?: number) => {
      if (finished) {
        send({ type: 'game_over', layout, winner: winner ?? null });
      } else {
        send({ type: 'board_update', layout, turn });
      }
      // Actualizar estado local del jugador que acaba de mover
      setState(s => ({
        ...s,
        layout,
        currentTurn: turn,
        status: finished ? 'finished' : 'playing',
        winner: finished ? (winner ?? null) : null,
      }));
    },
    [send],
  );

  const sendChat = useCallback((text: string) => send({ type: 'chat', text }), [send]);

  const disconnect = useCallback(() => {
    wsRef.current?.close(1000, 'user_left');
    wsRef.current = null;
    setState(s => ({ ...s, status: 'idle', error: null, roomCode: null }));
  }, []);

  useEffect(() => () => { wsRef.current?.close(1000, 'unmount'); }, []);

  return { state, createRoom, joinRoom, broadcastMove, sendChat, disconnect };
}
