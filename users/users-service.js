require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);

try {
  const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log(e);
}

app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'yovi',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z'
});

// URL base del servicio gamey (Rust) — para el endpoint /api/play
const GAMEY_URL = process.env.GAMEY_SERVICE_URL || 'http://gamey:4000'; //NOSONAR: gamey es el hostname del contenedor Docker del servicio de juego. En local, se puede usar http://localhost:4000

const initializeDatabase = async () => {  /* c8 ignore start*/
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        yen TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await conn.query(`
      CREATE TABLE IF NOT EXISTS game_players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        game_id INT NOT NULL,
        user_id INT NULL,
        player_name VARCHAR(100) NOT NULL,
        is_winner BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Database tables initialized successfully');
  } catch (err) {
    console.error('❌ Error initializing database:', err.message);
  } finally {
    if (conn) conn.release();
  }
}; /* c8 ignore end*/

const initDbWithRetry = async (retries = 15, delay = 3000) => { /* c8 ignore start*/
  for (let i = 0; i < retries; i++) {
    try {
      await initializeDatabase();
      return;
    } catch (err) {
      if (i < retries - 1) {
        console.log(`⏳ Database initialization attempt ${i + 1}/${retries} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ Failed to initialize database after multiple attempts');
        throw err;
      }
    }
  }
}; /* c8 ignore end*/

setTimeout(() => { /* c8 ignore start*/
  initDbWithRetry().catch(err => {
    console.error('Failed to initialize database:', err.message);
  });
}, 5000); /* c8 ignore end*/

