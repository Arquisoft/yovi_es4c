/**
 * ws-server/index.js
 *
 * Servidor WebSocket para el modo multijugador del juego Hex.
 *
 * FLUJO CON CÓDIGO DE SALA:
 *  1. Jugador A envía { type: 'create', username, boardSize }
 *     → Servidor crea sala con código de 6 letras mayúsculas y responde
 *       { type: 'room_created', roomCode, boardSize }
 *     → A espera en la sala.
 *
 *  2. Jugador B envía { type: 'join', username, roomCode }
 *     → Servidor une a B con A y responde a ambos:
 *       { type: 'game_start', opponentName, playerIndex, boardSize }
 *     → playerIndex se asigna ALEATORIAMENTE entre los dos.
 *
 * MENSAJES EN PARTIDA (bidireccionales, el servidor los retransmite):
 *   { type: 'board_update', layout, turn }
 *   { type: 'game_over',    layout, winner }
 *   { type: 'chat',         text }   → servidor añade 'from' antes de retransmitir
 *
 * Puerto: WS_PORT env o 8081
 */

const { WebSocketServer, WebSocket } = require('ws');

const PORT = Number(process.env.WS_PORT ?? 8081);

// roomCode → { creator: ws, creatorName, boardSize }
const pendingRooms = new Map();

// roomCode → { players: [ws, ws], names: [str, str] }
const activeRooms = new Map();

// ws → { roomCode, playerIndex }  (para lookup rápido en close/forward)
const wsToRoom = new Map();

const wss = new WebSocketServer({ port: PORT });

// ---- Helpers ----

/** Genera un código de sala de 6 caracteres alfanuméricos en mayúsculas */
function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para evitar confusión
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function safeSend(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function opponent(room, myIndex) {
  return room.players[myIndex === 0 ? 1 : 0];
}

// ---- Conexión ----

wss.on('connection', (ws) => {

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); }
    catch { return; }

    switch (msg.type) {
      case 'create': handleCreate(ws, msg); break;
      case 'join':   handleJoin(ws, msg);   break;
      case 'board_update':
      case 'game_over':
      case 'chat':
        handleForward(ws, msg);
        break;
      default:
        safeSend(ws, { type: 'error', message: `Tipo de mensaje desconocido: ${msg.type}` });
    }
  });

  ws.on('close', () => handleClose(ws));
});

// ---- Handlers ----

function handleCreate(ws, { username, boardSize, userId }) {
  if (!username || !boardSize) {
    return safeSend(ws, { type: 'error', message: 'Faltan campos: username, boardSize' });
  }

  cleanupPending(ws);

  const roomCode = genCode();
  pendingRooms.set(roomCode, { creator: ws, creatorName: username, creatorUserId: userId ?? null, boardSize: Number(boardSize) });
  wsToRoom.set(ws, { roomCode, playerIndex: null });

  safeSend(ws, { type: 'room_created', roomCode, boardSize: Number(boardSize) });
  console.log(`[WS] Sala creada: ${roomCode} por ${username} (tablero ${boardSize})`);
}

function handleJoin(ws, { username, roomCode, userId }) {
  if (!username || !roomCode) {
    return safeSend(ws, { type: 'error', message: 'Faltan campos: username, roomCode' });
  }

  const code = String(roomCode).toUpperCase().trim();
  const pending = pendingRooms.get(code);

  if (!pending) {
    return safeSend(ws, { type: 'error', message: `Sala "${code}" no encontrada o ya está llena.` });
  }

  if (pending.creator === ws) {
    return safeSend(ws, { type: 'error', message: 'No puedes unirte a tu propia sala.' });
  }

  pendingRooms.delete(code);

  const creatorIsZero = Math.random() < 0.5;
  const [idxCreator, idxJoiner] = creatorIsZero ? [0, 1] : [1, 0];

  const players  = [null, null];
  const names    = [null, null];
  const userIds  = [null, null];
  players[idxCreator] = pending.creator;       names[idxCreator] = pending.creatorName;  userIds[idxCreator] = pending.creatorUserId;
  players[idxJoiner]  = ws;                    names[idxJoiner]  = username;             userIds[idxJoiner]  = userId ?? null;

  activeRooms.set(code, { players, names, userIds, boardSize: pending.boardSize });
  wsToRoom.set(pending.creator, { roomCode: code, playerIndex: idxCreator });
  wsToRoom.set(ws,              { roomCode: code, playerIndex: idxJoiner  });

  safeSend(pending.creator, {
    type: 'game_start',
    opponentName: username,
    opponentUserId: userId ?? null,
    playerIndex: idxCreator,
    boardSize: pending.boardSize,
  });
  safeSend(ws, {
    type: 'game_start',
    opponentName: pending.creatorName,
    opponentUserId: pending.creatorUserId ?? null,
    playerIndex: idxJoiner,
    boardSize: pending.boardSize,
  });

  console.log(`[WS] Partida iniciada en sala ${code}: ${pending.creatorName}(${idxCreator}) vs ${username}(${idxJoiner})`);
}

function handleForward(ws, msg) {
  const info = wsToRoom.get(ws);
  if (!info) return;

  const room = activeRooms.get(info.roomCode);
  if (!room) return;

  const opp = opponent(room, info.playerIndex);

  // Para el chat añadimos 'from' con el nombre del remitente
  const outMsg = msg.type === 'chat'
    ? { ...msg, from: room.names[info.playerIndex] }
    : msg;

  safeSend(opp, outMsg);

  if (msg.type === 'game_over') {
    activeRooms.delete(info.roomCode);
    console.log(`[WS] Partida terminada, sala ${info.roomCode} eliminada.`);
  }
}

function handleClose(ws) {
  const info = wsToRoom.get(ws);
  if (info) {
    const room = activeRooms.get(info.roomCode);
    if (room) {
      const opp = opponent(room, info.playerIndex);
      safeSend(opp, { type: 'error', message: 'El oponente se ha desconectado.' });
      activeRooms.delete(info.roomCode);
    }
    cleanupPending(ws);
    wsToRoom.delete(ws);
  }
}

function cleanupPending(ws) {
  for (const [code, pending] of pendingRooms.entries()) {
    if (pending.creator === ws) {
      pendingRooms.delete(code);
      break;
    }
  }
}

wss.on('listening', () => {
  console.log(`[WS] Servidor de salas escuchando en ws://localhost:${PORT}`);
  console.log(`     Protocolo: CREATE para crear sala, JOIN + roomCode para unirse`);
});