import { describe, it, expect, afterEach, vi } from 'vitest'
import request from 'supertest'

// Mock mysql2/promise BEFORE importing app
vi.mock('mysql2/promise', () => {
  const makeConn = () => ({
    query: vi.fn()
      .mockResolvedValueOnce([[], []])       // SELECT: no existing user
      .mockResolvedValueOnce([{ insertId: 1 }, []]), // INSERT: success
    release: vi.fn(),
  });

  return {
    default: {
      createPool: () => ({
        getConnection: vi.fn().mockImplementation(() => Promise.resolve(makeConn())),
      }),
    },
  };
});

import app from '../users-service.js'

describe('POST /createuser', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a greeting message for the provided username', async () => {
    const res = await request(app)
      .post('/createuser')
      .send({ username: 'Pablo', password: 'password123' })
      .set('Accept', 'application/json')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
    expect(res.body.message).toMatch(/Hello Pablo! Welcome to the course!/i)
  })
})