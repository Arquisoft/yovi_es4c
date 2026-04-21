import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ── Setup JWT_SECRET antes de importar la app ─────────────────────────────────
process.env.JWT_SECRET = 'test-secret-de-al-menos-32-caracteres-ok';
process.env.JWT_EXPIRES_IN = '1h';
process.env.USERS_SERVICE_URL = 'http://users-mock:3000';

const { default: app } = await import('../auth-service.js');

// ── Helper: construir respuesta mock de fetch ─────────────────────────────────
function mockFetchResponse(status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /login
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /login', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Válido: devuelve token, userId y username si las credenciales son correctas', async () => {
    fetch.mockReturnValueOnce(mockFetchResponse(200, { userId: 1, message: 'Welcome back, testuser!' }));

    const res = await request(app)
      .post('/login')
      .send({ username: 'testuser', password: 'secret123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.userId).toBe(1);
    expect(res.body.username).toBe('testuser');

    // Verificar que el token es un JWT válido y contiene los campos esperados
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload.userId).toBe(1);
    expect(payload.username).toBe('testuser');
  });

  it('Error: devuelve 400 si falta el username', async () => {
    const res = await request(app)
      .post('/login')
      .send({ password: 'secret123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('username and password are required');
  });

  it('Error: devuelve 400 si falta el password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ username: 'testuser' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('username and password are required');
  });

  it('Error: devuelve 400 si el body está vacío', async () => {
    const res = await request(app)
      .post('/login')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('username and password are required');
  });

  it('Error: devuelve 401 si users-service rechaza las credenciales', async () => {
    fetch.mockReturnValueOnce(mockFetchResponse(401, { error: 'Invalid username or password' }));

    const res = await request(app)
      .post('/login')
      .send({ username: 'testuser', password: 'wrongpass' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid username or password');
  });

  it('Error: devuelve 502 si users-service no está disponible', async () => {
    fetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const res = await request(app)
      .post('/login')
      .send({ username: 'testuser', password: 'secret123' });

    expect(res.statusCode).toBe(502);
    expect(res.body.error).toMatch(/Error communicating with users service/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /register
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /register', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('Válido: registra un usuario y devuelve el mensaje de bienvenida', async () => {
    fetch.mockReturnValueOnce(mockFetchResponse(200, { message: 'Hello testuser! welcome to the course!' }));

    const res = await request(app)
      .post('/register')
      .send({ username: 'testuser', password: 'secret123' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('testuser');
  });

  it('Error: devuelve 409 si el usuario ya existe', async () => {
    fetch.mockReturnValueOnce(mockFetchResponse(409, { error: 'Username already taken' }));

    const res = await request(app)
      .post('/register')
      .send({ username: 'existinguser', password: 'secret123' });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('Username already taken');
  });

  it('Error: devuelve 502 si users-service no está disponible', async () => {
    fetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const res = await request(app)
      .post('/register')
      .send({ username: 'testuser', password: 'secret123' });

    expect(res.statusCode).toBe(502);
    expect(res.body.error).toMatch(/Error communicating with users service/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /validate
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /validate', () => {
  it('Válido: devuelve valid=true y el payload si el token es correcto', async () => {
    const token = jwt.sign(
      { userId: 1, username: 'testuser' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/validate')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.payload.userId).toBe(1);
    expect(res.body.payload.username).toBe('testuser');
  });

  it('Error: devuelve 401 si no hay Authorization header', async () => {
    const res = await request(app).get('/validate');

    expect(res.statusCode).toBe(401);
    expect(res.body.valid).toBe(false);
  });

  it('Error: devuelve 401 si el token está manipulado', async () => {
    const res = await request(app)
      .get('/validate')
      .set('Authorization', 'Bearer tokenfalso.manipulado.xxx');

    expect(res.statusCode).toBe(401);
    expect(res.body.valid).toBe(false);
  });

  it('Error: devuelve 401 si el token ha caducado', async () => {
    const token = jwt.sign(
      { userId: 1, username: 'testuser' },
      process.env.JWT_SECRET,
      { expiresIn: '0s' }
    );

    // Pequeña espera para asegurar que expira
    await new Promise(r => setTimeout(r, 100));

    const res = await request(app)
      .get('/validate')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(401);
    expect(res.body.valid).toBe(false);
  });

  it('Error: devuelve 401 si el header no tiene formato Bearer', async () => {
    const res = await request(app)
      .get('/validate')
      .set('Authorization', 'Basic dXNlcjpwYXNz');

    expect(res.statusCode).toBe(401);
    expect(res.body.valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /health
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('Devuelve status UP', async () => {
    const res = await request(app).get('/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
  });
});