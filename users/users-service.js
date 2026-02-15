require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const swaggerUi = require('swagger-ui-express');
const fs = require('node:fs');
const YAML = require('js-yaml');
const promBundle = require('express-prom-bundle');
const mysql = require('mysql2/promise');

const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);

try {
  const swaggerDocument = YAML.load(fs.readFileSync('./openapi.yaml', 'utf8'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (e) {
  console.log(e);
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());

// Create MySQL pool using environment variables
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

// Initialize database tables if they don't exist
const initializeDatabase = async () => {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Create users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create games table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        yen TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create game_players table
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

// Initialize database on startup with retry logic
const initDbWithRetry = async (retries = 15, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await initializeDatabase();
      return;
    } catch (err) {
      if (i < retries - 1) {
        console.log(`⏳ Database initialization attempt ${i + 1}/${retries} failed. Retrying in ${delay}ms...`);
        console.log(`   Error: ${err.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ Failed to initialize database after multiple attempts');
        throw err;
      }
    }
  }
};

// Wait a bit before trying to initialize to ensure MySQL is ready
setTimeout(() => {
  initDbWithRetry().catch(err => {
    console.error('Failed to initialize database:', err.message);
    // Don't exit, let the app run and retry on first request
  });
}, 5000);

app.post('/createuser', async (req, res) => {
  const username = req.body && req.body.username;
  try {
    // Simulate a 1 second delay to mimic processing/network latency
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const message = `Hello ${username}! welcome to the course!`;
    res.json({ message });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Endpoint to save a finished game (yen notation + players)
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
      const userId = p.userId || null;
      const name = p.name || null;
      const isWinner = !!p.isWinner;
      await conn.query(insertSql, [gameId, userId, name, isWinner]);
    }

    await conn.commit();
    res.status(201).json({ gameId });
  } catch (err) {
    await conn.rollback();
    console.error('Error saving game:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Endpoint to get all games with their players
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
      gamesWithPlayers.push({
        id: game.id,
        yen: game.yen,
        created_at: game.created_at,
        players: players || []
      });
    }

    res.json(gamesWithPlayers);
  } catch (err) {
    console.error('Error fetching games:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// Endpoint to seed the database with sample data
app.post('/api/games/seed', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Sample games data
    const sampleGames = [
      {
        yen: '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6',
        players: [
          { name: 'Juan', userId: null, isWinner: true },
          { name: 'María', userId: null, isWinner: false }
        ]
      },
      {
        yen: '1.d4 d5 2.c4 dxc4',
        players: [
          { name: 'Carlos', userId: null, isWinner: false },
          { name: 'Ana', userId: null, isWinner: true }
        ]
      },
      {
        yen: '1.c4 e6 2.Nc3 Bb4',
        players: [
          { name: 'Pedro', userId: null, isWinner: true },
          { name: 'Laura', userId: null, isWinner: false }
        ]
      },
      {
        yen: '1.e4 c6 2.d4 d5 3.Nc3 dxe4',
        players: [
          { name: 'Diego', userId: null, isWinner: false },
          { name: 'Sofia', userId: null, isWinner: true }
        ]
      },
      {
        yen: '1.e4 c5 2.Nf3 d6 3.d4 cxd4',
        players: [
          { name: 'Miguel', userId: null, isWinner: true },
          { name: 'Isabel', userId: null, isWinner: false }
        ]
      }
    ];

    let totalInserted = 0;
    for (const gameData of sampleGames) {
      const [gameResult] = await conn.query('INSERT INTO games (yen) VALUES (?)', [gameData.yen]);
      const gameId = gameResult.insertId;

      const insertSql = 'INSERT INTO game_players (game_id, user_id, player_name, is_winner) VALUES (?, ?, ?, ?)';
      for (const player of gameData.players) {
        await conn.query(insertSql, [
          gameId,
          player.userId,
          player.name,
          player.isWinner
        ]);
      }
      totalInserted++;
    }

    await conn.commit();
    res.status(201).json({
      message: `Successfully inserted ${totalInserted} sample games`,
      gamesCreated: totalInserted
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error seeding database:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});


if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`)
  })
}

module.exports = app
