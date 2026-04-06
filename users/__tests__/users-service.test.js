import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';

// ── Crear openapi.yaml temporal ───────────────────────────────────────────────
const yamlPath = path.resolve(process.cwd(), 'openapi.yaml');
const yamlExisted = fs.existsSync(yamlPath);
if (!yamlExisted) {
  fs.writeFileSync(yamlPath, 'openapi: "3.0.0"\ninfo:\n  title: test\n  version: 1.0.0\npaths: {}');
}

// ── Importar app ──────────────────────────────────────────────────────────────
const { default: app } = await import('../users-service.js');

// Cleanup yaml
if (!yamlExisted && fs.existsSync(yamlPath)) {
  fs.unlinkSync(yamlPath);
}

// Accedemos al pool y bcrypt reales que usa la app
const pool = app.pool;
const bcrypt = app._bcrypt;

const mockConn = {
  query: vi.fn(),
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
};

// ── POST /createuser ──────────────────────────────────────────────────────────
describe('POST /createuser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn);
    vi.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_password_mock');
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    mockConn.query
      .mockResolvedValueOnce([[]])               // SELECT → no existe
      .mockResolvedValueOnce([{ insertId: 1 }]); // INSERT → ok
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Valido: crea un usuario nuevo y devuelve mensaje de bienvenida', async () => {
    const res = await request(app)
      .post('/createuser')
      .send({ username: 'testuser', password: 'secret123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Hello testuser! welcome to the course!');
    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
  });

  it('Espera error: devuelve 400 si falta el username', async () => {
    const res = await request(app)
      .post('/createuser')
      .send({ password: 'secret123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('username is required');
  });

  it('Espera error: devuelve 400 si falta el password', async () => {
    const res = await request(app)
      .post('/createuser')
      .send({ username: 'testuser' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('password is required');
  });

  it('Espera error: devuelve 400 si el body está vacío', async () => {
    const res = await request(app)
      .post('/createuser')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('username is required');
  });

  it('Espera error: devuelve 409 si el username ya está en uso', async () => {
    mockConn.query.mockReset();
    mockConn.query.mockResolvedValueOnce([[{ id: 42 }]]); // usuario ya existe

    const res = await request(app)
      .post('/createuser')
      .send({ username: 'existinguser', password: 'pass' });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('Username already taken');
  });

  it('Espera error: devuelve 500 si la base de datos lanza un error', async () => {
    mockConn.query.mockReset();
    mockConn.query.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app)
      .post('/createuser')
      .send({ username: 'testuser', password: 'secret123' });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('DB connection lost');
  });

  it('Valido: guarda la contraseña hasheada, nunca en texto plano', async () => {
    await request(app)
      .post('/createuser')
      .send({ username: 'testuser', password: 'myplainpassword' });

    const insertCall = mockConn.query.mock.calls.find(call =>
      call[0].includes('INSERT INTO users')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall[1]).toContain('hashed_password_mock');
    expect(insertCall[1]).not.toContain('myplainpassword');
  });
});

// ── POST /login ───────────────────────────────────────────────────────────────
describe('POST /login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn);
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(true);
    mockConn.query.mockResolvedValue([[{ id: 1, name: 'testuser', password: 'hashed_pw' }]]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Valido: autentica un usuario con credenciales correctas', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'testuser', password: 'secret123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Welcome back, testuser!');
    expect(res.body.userId).toBe(1);
  });

  it('Valido: llama a bcrypt.compare con la contraseña y el hash', async () => {
    await request(app)
      .post('/login')
      .send({ username: 'testuser', password: 'secret123' });

    expect(bcrypt.compare).toHaveBeenCalledWith('secret123', 'hashed_pw');
  });

  it('Espera error: devuelve 400 si falta el username', async () => {
    const res = await request(app)
      .post('/login')
      .send({ password: 'secret123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('username is required');
  });

  it('Espera error: devuelve 400 si falta el password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'testuser' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('password is required');
  });

  it('Espera error: devuelve 401 si el usuario no existe', async () => {
    mockConn.query.mockResolvedValueOnce([[]]); // no rows

    const res = await request(app)
      .post('/login')
      .send({ username: 'noexiste', password: 'pass' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid username or password');
  });

  it('Espera error: devuelve 401 si la contraseña no coincide', async () => {
    vi.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    const res = await request(app)
      .post('/login')
      .send({ username: 'testuser', password: 'wrongpass' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid username or password');
  });

  it('Espera error: devuelve 500 si la base de datos lanza un error', async () => {
    mockConn.query.mockRejectedValueOnce(new Error('DB timeout'));

    const res = await request(app)
      .post('/login')
      .send({ username: 'testuser', password: 'secret123' });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('DB timeout');
  });
});

// ── POST /api/games ───────────────────────────────────────────────────────────
describe('POST /api/games', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn);
    mockConn.beginTransaction.mockResolvedValue();
    mockConn.commit.mockResolvedValue();
    mockConn.rollback.mockResolvedValue();
    mockConn.query
      .mockResolvedValueOnce([{ insertId: 7 }])  // INSERT INTO games
      .mockResolvedValue([{ insertId: 1 }]);       // INSERT INTO game_players
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Valido: guarda una partida y devuelve su gameId', async () => {
    const res = await request(app)
      .post('/api/games')
      .send({ yen: '[./.  ./.  . .]', players: [{ name: 'Alice', isWinner: true }, { name: 'Bob', isWinner: false }] });

    expect(res.statusCode).toBe(201);
    expect(res.body.gameId).toBe(7);
  });

  it('Valido: hace commit de la transacción al guardar correctamente', async () => {
    await request(app)
      .post('/api/games')
      .send({ yen: '[./.  . .]', players: [{ name: 'Alice', isWinner: true }] });

    expect(mockConn.beginTransaction).toHaveBeenCalled();
    expect(mockConn.commit).toHaveBeenCalled();
    expect(mockConn.rollback).not.toHaveBeenCalled();
  });

  it('Valido: guarda el yen como texto en la base de datos', async () => {
    const res = await request(app)
      .post('/api/games')
      .send({ yen: '[./. ./. . .]', players: [{ name: 'Alice', isWinner: true }] });

    expect(res.statusCode).toBe(201);
    const insertCall = mockConn.query.mock.calls.find(c => c[0].includes('INSERT INTO games'));
    expect(insertCall[1][0]).toBe('[./. ./. . .]');
  });

  it('Espera error: devuelve 400 si falta yen', async () => {
    const res = await request(app)
      .post('/api/games')
      .send({ players: [{ name: 'Alice' }] });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('yen and players are required');
  });

  it('Espera error: devuelve 400 si players no es un array', async () => {
    const res = await request(app)
      .post('/api/games')
      .send({ yen: '[./.  .]', players: 'Alice' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('yen and players are required');
  });

  it('Espera error: hace rollback y devuelve 500 si la base de datos falla', async () => {
    mockConn.query.mockReset();
    mockConn.query.mockRejectedValueOnce(new Error('Insert failed'));

    const res = await request(app)
      .post('/api/games')
      .send({ yen: '[./.  .]', players: [{ name: 'Alice', isWinner: true }] });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Insert failed');
    expect(mockConn.rollback).toHaveBeenCalled();
  });
});

// ── GET /api/games ────────────────────────────────────────────────────────────
describe('GET /api/games', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Valido: devuelve la lista de partidas con sus jugadores', async () => {
    const games = [
      { id: 1, yen: '[./.  ./.  . .]', created_at: '2024-01-01T00:00:00.000Z' },
      { id: 2, yen: '[./.  . .]',    created_at: '2024-01-02T00:00:00.000Z' },
    ];
    const playersGame1 = [{ id: 1, game_id: 1, user_id: null, player_name: 'Alice', is_winner: 1 }];
    const playersGame2 = [{ id: 2, game_id: 2, user_id: null, player_name: 'Bob',   is_winner: 0 }];

    mockConn.query
      .mockResolvedValueOnce([games])
      .mockResolvedValueOnce([playersGame1])
      .mockResolvedValueOnce([playersGame2]);

    const res = await request(app).get('/api/games');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].players).toEqual(playersGame1);
    expect(res.body[1].players).toEqual(playersGame2);
  });

  it('Valido: devuelve array vacío si no hay partidas', async () => {
    mockConn.query.mockResolvedValueOnce([[]]); // no games

    const res = await request(app).get('/api/games');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('Valido: cada partida incluye el campo players aunque no tenga jugadores', async () => {
    mockConn.query
      .mockResolvedValueOnce([[{ id: 1, yen: '[./.  .]', created_at: '2024-01-01T00:00:00.000Z' }]])
      .mockResolvedValueOnce([[]]); // sin jugadores

    const res = await request(app).get('/api/games');

    expect(res.statusCode).toBe(200);
    expect(res.body[0].players).toEqual([]);
  });

  it('Espera error: devuelve 500 si la base de datos falla', async () => {
    mockConn.query.mockRejectedValueOnce(new Error('Query error'));

    const res = await request(app).get('/api/games');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Query error');
  });
});

