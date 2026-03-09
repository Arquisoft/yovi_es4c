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
  release: vi.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────
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

  it('✅ crea un usuario nuevo y devuelve mensaje de bienvenida', async () => {
    const res = await request(app)
      .post('/createuser')
      .send({ username: 'testuser', password: 'secret123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Hello testuser! welcome to the course!');
    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
  });

  it('❌ devuelve 400 si falta el username', async () => {
    const res = await request(app)
      .post('/createuser')
      .send({ password: 'secret123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('username is required');
  });

  it('❌ devuelve 400 si falta el password', async () => {
    const res = await request(app)
      .post('/createuser')
      .send({ username: 'testuser' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('password is required');
  });

  it('❌ devuelve 400 si el body está vacío', async () => {
    const res = await request(app)
      .post('/createuser')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('username is required');
  });

  it('❌ devuelve 409 si el username ya está en uso', async () => {
    mockConn.query.mockReset();
    mockConn.query.mockResolvedValueOnce([[{ id: 42 }]]); // usuario ya existe

    const res = await request(app)
      .post('/createuser')
      .send({ username: 'existinguser', password: 'pass' });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('Username already taken');
  });

  it('❌ devuelve 500 si la base de datos lanza un error', async () => {
    mockConn.query.mockReset();
    mockConn.query.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app)
      .post('/createuser')
      .send({ username: 'testuser', password: 'secret123' });

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('DB connection lost');
  });

  it('✅ guarda la contraseña hasheada, nunca en texto plano', async () => {
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