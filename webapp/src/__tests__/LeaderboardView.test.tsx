import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LeaderboardView from '../components/layout/LeaderboardView'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEntry(rank: number, overrides = {}) {
  return {
    rank,
    userId: rank,
    username: `Player${rank}`,
    gamesPlayed: 10,
    wins: 10 - rank,
    winRate: (10 - rank) * 10,
    ...overrides,
  }
}

function mockFetch(data: object[], total = data.length) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data,
        pagination: { total, limit: 10, offset: 0 },
      }),
    })
  )
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.unstubAllGlobals()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LeaderboardView', () => {

  test('Muestra el spinner mientras carga', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))) // never resolves
    render(<LeaderboardView />)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  test('Muestra el título LEADERBOARD', async () => {
    mockFetch([])
    render(<LeaderboardView />)

    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument())
    expect(screen.getByText(/leaderboard/i)).toBeInTheDocument()
  })

  test('Muestra el estado vacío cuando no hay jugadores', async () => {
    mockFetch([])
    render(<LeaderboardView />)

    await waitFor(() =>
      expect(screen.getByText(/aún no hay jugadores en el ranking/i)).toBeInTheDocument()
    )
  })

  test('Muestra el estado de error cuando el fetch falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' })
    )
    render(<LeaderboardView />)

    await waitFor(() =>
      expect(screen.getByText(/error 500/i)).toBeInTheDocument()
    )
  })

  test('Renderiza las filas con nombre de usuario, partidas, victorias y win rate', async () => {
    mockFetch([
      makeEntry(1, { username: 'Ana', gamesPlayed: 20, wins: 15, winRate: 75 }),
      makeEntry(2, { username: 'Luis', gamesPlayed: 18, wins: 10, winRate: 55.56 }),
    ])
    render(<LeaderboardView />)

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument())

    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Luis')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('55.56%')).toBeInTheDocument()
  })

  test('Muestra las medallas para el top 3', async () => {
    mockFetch([makeEntry(1), makeEntry(2), makeEntry(3), makeEntry(4)])
    render(<LeaderboardView />)

    await waitFor(() => expect(screen.getByText('🥇')).toBeInTheDocument())

    expect(screen.getByText('🥇')).toBeInTheDocument()
    expect(screen.getByText('🥈')).toBeInTheDocument()
    expect(screen.getByText('🥉')).toBeInTheDocument()
    expect(screen.getByText('#4')).toBeInTheDocument()
  })

  test('Muestra el número total de jugadores en la cabecera', async () => {
    mockFetch([makeEntry(1)], 42)
    render(<LeaderboardView />)

    await waitFor(() => expect(screen.getByText(/42 jugadores/i)).toBeInTheDocument())
  })

  test('No muestra la paginación si solo hay una página', async () => {
    mockFetch([makeEntry(1), makeEntry(2)])
    render(<LeaderboardView />)

    await waitFor(() => expect(screen.getByText('Player1')).toBeInTheDocument())

    expect(screen.queryByRole('button', { name: /página anterior/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /página siguiente/i })).not.toBeInTheDocument()
  })

  test('Muestra la paginación y desactiva el botón anterior en la primera página', async () => {
    mockFetch(
      Array.from({ length: 10 }, (_, i) => makeEntry(i + 1)),
      25
    )
    render(<LeaderboardView />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /página anterior/i })).toBeInTheDocument()
    )

    expect(screen.getByRole('button', { name: /página anterior/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /página siguiente/i })).not.toBeDisabled()
  })

  test('Navega a la página siguiente al pulsar el botón', async () => {
    const user = userEvent.setup()

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: Array.from({ length: 10 }, (_, i) => makeEntry(i + 1)),
          pagination: { total: 15, limit: 10, offset: 0 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [makeEntry(11), makeEntry(12), makeEntry(13), makeEntry(14), makeEntry(15)],
          pagination: { total: 15, limit: 10, offset: 10 },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    render(<LeaderboardView />)

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /página siguiente/i })).not.toBeDisabled()
    )

    await user.click(screen.getByRole('button', { name: /página siguiente/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    const [, secondCall] = fetchMock.mock.calls
    expect(secondCall[0]).toContain('offset=10')
  })

})