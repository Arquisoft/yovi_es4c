'use strict';
require('dotenv').config();

const express = require('express');
const jwt     = require('jsonwebtoken');

const app  = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3001;

const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const USERS_URL      = process.env.USERS_SERVICE_URL;

if (!JWT_SECRET) {
  console.error('JWT_SECRET env var is required');
  process.exit(1);
}

app.use(express.json());

// ── POST /login ────────────────────────────────────────────────────────────
// Delega la verificación de credenciales en users-service.
// Si el login es correcto, firma un JWT y lo devuelve al cliente.
app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const upstream = await fetch(`${USERS_URL}/login`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, password }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json(data);
    }

    // users-service devuelve { message, userId }
    const token = jwt.sign(
      { userId: data.userId, username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({ token, userId: data.userId, username });
  } catch (err) {
    console.error('Error calling users-service /login:', err.message);
    return res.status(502).json({ error: 'Error communicating with users service' });
  }
});

// ── POST /register ─────────────────────────────────────────────────────────
// Proxy directo a users-service /createuser.
app.post('/register', async (req, res) => {
  try {
    const upstream = await fetch(`${USERS_URL}/createuser`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(req.body),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error('Error calling users-service /createuser:', err.message);
    return res.status(502).json({ error: 'Error communicating with users service' });
  }
});

// ── GET /validate ──────────────────────────────────────────────────────────
// Endpoint interno para verificar un JWT (útil para otros servicios o tests).
// El gateway valida los tokens directamente; este endpoint es opcional.
app.get('/validate', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, error: 'Missing Authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return res.json({ valid: true, payload });
  } catch (err) {
    return res.status(401).json({ valid: false, error: err.message });
  }
});

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'UP' }));


if (require.main === module) { /*NOSONAR Punto de entrada de ejecución*/
  app.listen(PORT, () => console.log(`Auth Service listening on port ${PORT}`));
}

module.exports = app;