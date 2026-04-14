import { render, screen, fireEvent, act } from "@testing-library/react"
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi, afterEach } from 'vitest'
import '@testing-library/jest-dom'
import MultiplayerLobby from '../components/game/MultiplayerLobby'
import type { RoomState } from '../hooks/useWebSocketRoom'

const idleState: RoomState = {
  roomCode: null, status: 'idle', playerIndex: null, opponentName: null,
  layout: '', boardSize: 7, currentTurn: 0, winner: null, chat: [], error: null, opponentUserId: null,
}

const waitingState: RoomState = {
  ...idleState,
  status: 'waiting',
  roomCode: 'ABC123',
  playerIndex: 0,
}

const errorState: RoomState = {
  ...idleState,
  status: 'error',
  error: 'Sala no encontrada',
}

const defaultProps = {
  username: 'Ana',
  boardSize: 7,
  onCreateRoom: vi.fn(),
  onJoinRoom: vi.fn(),
  onDisconnect: vi.fn(),
  onSendChat: vi.fn(),
}

describe('MultiplayerLobby', () => {
  afterEach(() => vi.restoreAllMocks())

  // ── Estado idle ──────────────────────────────────────────────────────────

  test('muestra las dos tabs en estado idle', () => {
    render(<MultiplayerLobby {...defaultProps} roomState={idleState} />)
    expect(screen.getByTestId('tab-create')).toBeInTheDocument()
    expect(screen.getByTestId('tab-join')).toBeInTheDocument()
  })

  test('muestra el botón "Crear sala" en la tab por defecto', () => {
    render(<MultiplayerLobby {...defaultProps} roomState={idleState} />)
    expect(screen.getByTestId('btn-create-room')).toBeInTheDocument()
  })

  test('onCreateRoom se llama al pulsar "Crear sala"', async () => {
    const user = userEvent.setup()
    const onCreateRoom = vi.fn()
    render(<MultiplayerLobby {...defaultProps} onCreateRoom={onCreateRoom} roomState={idleState} />)
    await user.click(screen.getByTestId('btn-create-room'))
    expect(onCreateRoom).toHaveBeenCalledOnce()
  })

  test('al cambiar a la tab "Unirse" aparece el input de código', async () => {
    const user = userEvent.setup()
    render(<MultiplayerLobby {...defaultProps} roomState={idleState} />)
    await user.click(screen.getByTestId('tab-join'))
    expect(screen.getByTestId('join-code-input')).toBeInTheDocument()
  })

  test('el botón "Unirse" está deshabilitado con código vacío', async () => {
    const user = userEvent.setup()
    render(<MultiplayerLobby {...defaultProps} roomState={idleState} />)
    await user.click(screen.getByTestId('tab-join'))
    expect(screen.getByTestId('btn-join-room')).toBeDisabled()
  })

  test('el botón "Unirse" se habilita al introducir 6 caracteres', async () => {
    const user = userEvent.setup()
    render(<MultiplayerLobby {...defaultProps} roomState={idleState} />)
    await user.click(screen.getByTestId('tab-join'))
    await user.type(screen.getByTestId('join-code-input'), 'XYZ789')
    expect(screen.getByTestId('btn-join-room')).toBeEnabled()
  })

  test('onJoinRoom se llama con el código en mayúsculas', async () => {
    const user = userEvent.setup()
    const onJoinRoom = vi.fn()
    render(<MultiplayerLobby {...defaultProps} onJoinRoom={onJoinRoom} roomState={idleState} />)
    await user.click(screen.getByTestId('tab-join'))
    await user.type(screen.getByTestId('join-code-input'), 'abc123')
    await user.click(screen.getByTestId('btn-join-room'))
    expect(onJoinRoom).toHaveBeenCalledWith('ABC123')
  })

  test('onJoinRoom se puede llamar con Enter en el input', async () => {
    const user = userEvent.setup()
    const onJoinRoom = vi.fn()
    render(<MultiplayerLobby {...defaultProps} onJoinRoom={onJoinRoom} roomState={idleState} />)
    await user.click(screen.getByTestId('tab-join'))
    await user.type(screen.getByTestId('join-code-input'), 'DEF456{Enter}')
    expect(onJoinRoom).toHaveBeenCalledWith('DEF456')
  })

  // ── Estado waiting ───────────────────────────────────────────────────────

  test('muestra el código de sala grande en estado waiting', () => {
    render(<MultiplayerLobby {...defaultProps} roomState={waitingState} />)
    expect(screen.getByTestId('room-code-display')).toHaveTextContent('ABC123')
  })

  test('muestra spinner de espera en estado waiting', () => {
    render(<MultiplayerLobby {...defaultProps} roomState={waitingState} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  test('muestra el mensaje "Esperando a tu rival" en estado waiting', () => {
    render(<MultiplayerLobby {...defaultProps} roomState={waitingState} />)
    expect(screen.getByText(/esperando a tu rival/i)).toBeInTheDocument()
  })

  test('NO muestra panel de chat en estado waiting', () => {
    render(<MultiplayerLobby {...defaultProps} roomState={waitingState} />)
    expect(screen.queryByTestId('lobby-chat-box')).not.toBeInTheDocument()
  })

  test('muestra el botón "Salir" cuando está conectado', () => {
    render(<MultiplayerLobby {...defaultProps} roomState={waitingState} />)
    expect(screen.getByTestId('btn-disconnect')).toBeInTheDocument()
  })

  test('onDisconnect se llama al pulsar "Salir"', async () => {
    const user = userEvent.setup()
    const onDisconnect = vi.fn()
    render(<MultiplayerLobby {...defaultProps} onDisconnect={onDisconnect} roomState={waitingState} />)
    await user.click(screen.getByTestId('btn-disconnect'))
    expect(onDisconnect).toHaveBeenCalledOnce()
  })

  // ── Estado error ─────────────────────────────────────────────────────────

  test('muestra el mensaje de error', () => {
    render(<MultiplayerLobby {...defaultProps} roomState={errorState} />)
    expect(screen.getByTestId('ws-error')).toHaveTextContent('Sala no encontrada')
  })

  test('en estado error sigue mostrando las tabs', () => {
    render(<MultiplayerLobby {...defaultProps} roomState={errorState} />)
    expect(screen.getByTestId('tab-create')).toBeInTheDocument()
  })

  // ── Copiar código ────────────────────────────────────────────────────────

  test('al pulsar el icono de copiar llama a clipboard.writeText', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    })
    render(<MultiplayerLobby {...defaultProps} roomState={waitingState} />)
    fireEvent.click(screen.getByTitle(/copiar código/i))
    expect(writeText).toHaveBeenCalledWith('ABC123')
  })

  test('muestra ¡Copiado! tras pulsar el botón de copiar', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    })
    render(<MultiplayerLobby {...defaultProps} roomState={waitingState} />)
    fireEvent.click(screen.getByTitle(/copiar código/i))
    expect(screen.getByText(/copiado/i)).toBeInTheDocument()
  })

  test('¡Copiado! desaparece tras 2 segundos', async () => {
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    })
    render(<MultiplayerLobby {...defaultProps} roomState={waitingState} />)
    fireEvent.click(screen.getByTitle(/copiar código/i))
    expect(screen.getByText(/copiado/i)).toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(2100) })
    expect(screen.queryByText(/copiado/i)).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  // ── Chat ──────────────────────────────────────────────────────────────────

  test('NO muestra panel de chat en estado waiting', () => {
    render(<MultiplayerLobby {...defaultProps} roomState={waitingState} />)
    expect(screen.queryByTestId('lobby-chat-box')).not.toBeInTheDocument()
  })

  // ── Enter en campo unirse ─────────────────────────────────────────────────

  test('Enter con código de 6 caracteres llama a onJoinRoom', () => {
    const onJoinRoom = vi.fn()
    render(<MultiplayerLobby {...defaultProps} roomState={idleState} onJoinRoom={onJoinRoom} />)
    fireEvent.click(screen.getByTestId('tab-join'))
    const input = screen.getByTestId('join-code-input')
    fireEvent.change(input, { target: { value: 'XYZ789' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onJoinRoom).toHaveBeenCalledWith('XYZ789')
  })

  test('Enter con código corto no llama a onJoinRoom', () => {
    const onJoinRoom = vi.fn()
    render(<MultiplayerLobby {...defaultProps} roomState={idleState} onJoinRoom={onJoinRoom} />)
    fireEvent.click(screen.getByTestId('tab-join'))
    const input = screen.getByTestId('join-code-input')
    fireEvent.change(input, { target: { value: 'AB' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onJoinRoom).not.toHaveBeenCalled()
  })
})