// ── POST /api/games/seed ──────────────────────────────────────────────────────
describe('POST /api/games/seed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn);
    mockConn.beginTransaction.mockResolvedValue();
    mockConn.commit.mockResolvedValue();
    mockConn.rollback.mockResolvedValue();
    mockConn.query.mockResolvedValue([{ insertId: 1 }]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Valido: inserta exactamente 5 partidas de ejemplo', async () => {
    const res = await request(app).post('/api/games/seed');

    expect(res.statusCode).toBe(201);
    expect(res.body.gamesCreated).toBe(5);
  });

  it('Valido: devuelve mensaje de confirmación con el total insertado', async () => {
    const res = await request(app).post('/api/games/seed');

    expect(res.body.message).toBe('Successfully inserted 5 sample games');
  });

  it('Valido: hace commit de la transacción', async () => {
    await request(app).post('/api/games/seed');

    expect(mockConn.beginTransaction).toHaveBeenCalled();
    expect(mockConn.commit).toHaveBeenCalled();
    expect(mockConn.rollback).not.toHaveBeenCalled();
  });

  it('Espera error: hace rollback y devuelve 500 si la base de datos falla', async () => {
    mockConn.query.mockRejectedValueOnce(new Error('Seed failed'));

    const res = await request(app).post('/api/games/seed');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Seed failed');
    expect(mockConn.rollback).toHaveBeenCalled();
  });
});


