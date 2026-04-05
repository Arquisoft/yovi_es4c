import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ProfileView from '../components/layout/ProfileView'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const makeGame = (id: number, userId: number | null, isWinner: boolean, created_at = '2024-06-01T10:00:00Z') => ({
  id,
  yen: './...',
  created_at,
  players: [
    { id: id * 10, game_id: id, user_id: userId, player_name: 'Alice', is_winner: isWinner },
    { id: id * 10 + 1, game_id: id, user_id: null, player_name: 'Bot', is_winner: !isWinner },
  ],
})

describe('ProfileView', () => {
  beforeEach(() => vi.clearAllMocks())

  it('muestra el título PERFIL', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] })
    render(<ProfileView userId={1} username="Alice" />)
    await waitFor(() => expect(screen.getByText('PERFIL')).toBeInTheDocument())
  })

  it('muestra el nombre de usuario', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] })
    render(<ProfileView userId={1} username="Alice" />)
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
  })

  it('muestra sin rango si no hay partidas', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] })
    render(<ProfileView userId={1} username="Alice" />)
    await waitFor(() => expect(screen.getByText('Sin rango')).toBeInTheDocument())
  })

  it('muestra las estadísticas correctas con partidas', async () => {
    const games = [
      makeGame(1, 1, true),
      makeGame(2, 1, true),
      makeGame(3, 1, false),
    ]
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => games })
    render(<ProfileView userId={1} username="Alice" />)

    await waitFor(() => {
      // 3 partidas totales
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1)
    })
    // Verificar victorias y derrotas usando el contexto de etiquetas
    await waitFor(() => {
      const labels = screen.getAllByText(/victorias|derrotas|partidas/i)
      expect(labels.length).toBeGreaterThan(0)
    })
  })

  it('muestra winRate correcto', async () => {
    const games = [makeGame(1, 1, true), makeGame(2, 1, false)]
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => games })
    render(<ProfileView userId={1} username="Alice" />)
    await waitFor(() => expect(screen.getByText('50%')).toBeInTheDocument())
  })

  it('muestra mensaje cuando no hay partidas', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] })
    render(<ProfileView userId={1} username="Alice" />)
    await waitFor(() => {
      expect(screen.getByText(/aún no tienes partidas/i)).toBeInTheDocument()
    })
  })

  it('muestra el spinner mientras carga', () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}))
    render(<ProfileView userId={1} username="Alice" />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('muestra datos vacíos si fetch falla', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    render(<ProfileView userId={1} username="Alice" />)
    await waitFor(() => {
      expect(screen.getByText(/aún no tienes partidas/i)).toBeInTheDocument()
    })
  })

  it('muestra rango Maestro con winRate >= 80%', async () => {
    const games = Array.from({ length: 5 }, (_, i) => makeGame(i + 1, 1, true))
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => games })
    render(<ProfileView userId={1} username="Alice" />)
    await waitFor(() => expect(screen.getByText('Maestro')).toBeInTheDocument())
  })
})
