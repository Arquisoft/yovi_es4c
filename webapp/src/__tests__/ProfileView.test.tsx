import { render, screen, waitFor } from '@testing-library/react'
import ProfileView from '../components/layout/ProfileView'
import { describe, expect, test, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'

const mockStats = {
  totalGames: 10,
  wins: 7,
  losses: 3,
  winRate: 70,
  currentStreak: 3,
  topDay: 'lunes',
  topDayCount: 4,
  lastGame: '2026-03-29T21:06:00.000Z',
  beatenBots: 7,
  memberSince: '2026-01-15T10:00:00.000Z',
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('ProfileView', () => {

  test('Muestra el spinner mientras carga', () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    } as Response)

    render(<ProfileView userId={1} username="Sergio" />)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  test('No hace fetch si userId es null', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')

    render(<ProfileView userId={null} username="Sergio" />)

    await waitFor(() => {
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  test('Muestra el nombre de usuario', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    } as Response)

    render(<ProfileView userId={1} username="Sergio" />)

    await waitFor(() => {
      expect(screen.getByText(/sergio/i)).toBeInTheDocument()
    })
  })

  test('Muestra las estadísticas correctamente tras la llamada a la API', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
    } as Response)

    render(<ProfileView userId={1} username="Sergio" />)

    await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument()
        expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(2)
        expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(2)
        expect(screen.getByText('70%')).toBeInTheDocument()
    })
})

  test('Muestra el día más activo y su conteo', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    } as Response)

    render(<ProfileView userId={1} username="Sergio" />)

    await waitFor(() => {
      expect(screen.getByText(/lunes/i)).toBeInTheDocument()
      expect(screen.getByText(/4 partidas ese día/i)).toBeInTheDocument()
    })
  })

  test('Muestra la fecha de registro y la última partida formateadas', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    } as Response)

    render(<ProfileView userId={1} username="Sergio" />)

    await waitFor(() => {
      expect(screen.getByText(/se unió el:/i)).toBeInTheDocument()
      expect(screen.getByText(/última partida:/i)).toBeInTheDocument()
    })
  })

  test('Muestra el rango correcto según el winRate', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockStats, winRate: 70 }),
    } as Response)

    render(<ProfileView userId={1} username="Sergio" />)

    await waitFor(() => {
      expect(screen.getByText(/avanzado/i)).toBeInTheDocument()
    })
  })

  test('Muestra "Sin rango" si no hay partidas', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockStats, totalGames: 0, winRate: 0 }),
    } as Response)

    render(<ProfileView userId={1} username="Sergio" />)

    await waitFor(() => {
      expect(screen.getByText(/sin rango/i)).toBeInTheDocument()
    })
  })

  test('Muestra el mensaje de sin partidas cuando totalGames es 0', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockStats, totalGames: 0, winRate: 0 }),
    } as Response)

    render(<ProfileView userId={1} username="Sergio" />)

    await waitFor(() => {
      expect(screen.getByText(/aún no tienes partidas/i)).toBeInTheDocument()
    })
  })

  test('Muestra el mensaje de sin partidas si la API falla', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
    } as Response)

    render(<ProfileView userId={1} username="Sergio" />)

    await waitFor(() => {
      expect(screen.getByText(/aún no tienes partidas/i)).toBeInTheDocument()
    })
  })

  test('Llama a la API con la URL correcta', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockStats,
    } as Response)

    render(<ProfileView userId={42} username="Sergio" />)

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/42/stats')
      )
    })
  })

})
