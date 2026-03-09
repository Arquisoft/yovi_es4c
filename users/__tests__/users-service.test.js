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
      .send({ yen: '1.e4 e5', players: [{ name: 'Alice', isWinner: true }, { name: 'Bob', isWinner: false }] });

    expect(res.statusCode).toBe(201);
    expect(res.body.gameId).toBe(7);
  });

  it('Valido: hace commit de la transacción al guardar correctamente', async () => {
    await request(app)
      .post('/api/games')
      .send({ yen: '1.d4', players: [{ name: 'Alice', isWinner: true }] });

    expect(mockConn.beginTransaction).toHaveBeenCalled();
    expect(mockConn.commit).toHaveBeenCalled();
    expect(mockConn.rollback).not.toHaveBeenCalled();
  });

  it('Valido: acepta yen como objeto JSON', async () => {
    const res = await request(app)
      .post('/api/games')
      .send({ yen: { moves: ['e4', 'e5'] }, players: [{ name: 'Alice', isWinner: true }] });

    expect(res.statusCode).toBe(201);
    const insertCall = mockConn.query.mock.calls.find(c => c[0].includes('INSERT INTO games'));
    expect(insertCall[1][0]).toContain('moves');
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
      .send({ yen: '1.e4', players: 'Alice' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('yen and players are required');
  });

  it('Espera error: hace rollback y devuelve 500 si la base de datos falla', async () => {
    mockConn.query.mockReset();
    mockConn.query.mockRejectedValueOnce(new Error('Insert failed'));

    const res = await request(app)
      .post('/api/games')
      .send({ yen: '1.e4', players: [{ name: 'Alice', isWinner: true }] });

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
      { id: 1, yen: '1.e4 e5', created_at: '2024-01-01T00:00:00.000Z' },
      { id: 2, yen: '1.d4',    created_at: '2024-01-02T00:00:00.000Z' },
    ];
    const playersGame1 = [{ id: 1, game_id: 1, user_id: null, player_name: 'Alice', is_winner: true }];
    const playersGame2 = [{ id: 2, game_id: 2, user_id: null, player_name: 'Bob',   is_winner: false }];

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
      .mockResolvedValueOnce([[{ id: 1, yen: '1.e4', created_at: '2024-01-01T00:00:00.000Z' }]])
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