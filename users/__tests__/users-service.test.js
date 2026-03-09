import { describe, it, expect, afterEach, vi } from 'vitest'
import request from 'supertest'
import app from '../users-service.js'
vi.mock('mysql2/promise', () => {
  const mockConn = {
    query: vi.fn()
      .mockResolvedValueOnce([[], []])                 // SELECT returns empty rows + fields
      .mockResolvedValueOnce([[{ insertId: 1 }], []]), // INSERT returns rows + fields
    release: vi.fn(),
  };

  return {
    default: {
      createPool: () => ({
        getConnection: vi.fn().mockResolvedValue(mockConn),
      }),
    },
  };
});


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