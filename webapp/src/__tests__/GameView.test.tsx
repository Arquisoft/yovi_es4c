import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import GameView from '../components/game/GameView'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock WebSocket con Proxy (mismo patrón que useWebSocketRoom.test)
const MockWS = function() {
  const ws = {
    readyState: 1, sent: [],
    onopen: null, onmessage: null, onerror: null, onclose: null,
    send: vi.fn(),
    close: vi.fn(),
  }
  return ws
}
MockWS.OPEN = 1; MockWS.CLOSED = 3
vi.stubGlobal('WebSocket', MockWS)

const defaultProps = {
  userId: 1,
  username: 'Alice',
  onGameReset: vi.fn(),
}

describe('GameView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true, json: async () => [] })
  })

  it('muestra el selector de modo por defecto', () => {
    render(<GameView {...defaultProps} />)
    expect(screen.getByTestId('btn-start-game')).toBeInTheDocument()
  })

  it('al iniciar modo bot muestra el tablero', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        yen: { size: 7, turn: 1, players: ['B', 'R'], layout: Array.from({ length: 7 }, (_, i) => '.'.repeat(i + 1)).join('/') },
        status: 'Ongoing',
      }),
    })
    render(<GameView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mode-bot'))
    fireEvent.click(screen.getByTestId('btn-start-game'))
    await waitFor(() => {
      expect(screen.getByTestId('hex-board')).toBeInTheDocument()
    })
  })

  it('al iniciar modo multiplayer muestra el lobby', async () => {
    render(<GameView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mode-multiplayer'))
    fireEvent.click(screen.getByTestId('btn-start-game'))
    await waitFor(() => {
      expect(screen.getByTestId('tab-create')).toBeInTheDocument()
    })
  })

  it('al pulsar btn-back desde el juego bot vuelve al selector', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        yen: { size: 7, turn: 1, players: ['B', 'R'], layout: Array.from({ length: 7 }, (_, i) => '.'.repeat(i + 1)).join('/') },
        status: 'Ongoing',
      }),
    })
    render(<GameView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('btn-start-game'))
    await waitFor(() => expect(screen.getByTestId('hex-board')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('btn-back'))
    await waitFor(() => {
      expect(screen.getByTestId('btn-start-game')).toBeInTheDocument()
    })
  })
})

  it('el lobby multijugador muestra el botón Crear sala', async () => {
    render(<GameView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mode-multiplayer'))
    fireEvent.click(screen.getByTestId('btn-start-game'))
    await waitFor(() => expect(screen.getByTestId('btn-create-room')).toBeInTheDocument())
  })

  it('al desconectar desde el lobby vuelve al selector', async () => {
    // Mock WebSocket que responde room_created al recibir create
    const FakeWS = function(this: any) {
      const self = this
      self.readyState = 0
      self.onopen = null; self.onmessage = null; self.onerror = null; self.onclose = null
      self.send = function(data: string) {
        const msg = JSON.parse(data)
        if (msg.type === 'create' && self.onmessage) {
          setTimeout(() => self.onmessage?.({ data: JSON.stringify({
            type: 'room_created', roomCode: 'TST001', boardSize: msg.boardSize
          }) }), 10)
        }
      }
      self.close = function(code = 1000) {
        self.readyState = 3
        self.onclose?.({ code })
      }
      setTimeout(() => { self.readyState = 1; self.onopen?.({}) }, 0)
    }
    FakeWS.OPEN = 1; FakeWS.CLOSED = 3
    vi.stubGlobal('WebSocket', FakeWS)

    render(<GameView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mode-multiplayer'))
    fireEvent.click(screen.getByTestId('btn-start-game'))
    await waitFor(() => expect(screen.getByTestId('tab-create')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('btn-create-room'))
    // Esperar a que llegue room_created → status=waiting → isConnected=true → btn-disconnect aparece
    await waitFor(() => expect(screen.getByTestId('btn-disconnect')).toBeInTheDocument(), { timeout: 2000 })

    fireEvent.click(screen.getByTestId('btn-disconnect'))
    await waitFor(() => expect(screen.getByTestId('btn-start-game')).toBeInTheDocument())

    vi.stubGlobal('WebSocket', MockWS)
  })

  it('muestra PARTIDA vs BOT al iniciar modo bot', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        yen: { size: 7, turn: 1, players: ['B', 'R'], layout: Array.from({ length: 7 }, (_, i) => '.'.repeat(i + 1)).join('/') },
        status: 'Ongoing',
      }),
    })
    render(<GameView {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mode-bot'))
    fireEvent.click(screen.getByTestId('btn-start-game'))
    await waitFor(() => expect(screen.getByText(/partida vs bot/i)).toBeInTheDocument())
  })