// ── GET /api/users/:userId/stats ──────────────────────────────────────────────
describe('GET /api/users/:userId/stats', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Válido: devuelve las estadísticas correctas para un usuario con partidas', async () => {
    mockConn.query
      .mockResolvedValueOnce([[
        { yen: 'a/b/c', created_at: '2026-03-29T21:06:00.000Z', is_winner: true },
        { yen: 'a/b',   created_at: '2026-03-28T10:00:00.000Z', is_winner: false },
        { yen: 'a/b/c', created_at: '2026-03-27T10:00:00.000Z', is_winner: true },
      ]])
      .mockResolvedValueOnce([[{ created_at: '2026-01-15T10:00:00.000Z' }]]);

    const res = await request(app).get('/api/users/1/stats');

    expect(res.statusCode).toBe(200);
    expect(res.body.totalGames).toBe(3);
    expect(res.body.wins).toBe(2);
    expect(res.body.losses).toBe(1);
    expect(res.body.winRate).toBe(67);
    expect(res.body.currentStreak).toBe(1);
    expect(res.body.beatenBots).toBe(2);
    expect(res.body.memberSince).toBe('2026-01-15T10:00:00.000Z');
  });

  it('Válido: devuelve estadísticas vacías para un usuario sin partidas', async () => {
    mockConn.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[{ created_at: '2026-01-15T10:00:00.000Z' }]]);

    const res = await request(app).get('/api/users/1/stats');

    expect(res.statusCode).toBe(200);
    expect(res.body.totalGames).toBe(0);
    expect(res.body.wins).toBe(0);
    expect(res.body.losses).toBe(0);
    expect(res.body.winRate).toBe(0);
    expect(res.body.currentStreak).toBe(0);
    expect(res.body.topDay).toBeNull();
    expect(res.body.lastGame).toBeNull();
  });

  it('Válido: calcula correctamente la racha cuando todas son victorias', async () => {
    mockConn.query
      .mockResolvedValueOnce([[
        { yen: 'a/b', created_at: '2026-03-29T10:00:00.000Z', is_winner: true },
        { yen: 'a/b', created_at: '2026-03-28T10:00:00.000Z', is_winner: true },
        { yen: 'a/b', created_at: '2026-03-27T10:00:00.000Z', is_winner: true },
      ]])
      .mockResolvedValueOnce([[{ created_at: '2026-01-15T10:00:00.000Z' }]]);

    const res = await request(app).get('/api/users/1/stats');

    expect(res.statusCode).toBe(200);
    expect(res.body.currentStreak).toBe(3);
  });

  it('Válido: la racha se corta en la primera derrota', async () => {
    mockConn.query
      .mockResolvedValueOnce([[
        { yen: 'a/b', created_at: '2026-03-29T10:00:00.000Z', is_winner: true },
        { yen: 'a/b', created_at: '2026-03-28T10:00:00.000Z', is_winner: false },
        { yen: 'a/b', created_at: '2026-03-27T10:00:00.000Z', is_winner: true },
      ]])
      .mockResolvedValueOnce([[{ created_at: '2026-01-15T10:00:00.000Z' }]]);

    const res = await request(app).get('/api/users/1/stats');

    expect(res.statusCode).toBe(200);
    expect(res.body.currentStreak).toBe(1);
  });

  it('Válido: memberSince es null si el usuario no existe en la tabla users', async () => {
    mockConn.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([[]]); 

    const res = await request(app).get('/api/users/999/stats');

    expect(res.statusCode).toBe(200);
    expect(res.body.memberSince).toBeNull();
  });

  it('Espera error: devuelve 400 si el userId no es un número', async () => {
    const res = await request(app).get('/api/users/abc/stats');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Invalid userId');
  });

  it('Espera error: devuelve 500 si la base de datos falla', async () => {
    mockConn.query.mockRejectedValueOnce(new Error('db error'));

    const res = await request(app).get('/api/users/1/stats');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('db error');
  });

  it('Válido: libera la conexión siempre, incluso si hay error', async () => {
    mockConn.query.mockRejectedValueOnce(new Error('db error'));

    await request(app).get('/api/users/1/stats');

    expect(mockConn.release).toHaveBeenCalledTimes(1);
  });
});

