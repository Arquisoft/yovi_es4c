import { describe, it, expect, vi, beforeEach } from 'vitest'
import { chooseMove, makeHumanMove } from '../api/gameyClient'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const sampleYen = {
  size: 5,
  turn: 0,
  players: ['B', 'R'],
  layout: './...',
}

const sampleCoords = { x: 1, y: 2, z: -3 }

describe('chooseMove', () => {
  beforeEach(() => vi.clearAllMocks())

  it('llama al endpoint correcto con el botId por defecto', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ api_version: 'v1', bot_id: 'random_bot', coords: sampleCoords }),
    })
    await chooseMove(sampleYen)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/ybot/choose/random_bot'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('llama con el botId personalizado', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ api_version: 'v1', bot_id: 'greedy', coords: sampleCoords }),
    })
    await chooseMove(sampleYen, 'greedy')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/ybot/choose/greedy'),
      expect.any(Object)
    )
  })

  it('devuelve la respuesta con coords', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ api_version: 'v1', bot_id: 'random_bot', coords: sampleCoords }),
    })
    const result = await chooseMove(sampleYen)
    expect(result.coords).toEqual(sampleCoords)
    expect(result.bot_id).toBe('random_bot')
  })

  it('lanza error si la respuesta no es ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
      json: async () => ({ message: 'Bot not found' }),
    })
    await expect(chooseMove(sampleYen, 'unknown')).rejects.toThrow('Bot not found')
  })

  it('envía el YEN en el body como JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ api_version: 'v1', bot_id: 'random_bot', coords: sampleCoords }),
    })
    await chooseMove(sampleYen)
    const call = mockFetch.mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.size).toBe(5)
    expect(body.layout).toBe('./...')
  })
})

describe('makeHumanMove', () => {
  beforeEach(() => vi.clearAllMocks())

  it('llama al endpoint /v1/game/play', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ yen: sampleYen, status: 'Ongoing' }),
    })
    await makeHumanMove(sampleYen, sampleCoords, 0)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/game/play'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('devuelve el estado actualizado del juego', async () => {
    const response = { yen: { ...sampleYen, turn: 1 }, status: 'Ongoing' as const }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => response })
    const result = await makeHumanMove(sampleYen, sampleCoords, 0)
    expect(result.status).toBe('Ongoing')
    expect(result.yen.turn).toBe(1)
  })

  it('devuelve status Finished cuando termina la partida', async () => {
    const response = { yen: sampleYen, status: 'Finished' as const, winner: 0 }
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => response })
    const result = await makeHumanMove(sampleYen, sampleCoords, 0)
    expect(result.status).toBe('Finished')
    expect(result.winner).toBe(0)
  })

  it('envía coords y player_idx en el body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ yen: sampleYen, status: 'Ongoing' }) })
    await makeHumanMove(sampleYen, sampleCoords, 1)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.coords).toEqual(sampleCoords)
    expect(body.player_idx).toBe(1)
  })

  it('lanza error si la respuesta no es ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({ message: 'Illegal move' }),
    })
    await expect(makeHumanMove(sampleYen, sampleCoords, 0)).rejects.toThrow('Illegal move')
  })

  it('usa la versión de API correcta por defecto', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ yen: sampleYen, status: 'Ongoing' }) })
    await makeHumanMove(sampleYen, sampleCoords, 0)
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/v1/'), expect.any(Object))
  })
})
