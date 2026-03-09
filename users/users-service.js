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

const initializeDatabase = async () => {
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
};

const initDbWithRetry = async (retries = 15, delay = 3000) => {
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
};

setTimeout(() => {
  initDbWithRetry().catch(err => {
    console.error('Failed to initialize database:', err.message);
  });
}, 5000);

// POST /createuser — registers a new user with hashed password
app.post('/createuser', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username) return res.status(400).json({ error: 'username is required' });
  if (!password) return res.status(400).json({ error: 'password is required' });

  const conn = await pool.getConnection();
  try {
    // Check if username already exists
    const [existing] = await conn.query('SELECT id FROM users WHERE name = ?', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    await conn.query('INSERT INTO users (name, password) VALUES (?, ?)', [username, hashedPassword]);

    // Simulate processing delay
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

if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`)
  });
}
app.pool = pool;
app._bcrypt = bcrypt;  // exponer para tests
module.exports = app;
