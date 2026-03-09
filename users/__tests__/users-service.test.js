import { describe, it, expect, afterEach, vi } from 'vitest'
import request from 'supertest'

const { mockGetConnection } = vi.hoisted(() => {
  const mockGetConnection = vi.fn()
  return { mockGetConnection }
})

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password_123'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

vi.mock('mysql2/promise', () => ({
  default: {
    createPool: () => ({ getConnection: mockGetConnection }),
  },
}))

import app from '../users-service.js'

describe('POST /createuser', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a greeting message for the provided username', async () => {
    // Fresh connection mock for this specific test
    mockGetConnection.mockResolvedValue({
      query: vi.fn()
        .mockResolvedValueOnce([[], []])               // SELECT: no existing user
        .mockResolvedValueOnce([{ insertId: 1 }, []]), // INSERT: success
      release: vi.fn(),
    })

    const res = await request(app)
      .post('/createuser')
      .send({ username: 'Pablo', password: 'password123' })
      .set('Accept', 'application/json')

    if (res.status !== 200) {
      console.error('Response body:', res.body)
    }

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
    expect(res.body.message).toMatch(/Hello Pablo! Welcome to the course!/i)
  })
})