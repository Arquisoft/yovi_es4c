import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameHistory from '../components/game/GameHistory.tsx'
import { describe, expect, test, vi, afterEach } from 'vitest'
import '@testing-library/jest-dom'

const sampleGames = [
  {
    id: 1,
    yen: '...layout1...',
    created_at: '2025-01-01T12:00:00Z',
    players: [
      { id: 11, player_name: 'Azul', is_winner: true, user_id: 1 },
      { id: 12, player_name: 'Rojo', is_winner: false, user_id: null },
    ],
  },
  {
    id: 2,
    yen: '...layout2...',
    created_at: '2025-01-02T13:30:00Z',
    players: [
      { id: 21, player_name: 'Otro', is_winner: true, user_id: 42 },
      { id: 22, player_name: 'Rojo', is_winner: false, user_id: null },
    ],
  },
]

describe('GameHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('muestra un indicador de carga y luego un mensaje de estado vacío cuando no hay partidas', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    render(<GameHistory refreshTrigger={0} userId={null} username="Sergio" />)

    // inicialmente aparece el spinner
    expect(screen.getByRole('progressbar')).toBeInTheDocument()

    // tras la carga debería mostrarse el mensaje de "no games recorded"
    await waitFor(() => {
      expect(screen.getByText(/no games recorded yet/i)).toBeInTheDocument()
    })
  })

  test('carga partidas y permite filtrar "My games"/"All games"', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => sampleGames,
    } as Response)

    const user = userEvent.setup()
    render(<GameHistory refreshTrigger={0} userId={1} username="Pablo" />)

    // espera a que se rendericen las tarjetas
    await waitFor(() => {
      expect(screen.getByText(/game #1/i)).toBeInTheDocument()
      expect(screen.getByText(/game #2/i)).toBeInTheDocument()
    })

    // al pulsar "My games" sólo debería quedar la partida con userId 1
    await user.click(screen.getByRole('button', { name: /my games/i }))
    expect(screen.getByText(/game #1/i)).toBeInTheDocument()
    expect(screen.queryByText(/game #2/i)).not.toBeInTheDocument()

    // volver a "All games" muestra de nuevo ambas
    await user.click(screen.getByRole('button', { name: /all games/i }))
    expect(screen.getByText(/game #1/i)).toBeInTheDocument()
    expect(screen.getByText(/game #2/i)).toBeInTheDocument()
  })

  test('muestra error si falla la llamada a la API', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('network failure'))

    render(<GameHistory refreshTrigger={0} userId={null} username="X" />)

    await waitFor(() => {
      expect(screen.getByText(/error:/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
