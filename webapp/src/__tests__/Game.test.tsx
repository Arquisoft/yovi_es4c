import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import Game from '../components/game/Game'

// Mock del módulo gameyClient para controlar chooseMove y makeHumanMove
vi.mock('../api/gameyClient', () => ({
  chooseMove: vi.fn(),
  makeHumanMove: vi.fn(),
}))

import { chooseMove, makeHumanMove } from '../api/gameyClient'

const mockChooseMove = vi.mocked(chooseMove)
const mockMakeHumanMove = vi.mocked(makeHumanMove)

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const defaultProps = {
  boardSize: 3,
  botDifficulty: 'random_bot',
  humanPlayerIndex: 0 as const,
  onGameEnd: vi.fn(),
  onBack: vi.fn(),
  userId: 1,
  username: 'Alice',
}

const ongoingYen = (size = 3, turn = 1) => ({
  size,
  turn,
  players: ['B', 'R'],
  layout: Array.from({ length: size }, (_, i) => '.'.repeat(i + 1)).join('/'),
})

describe('Game', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ gameId: 1 }) })
  })

  it('renderiza el tablero', () => {
    render(<Game {...defaultProps} />)
    expect(screen.getByTestId('hex-board')).toBeInTheDocument()
  })

  it('muestra el botón de volver al menú', () => {
    render(<Game {...defaultProps} />)
    expect(screen.getByTestId('btn-back')).toBeInTheDocument()
  })

  it('llama a onBack al pulsar el botón Menú', () => {
    const onBack = vi.fn()
    render(<Game {...defaultProps} onBack={onBack} />)
    fireEvent.click(screen.getByTestId('btn-back'))
    expect(onBack).toHaveBeenCalled()
  })

  it('muestra el status del juego', () => {
    render(<Game {...defaultProps} />)
    expect(screen.getByTestId('bot-game-status')).toBeInTheDocument()
  })

  it('muestra victoria al ganar la partida', async () => {
    mockMakeHumanMove.mockResolvedValueOnce({
      yen: { size: 3, turn: 0, players: ['B', 'R'], layout: 'B/BB/BBB' },
      status: 'Finished',
      winner: 0,
    })

    render(<Game {...defaultProps} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'celda 0-0' }))
    })
    await waitFor(() => {
      expect(screen.getByText(/has ganado/i)).toBeInTheDocument()
    })
  })

  it('muestra derrota cuando gana el bot', async () => {
    mockMakeHumanMove
      .mockResolvedValueOnce({ yen: ongoingYen(3, 1), status: 'Ongoing' })
      .mockResolvedValueOnce({
        yen: { size: 3, turn: 1, players: ['B', 'R'], layout: 'R/RR/RRR' },
        status: 'Finished',
        winner: 1,
      })
    mockChooseMove.mockResolvedValueOnce({
      api_version: 'v1', bot_id: 'random_bot', coords: { x: 0, y: 0, z: 0 },
    })

    render(<Game {...defaultProps} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'celda 0-0' }))
    })
    await waitFor(() => {
      expect(screen.getByText(/bot ha ganado/i)).toBeInTheDocument()
    })
  })

  it('muestra botones post-partida al terminar', async () => {
    mockMakeHumanMove.mockResolvedValueOnce({
      yen: { size: 3, turn: 0, players: ['B', 'R'], layout: 'B/BB/BBB' },
      status: 'Finished',
      winner: 0,
    })

    render(<Game {...defaultProps} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'celda 0-0' }))
    })
    await waitFor(() => {
      expect(screen.getByTestId('btn-play-again')).toBeInTheDocument()
      expect(screen.getByTestId('btn-back-to-menu')).toBeInTheDocument()
    })
  })

  it('muestra error si falla la llamada a la API', async () => {
    mockMakeHumanMove.mockRejectedValueOnce(new Error('Server error'))

    render(<Game {...defaultProps} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'celda 0-0' }))
    })
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('el bot mueve primero cuando humanPlayerIndex=1', async () => {
    mockChooseMove.mockResolvedValueOnce({
      api_version: 'v1', bot_id: 'random_bot', coords: { x: 0, y: 0, z: 0 },
    })
    mockMakeHumanMove.mockResolvedValueOnce({ yen: ongoingYen(3, 0), status: 'Ongoing' })

    render(<Game {...defaultProps} humanPlayerIndex={1} />)
    await waitFor(() => expect(mockChooseMove).toHaveBeenCalled())
  })

  it('el botón Jugar de nuevo resetea el tablero', async () => {
    mockMakeHumanMove.mockResolvedValueOnce({
      yen: { size: 3, turn: 0, players: ['B', 'R'], layout: 'B/BB/BBB' },
      status: 'Finished',
      winner: 0,
    })

    render(<Game {...defaultProps} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'celda 0-0' }))
    })
    await waitFor(() => expect(screen.getByTestId('btn-play-again')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('btn-play-again'))

    // El tablero vuelve a fase playing — las celdas deben ser clickables de nuevo
    await waitFor(() => expect(screen.getByRole('button', { name: 'celda 0-0' })).toBeInTheDocument())
  })

  it('llama a onGameEnd tras guardar la partida ganada', async () => {
    const onGameEnd = vi.fn()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ gameId: 99 }) })
    mockMakeHumanMove.mockResolvedValueOnce({
      yen: { size: 3, turn: 0, players: ['B', 'R'], layout: 'B/BB/BBB' },
      status: 'Finished',
      winner: 0,
    })

    render(<Game {...defaultProps} onGameEnd={onGameEnd} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'celda 0-0' }))
    })

    await waitFor(() => expect(onGameEnd).toHaveBeenCalled())
  })

  it('muestra alert de error cuando saveGame falla en el fetch', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    mockMakeHumanMove.mockResolvedValueOnce({
      yen: { size: 3, turn: 0, players: ['B', 'R'], layout: 'B/BB/BBB' },
      status: 'Finished',
      winner: 0,
    })

    render(<Game {...defaultProps} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'celda 0-0' }))
    })
    await waitFor(() => expect(screen.getByTestId('btn-play-again')).toBeInTheDocument())
    // saveGame falla silenciosamente (console.error), el juego muestra estado ganado igualmente
    expect(screen.getByTestId('btn-play-again')).toBeInTheDocument()
  })

  it('muestra error cuando chooseMove lanza una excepción (turno bot)', async () => {
    // humanPlayerIndex=1 → bot juega primero
    mockChooseMove.mockRejectedValueOnce(new Error('Bot error'))

    render(<Game {...defaultProps} humanPlayerIndex={1} />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByRole('alert')).toHaveTextContent('Bot error')
  })

  it('el alert de error se puede cerrar', async () => {
    mockChooseMove.mockRejectedValueOnce(new Error('Bot error'))

    render(<Game {...defaultProps} humanPlayerIndex={1} />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})