// POST /createuser — registers a new user with hashed password
app.post('/createuser', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username is required' });
  if (!password) return res.status(400).json({ error: 'password is required' });

  const conn = await pool.getConnection();
  try {
    const [existing] = await conn.query('SELECT id FROM users WHERE name = ?', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await conn.query('INSERT INTO users (name, password) VALUES (?, ?)', [username, hashedPassword]);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    res.json({ message: `Hello ${username}! welcome to the course!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// POST /login — authenticates an existing user
app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username is required' });
  if (!password) return res.status(400).json({ error: 'password is required' });

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT id, name, password FROM users WHERE name = ?', [username]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({ message: `Welcome back, ${user.name}!`, userId: user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// POST /api/games
app.post('/api/games', async (req, res) => {
  const { yen, players } = req.body || {};
  if (!yen || !Array.isArray(players)) return res.status(400).json({ error: 'yen and players are required' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [gameResult] = await conn.query('INSERT INTO games (yen) VALUES (?)', [typeof yen === 'string' ? yen : JSON.stringify(yen)]);
    const gameId = gameResult.insertId;

    const insertSql = 'INSERT INTO game_players (game_id, user_id, player_name, is_winner) VALUES (?, ?, ?, ?)';
    for (const p of players) {
      await conn.query(insertSql, [gameId, p.userId || null, p.name || null, !!p.isWinner]);
    }

    await conn.commit();
    res.status(201).json({ gameId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/games
app.get('/api/games', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [games] = await conn.query('SELECT id, yen, created_at FROM games ORDER BY created_at DESC');
    const gamesWithPlayers = [];
    for (const game of games) {
      const [players] = await conn.query(
        'SELECT id, game_id, user_id, player_name, is_winner FROM game_players WHERE game_id = ?',
        [game.id]
      );
      gamesWithPlayers.push({ ...game, players: players || [] });
    }
    res.json(gamesWithPlayers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// POST /api/games/seed
app.post('/api/games/seed', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sampleGames = [
      { yen: '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6', players: [{ name: 'Juan', isWinner: true }, { name: 'María', isWinner: false }] },
      { yen: '1.d4 d5 2.c4 dxc4', players: [{ name: 'Carlos', isWinner: false }, { name: 'Ana', isWinner: true }] },
      { yen: '1.c4 e6 2.Nc3 Bb4', players: [{ name: 'Pedro', isWinner: true }, { name: 'Laura', isWinner: false }] },
      { yen: '1.e4 c6 2.d4 d5 3.Nc3 dxe4', players: [{ name: 'Diego', isWinner: false }, { name: 'Sofia', isWinner: true }] },
      { yen: '1.e4 c5 2.Nf3 d6 3.d4 cxd4', players: [{ name: 'Miguel', isWinner: true }, { name: 'Isabel', isWinner: false }] },
    ];

    let totalInserted = 0;
    for (const gameData of sampleGames) {
      const [gameResult] = await conn.query('INSERT INTO games (yen) VALUES (?)', [gameData.yen]);
      const gameId = gameResult.insertId;
      for (const player of gameData.players) {
        await conn.query('INSERT INTO game_players (game_id, user_id, player_name, is_winner) VALUES (?, ?, ?, ?)',
          [gameId, null, player.name, player.isWinner]);
      }
      totalInserted++;
    }

    await conn.commit();
    res.status(201).json({ message: `Successfully inserted ${totalInserted} sample games`, gamesCreated: totalInserted });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// GET /api/users/:userId/stats
app.get('/api/users/:userId/stats', async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid userId' });

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT g.yen, g.created_at, gp.is_winner
       FROM game_players gp
       JOIN games g ON g.id = gp.game_id
       WHERE gp.user_id = ?
       ORDER BY g.created_at DESC`,
      [userId]
    );

    const totalGames = rows.length;
    const wins = rows.filter(r => r.is_winner).length;
    const losses = totalGames - wins;
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
    

    let currentStreak = 0;
    for (const r of rows) {
      if (r.is_winner) currentStreak++;
      else break;
    }

    const dayCount = {};
    rows.forEach(r => {
      const day = new Date(r.created_at).toLocaleDateString('es-ES', { weekday: 'long' });
      dayCount[day] = (dayCount[day] ?? 0) + 1;
    });
    const topDayEntry = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
    const topDay = topDayEntry?.[0] ?? null;
    const topDayCount = topDayEntry?.[1] ?? 0;

    const lastGame = rows[0]?.created_at ?? null;

    const [userRows] = await conn.query(
      'SELECT created_at FROM users WHERE id = ?',
      [userId]
    );
    const memberSince = userRows[0]?.created_at ?? null;

    res.json({
      totalGames,
      wins,
      losses,
      winRate,
      currentStreak,
      topDay,
      topDayCount,
      lastGame,
      beatenBots: wins,
      memberSince,
    });
    } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});
// ---------------------------------------------------------------------------
// POST /api/play
//
// Endpoint para partidas bot-vs-bot o test de bots (competición).
// Recibe una jugada del jugador, la valida vía Rust, pide respuesta al bot
// y devuelve el estado tras ambas jugadas en una sola llamada.
//
// Body:
//   {
//     "yen":        { size, turn, players, layout },  // estado actual
//     "coords":     { x, y, z },                       // jugada del jugador
//     "player_idx": 0,                                 // 0 o 1
//     "bot_id":     "random_bot"                       // bot oponente
//   }
//
// Response:
//   {
//     "yen":         { ... },        // estado final
//     "status":      "Ongoing",
//     "winner":      null,
//     "player_move": { x, y, z },   // coords aplicadas del jugador
//     "bot_move":    { x, y, z }    // coords del bot (null si el jugador ya ganó)
//   }
// ---------------------------------------------------------------------------
app.post('/api/play', async (req, res) => {
  const { yen, coords, player_idx, bot_id } = req.body || {};

  // ── Validación de campos obligatorios ──────────────────────────────────────
  if (!yen || !coords || player_idx === undefined || player_idx === null || !bot_id) {
    return res.status(400).json({ error: 'Missing required fields: yen, coords, player_idx, bot_id' });
  }
  if (typeof bot_id !== 'string' || bot_id.trim() === '') {
    return res.status(400).json({ error: 'bot_id must not be empty' });
  }

  const API = `${GAMEY_URL}/v1`;

  try {
    // ── Paso 1: aplicar jugada del jugador ────────────────────────────────────
    const playResp = await fetch(`${API}/game/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yen, coords, player_idx }),
    });

    if (!playResp.ok) {
      const errBody = await playResp.json().catch(() => ({ error: playResp.statusText }));
      return res.status(playResp.status).json(errBody);
    }

    const playResult = await playResp.json();

    // ── Si el jugador ya ganó, devolver sin turno del bot ─────────────────────
    if (playResult.status === 'Finished') {
      return res.json({
        yen:         playResult.yen,
        status:      playResult.status,
        winner:      playResult.winner,
        player_move: coords,
        bot_move:    null,
      });
    }

    // ── Paso 2: el bot elige su jugada ────────────────────────────────────────
    const chooseResp = await fetch(`${API}/ybot/choose/${encodeURIComponent(bot_id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playResult.yen),
    });

    if (!chooseResp.ok) {
      const errBody = await chooseResp.json().catch(() => ({ error: chooseResp.statusText }));
      return res.status(chooseResp.status).json(errBody);
    }

    const chooseResult = await chooseResp.json();
    const botCoords    = chooseResult.coords;
    const botPlayerIdx = player_idx === 0 ? 1 : 0;

    // ── Paso 3: aplicar jugada del bot ────────────────────────────────────────
    const botPlayResp = await fetch(`${API}/game/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yen: playResult.yen, coords: botCoords, player_idx: botPlayerIdx }),
    });

    if (!botPlayResp.ok) {
      const errBody = await botPlayResp.json().catch(() => ({ error: botPlayResp.statusText }));
      return res.status(botPlayResp.status).json(errBody);
    }

    const finalResult = await botPlayResp.json();

    // ── Respuesta unificada ───────────────────────────────────────────────────
    return res.json({
      yen:         finalResult.yen,
      status:      finalResult.status,
      winner:      finalResult.winner ?? null,
      player_move: coords,
      bot_move:    botCoords,
    });

  } catch (err) {
    return res.status(502).json({ error: `Error comunicando con el servicio de juego: ${err.message}` });
  }
});

// GET /api/leaderboard — ranking paginado de usuarios registrados
app.get('/api/leaderboard', async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit  ?? 20, 10), 100);
  const offset = Math.max(parseInt(req.query.offset ?? 0,  10), 0);

  if (isNaN(limit) || isNaN(offset)) {
    return res.status(400).json({ error: 'limit and offset must be integers' });
  }

  const conn = await pool.getConnection();
  try {
    // Total de usuarios con al menos una partida registrada (para la paginación)
    const [[{ total }]] = await conn.query(`
      SELECT COUNT(DISTINCT u.id) AS total
      FROM users u
      JOIN game_players gp ON gp.user_id = u.id
    `);

    // Ranking: ordenado por victorias DESC, winRate DESC como desempate
    const [rows] = await conn.query(`
      SELECT
        u.id          AS userId,
        u.name        AS username,
        COUNT(gp.id)  AS gamesPlayed,
        SUM(gp.is_winner)                                    AS wins,
        ROUND(SUM(gp.is_winner) / COUNT(gp.id) * 100, 2)    AS winRate
      FROM users u
      JOIN game_players gp ON gp.user_id = u.id
      GROUP BY u.id, u.name
      ORDER BY wins DESC, winRate DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // Añadir el número de puesto real teniendo en cuenta el offset
    const data = rows.map((row, i) => ({
      rank:        offset + i + 1,
      userId:      row.userId,
      username:    row.username,
      gamesPlayed: row.gamesPlayed,
      wins:        row.wins,
      winRate:     row.winRate,
    }));

    res.json({ data, pagination: { total, limit, offset } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------------------------
// GET /play  — API unificada para la competición entre implementaciones.
//
// Query params:
//   position  (obligatorio): estado del tablero en formato YEN (JSON string)
//   bot_id    (opcional):    identificador del bot. Por defecto 'random_bot'
//
// Respuesta:
//   { "coords": { "x": 1, "y": 1, "z": 0 } }   → movimiento normal
//   { "action": "swap" }                          → acción swap
//   { "action": "resign" }                        → rendirse
//
// Ejemplo:
//   curl -G "http://localhost:3000/play" \
//     --data-urlencode 'position={"size":3,"turn":0,"players":["B","R"],"layout":"./B./..."}'
// ---------------------------------------------------------------------------
app.get('/play', async (req, res) => {
  const { position, bot_id = 'random_bot' } = req.query;

  if (!position) {
    return res.status(400).json({ error: 'Missing required query parameter: position' });
  }

  let yen;
  try {
    yen = JSON.parse(position);
  } catch {
    return res.status(400).json({ error: 'position must be a valid JSON string in YEN format' });
  }

  const API = `${GAMEY_URL}/v1`;

  try {
    const chooseResp = await fetch(`${API}/ybot/choose/${encodeURIComponent(bot_id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(yen),
    });

    if (!chooseResp.ok) {
      const errBody = await chooseResp.json().catch(() => ({ error: chooseResp.statusText }));
      return res.status(chooseResp.status).json(errBody);
    }

    const result = await chooseResp.json();
    return res.json({ coords: result.coords });

  } catch (err) {
    return res.status(502).json({ error: `Error comunicando con el servicio de juego: ${err.message}` });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`)
  });
}
app.pool = pool;
app._bcrypt = bcrypt;
app._gameyUrl = GAMEY_URL; // exponer para tests
module.exports = app;