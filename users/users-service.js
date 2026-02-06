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


if (require.main === module) {
  app.listen(port, () => {
    console.log(`User Service listening at http://localhost:${port}`)
  })
}

module.exports = app