// ── GET /api/leaderboard ──────────────────────────────────────────────────────
describe('GET /api/leaderboard', () => {
  const entries = [
    { userId: 1, username: 'Ana',  gamesPlayed: 20, wins: 15, winRate: 75.00 },
    { userId: 2, username: 'Luis', gamesPlayed: 18, wins: 10, winRate: 55.56 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(pool, 'getConnection').mockResolvedValue(mockConn);
    mockConn.query
      .mockResolvedValueOnce([[{ total: 2 }]])
      .mockResolvedValueOnce([entries]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Valido: devuelve 200 con data y pagination', async () => {
    const res = await request(app).get('/api/leaderboard');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
  });

  it('Valido: cada entrada incluye rank, userId, username, gamesPlayed, wins y winRate', async () => {
    const res = await request(app).get('/api/leaderboard');

    expect(res.statusCode).toBe(200);
    const first = res.body.data[0];
    expect(first).toHaveProperty('rank', 1);
    expect(first).toHaveProperty('userId', 1);
    expect(first).toHaveProperty('username', 'Ana');
    expect(first).toHaveProperty('gamesPlayed', 20);
    expect(first).toHaveProperty('wins', 15);
    expect(first).toHaveProperty('winRate', 75.00);
  });

  it('Valido: el rank se calcula sumando el offset al índice', async () => {
    mockConn.query.mockReset();
    mockConn.query
      .mockResolvedValueOnce([[{ total: 25 }]])
      .mockResolvedValueOnce([entries]);

    const res = await request(app).get('/api/leaderboard?limit=2&offset=10');

    expect(res.statusCode).toBe(200);
    expect(res.body.data[0].rank).toBe(11);
    expect(res.body.data[1].rank).toBe(12);
  });

  it('Valido: la paginación refleja total, limit y offset correctamente', async () => {
    mockConn.query.mockReset();
    mockConn.query
      .mockResolvedValueOnce([[{ total: 42 }]])
      .mockResolvedValueOnce([entries]);

    const res = await request(app).get('/api/leaderboard?limit=5&offset=10');

    expect(res.statusCode).toBe(200);
    expect(res.body.pagination).toEqual({ total: 42, limit: 5, offset: 10 });
  });

  it('Valido: usa limit=20 y offset=0 por defecto si no se pasan parámetros', async () => {
    await request(app).get('/api/leaderboard');

    const selectCall = mockConn.query.mock.calls.find(c => c[0].includes('LIMIT'));
    expect(selectCall[1]).toEqual([20, 0]);
  });

  it('Valido: devuelve data vacío y total=0 si no hay jugadores con partidas', async () => {
    mockConn.query.mockReset();
    mockConn.query
      .mockResolvedValueOnce([[{ total: 0 }]])
      .mockResolvedValueOnce([[]]);

    const res = await request(app).get('/api/leaderboard');

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  it('Valido: limit se capa a 100 aunque se pida más', async () => {
    await request(app).get('/api/leaderboard?limit=999&offset=0');

    const selectCall = mockConn.query.mock.calls.find(c => c[0].includes('LIMIT'));
    expect(selectCall[1][0]).toBe(100);
  });

  it('Valido: offset negativo se normaliza a 0', async () => {
    await request(app).get('/api/leaderboard?limit=10&offset=-5');

    const selectCall = mockConn.query.mock.calls.find(c => c[0].includes('LIMIT'));
    expect(selectCall[1][1]).toBe(0);
  });

  it('Espera error: devuelve 400 si limit no es un número', async () => {
    const res = await request(app).get('/api/leaderboard?limit=abc&offset=0');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('limit and offset must be integers');
  });

  it('Espera error: devuelve 400 si offset no es un número', async () => {
    const res = await request(app).get('/api/leaderboard?limit=10&offset=xyz');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('limit and offset must be integers');
  });

  it('Espera error: devuelve 500 si la base de datos lanza un error', async () => {
    mockConn.query.mockReset();
    mockConn.query.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app).get('/api/leaderboard');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('DB connection lost');
  });
});