import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameHistory from '../components/game/GameHistory.tsx'
import { describe, expect, test, vi, afterEach } from 'vitest'
import '@testing-library/jest-dom'

const sampleGames = [
  {
    id: 1,
    yen: './..',
    created_at: '2025-01-01T12:00:00Z',
    players: [
      { id: 11, player_name: 'Azul', is_winner: true,  user_id: 1    },
      { id: 12, player_name: 'Rojo', is_winner: false, user_id: null },
    ],
  },
  {
    id: 2,
    yen: './..',
    created_at: '2025-01-02T13:30:00Z',
    players: [
      { id: 21, player_name: 'Otro', is_winner: true,  user_id: 42   },
      { id: 22, player_name: 'Rojo', is_winner: false, user_id: null },
    ],
  },
]

describe('GameHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('muestra un indicador de carga y luego mensaje vacío cuando no hay partidas', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response)

    render(<GameHistory refreshTrigger={0} userId={null} username="Sergio" />)

    // inicialmente aparece el spinner
    expect(screen.getByRole('progressbar')).toBeInTheDocument()

    // tras la carga debería mostrarse el mensaje de "no games recorded yet"
    await waitFor(() => {
      expect(screen.getByText(/no games recorded yet/i)).toBeInTheDocument()
    })
  })

  test('carga partidas y permite filtrar "My games" / "All games"', async () => {
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
    // El botón de reintento se llama "Actualizar" en el componente
    expect(screen.getByRole('button', { name: /actualizar/i })).toBeInTheDocument()
  })

  test('refresca las partidas al cambiar refreshTrigger', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => sampleGames } as Response)

    const { rerender } = render(
      <GameHistory refreshTrigger={0} userId={null} username="X" />
    )

    await waitFor(() => {
      expect(screen.getByText(/no games recorded yet/i)).toBeInTheDocument()
    })

    rerender(<GameHistory refreshTrigger={1} userId={null} username="X" />)

    await waitFor(() => {
      expect(screen.getByText(/game #1/i)).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  test('muestra el mensaje personalizado cuando el filtro "My games" no tiene resultados', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => sampleGames,
    } as Response)

    const user = userEvent.setup()
    // userId=99 no tiene partidas en sampleGames
    render(<GameHistory refreshTrigger={0} userId={99} username="Carlos" />)

    await waitFor(() => {
      expect(screen.getByText(/game #1/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /my games/i }))

    expect(screen.getByText(/aún no tienes partidas, Carlos/i)).toBeInTheDocument()
  })
})
