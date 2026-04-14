import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import MultiplayerGame from '../components/game/MultiplayerGame'

vi.mock('../api/gameyClient', () => ({
  chooseMove: vi.fn(),
  makeHumanMove: vi.fn(),
}))

import { makeHumanMove } from '../api/gameyClient'
const mockMakeHumanMove = vi.mocked(makeHumanMove)

const baseRoomState = {
  roomCode: 'TST001',
  status: 'playing' as const,
  playerIndex: 0,
  opponentName: 'Bob',
  opponentUserId: null,
  layout: './...',
  boardSize: 2,
  currentTurn: 0,
  winner: null,
  chat: [],
  error: null,
}

const defaultProps = {
  username: 'Alice',
  userId: 1,
  roomState: baseRoomState,
  onSendChat: vi.fn(),
  onBroadcastMove: vi.fn(),
  onLeave: vi.fn(),
  onSaveGame: vi.fn().mockResolvedValue(undefined),
}

describe('MultiplayerGame', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renderiza el tablero', () => {
    render(<MultiplayerGame {...defaultProps} />)
    expect(screen.getByTestId('hex-board')).toBeInTheDocument()
  })

  it('muestra el estado "Tu turno" cuando es mi turno', () => {
    render(<MultiplayerGame {...defaultProps} />)
    expect(screen.getByTestId('mp-game-status')).toHaveTextContent('Tu turno')
  })

  it('muestra el turno del oponente cuando no es mi turno', () => {
    render(<MultiplayerGame {...defaultProps} roomState={{ ...baseRoomState, currentTurn: 1 }} />)
    expect(screen.getByTestId('mp-game-status')).toHaveTextContent(/turno de bob/i)
  })

  it('muestra el panel de chat', () => {
    render(<MultiplayerGame {...defaultProps} />)
    expect(screen.getByTestId('mp-chat-box')).toBeInTheDocument()
  })

  it('muestra los mensajes del chat', () => {
    const chat = [
      { from: 'Alice', text: 'Hola!', ts: Date.now() },
      { from: 'Bob', text: 'Suerte!', ts: Date.now() },
    ]
    render(<MultiplayerGame {...defaultProps} roomState={{ ...baseRoomState, chat }} />)
    expect(screen.getByText('Hola!')).toBeInTheDocument()
    expect(screen.getByText('Suerte!')).toBeInTheDocument()
  })

  it('llama a onSendChat y limpia el input al enviar mensaje', async () => {
    const onSendChat = vi.fn()
    render(<MultiplayerGame {...defaultProps} onSendChat={onSendChat} />)
    const input = screen.getByPlaceholderText(/mensaje/i)
    fireEvent.change(input, { target: { value: 'Hola!' } })
    fireEvent.click(screen.getByTestId('mp-chat-send'))
    expect(onSendChat).toHaveBeenCalledWith('Hola!')
    await waitFor(() => expect(input).toHaveValue(''))
  })

  it('llama a onLeave al pulsar Salir', () => {
    const onLeave = vi.fn()
    render(<MultiplayerGame {...defaultProps} onLeave={onLeave} />)
    fireEvent.click(screen.getByTestId('btn-leave'))
    expect(onLeave).toHaveBeenCalled()
  })

  it('muestra victoria cuando gana el jugador', () => {
    render(<MultiplayerGame {...defaultProps} roomState={{ ...baseRoomState, status: 'finished', winner: 0 }} />)
    expect(screen.getByTestId('mp-game-status')).toHaveTextContent(/has ganado/i)
  })

  it('muestra derrota cuando gana el oponente', () => {
    render(<MultiplayerGame {...defaultProps} roomState={{ ...baseRoomState, status: 'finished', winner: 1 }} />)
    expect(screen.getByTestId('mp-game-status')).toHaveTextContent(/bob ha ganado/i)
  })

  it('llama a onBroadcastMove tras un movimiento exitoso', async () => {
    mockMakeHumanMove.mockResolvedValueOnce({
      yen: { size: 2, turn: 1, players: ['B', 'R'], layout: 'B/..' },
      status: 'Ongoing',
    })
    const onBroadcastMove = vi.fn()
    render(<MultiplayerGame {...defaultProps} onBroadcastMove={onBroadcastMove} />)
    const cell = screen.getByRole('button', { name: 'celda 0-0' })
    await act(async () => { fireEvent.click(cell) })
    await waitFor(() => expect(onBroadcastMove).toHaveBeenCalled())
  })

  it('envía Enter en el chat para mandar el mensaje', () => {
    const onSendChat = vi.fn()
    render(<MultiplayerGame {...defaultProps} onSendChat={onSendChat} />)
    const input = screen.getByPlaceholderText(/mensaje/i)
    fireEvent.change(input, { target: { value: 'GL HF' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSendChat).toHaveBeenCalledWith('GL HF')
  })

  it('muestra "Sin mensajes aún" si el chat está vacío', () => {
    render(<MultiplayerGame {...defaultProps} />)
    expect(screen.getByText(/sin mensajes aún/i)).toBeInTheDocument()
  })

  it('llama a onSaveGame cuando el movimiento termina la partida (Finished)', async () => {
    const onSaveGame = vi.fn().mockResolvedValue(undefined)
    const onBroadcastMove = vi.fn()
    mockMakeHumanMove.mockResolvedValueOnce({
      yen: { size: 2, turn: 0, players: ['B', 'R'], layout: 'B/BB' },
      status: 'Finished',
      winner: 0,
    })
    render(<MultiplayerGame {...defaultProps} onSaveGame={onSaveGame} onBroadcastMove={onBroadcastMove} />)
    const cell = screen.getByRole('button', { name: 'celda 0-0' })
    await act(async () => { fireEvent.click(cell) })
    await waitFor(() => expect(onSaveGame).toHaveBeenCalledWith('B/BB', 0))
  })

  it('muestra error de movimiento cuando makeHumanMove lanza excepción', async () => {
    mockMakeHumanMove.mockRejectedValueOnce(new Error('Move failed'))
    render(<MultiplayerGame {...defaultProps} />)
    const cell = screen.getByRole('button', { name: 'celda 0-0' })
    await act(async () => { fireEvent.click(cell) })
    await waitFor(() => expect(screen.getByTestId('mp-move-error')).toBeInTheDocument())
    expect(screen.getByTestId('mp-move-error')).toHaveTextContent('Move failed')
  })
})
