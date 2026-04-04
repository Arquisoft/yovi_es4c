import { renderHook, act } from '@testing-library/react'
import { describe, expect, test, vi, afterEach, beforeEach } from 'vitest'
import '@testing-library/jest-dom'
import { useWebSocketRoom } from '../hooks/useWebSocketRoom'

// ── Mock global de WebSocket ──────────────────────────────────────────────────

interface MockWs {
  readyState: number
  sent:       string[]
  onopen:     ((e: Event) => void) | null
  onmessage:  ((e: MessageEvent) => void) | null
  onerror:    ((e: Event) => void) | null
  onclose:    ((e: CloseEvent) => void) | null
  send:       (data: string) => void
  close:      (code?: number) => void
  receive:    (msg: object) => void
}

let mockWsInstance: MockWs | null = null

beforeEach(() => {
  mockWsInstance = null

  // Creamos el mock como objeto plano y lo asignamos globalmente
  const FakeWebSocket = function(_url: string): MockWs {
    const ws: MockWs = {
      readyState: 1, // ya abierto
      sent: [],
      onopen: null, onmessage: null, onerror: null, onclose: null,
      send(data: string) { ws.sent.push(data) },
      close(code = 1000) {
        ws.readyState = 3
        ws.onclose?.({ code } as CloseEvent)
      },
      receive(msg: object) {
        ws.onmessage?.({ data: JSON.stringify(msg) } as MessageEvent)
      },
    }
    // Proxy: dispara onopen en cuanto el hook lo asigna
    const proxy = new Proxy(ws, {
      set(target, prop, value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (target as any)[prop] = value
        if (prop === 'onopen' && typeof value === 'function') {
          value({} as Event)
        }
        return true
      },
    }) as MockWs
    mockWsInstance = proxy
    return proxy
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FakeWebSocket.OPEN   = 1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FakeWebSocket.CLOSED = 3
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.stubGlobal('WebSocket', FakeWebSocket as any)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useWebSocketRoom', () => {

  // ── Estado inicial ──────────────────────────────────────────────────────

  test('estado inicial es idle', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    expect(result.current.state.status).toBe('idle')
    expect(result.current.state.roomCode).toBeNull()
    expect(result.current.state.playerIndex).toBeNull()
    expect(result.current.state.chat).toEqual([])
  })

  // ── createRoom ──────────────────────────────────────────────────────────

  test('createRoom cambia status a connecting', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(7) })
    expect(result.current.state.status).toBe('connecting')
  })

  test('createRoom abre WebSocket y envía mensaje create', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(7) })
    expect(mockWsInstance).not.toBeNull()
    const sent = mockWsInstance!.sent.map(s => JSON.parse(s))
    expect(sent[0]).toEqual({ type: 'create', username: 'Alice', boardSize: 7 })
  })

  test('al recibir room_created status pasa a waiting', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(7) })
    act(() => { mockWsInstance!.receive({ type: 'room_created', roomCode: 'TST001', boardSize: 7 }) })
    expect(result.current.state.status).toBe('waiting')
    expect(result.current.state.roomCode).toBe('TST001')
  })

  // ── joinRoom ────────────────────────────────────────────────────────────

  test('joinRoom envía mensaje join con el roomCode en mayúsculas', () => {
    const { result } = renderHook(() => useWebSocketRoom('Bob'))
    act(() => { result.current.joinRoom('abc123', 7) })
    const sent = mockWsInstance!.sent.map(s => JSON.parse(s))
    expect(sent[0]).toEqual({ type: 'join', username: 'Bob', roomCode: 'ABC123' })
  })

  // ── game_start ──────────────────────────────────────────────────────────

  test('al recibir game_start status pasa a playing con playerIndex', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(5) })
    act(() => {
      mockWsInstance!.receive({
        type: 'game_start',
        opponentName: 'Bob',
        playerIndex: 0,
        boardSize: 5,
      })
    })
    expect(result.current.state.status).toBe('playing')
    expect(result.current.state.playerIndex).toBe(0)
    expect(result.current.state.opponentName).toBe('Bob')
    expect(result.current.state.currentTurn).toBe(0)
  })

  // ── board_update ────────────────────────────────────────────────────────

  test('board_update actualiza layout y currentTurn', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(5) })
    act(() => {
      mockWsInstance!.receive({ type: 'game_start', opponentName: 'Bob', playerIndex: 0, boardSize: 5 })
      mockWsInstance!.receive({ type: 'board_update', layout: 'R/./.', turn: 0 })
    })
    expect(result.current.state.layout).toBe('R/./.') 
    expect(result.current.state.currentTurn).toBe(0)
  })

  // ── game_over ───────────────────────────────────────────────────────────

  test('game_over pasa status a finished con el ganador', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(5) })
    act(() => {
      mockWsInstance!.receive({ type: 'game_start', opponentName: 'Bob', playerIndex: 0, boardSize: 5 })
      mockWsInstance!.receive({ type: 'game_over', layout: 'B/BB', winner: 0 })
    })
    expect(result.current.state.status).toBe('finished')
    expect(result.current.state.winner).toBe(0)
  })

  // ── chat ────────────────────────────────────────────────────────────────

  test('sendChat añade el mensaje localmente de inmediato', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(5) })
    act(() => { result.current.sendChat('Hola!') })
    expect(result.current.state.chat).toHaveLength(1)
    expect(result.current.state.chat[0]).toMatchObject({ from: 'Alice', text: 'Hola!' })
  })

  test('sendChat envía mensaje al servidor', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(5) })
    act(() => { result.current.sendChat('test') })
    const chatMsg = mockWsInstance!.sent.map(s => JSON.parse(s)).find(m => m.type === 'chat')
    expect(chatMsg).toEqual({ type: 'chat', text: 'test' })
  })

  test('los mensajes del rival se añaden al recibir chat del servidor', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(5) })
    act(() => {
      mockWsInstance!.receive({ type: 'chat', from: 'Bob', text: 'GG!' })
    })
    expect(result.current.state.chat).toHaveLength(1)
    expect(result.current.state.chat[0]).toMatchObject({ from: 'Bob', text: 'GG!' })
  })

  test('los mensajes propios y del rival se acumulan en orden', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(5) })
    act(() => {
      result.current.sendChat('Hola')
      mockWsInstance!.receive({ type: 'chat', from: 'Bob', text: 'Hey!' })
      result.current.sendChat('GL')
    })
    expect(result.current.state.chat).toHaveLength(3)
    expect(result.current.state.chat[0].from).toBe('Alice')
    expect(result.current.state.chat[1].from).toBe('Bob')
    expect(result.current.state.chat[2].from).toBe('Alice')
  })

  // ── broadcastMove ───────────────────────────────────────────────────────

  test('broadcastMove envía board_update si la partida sigue', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(5) })
    act(() => { result.current.broadcastMove('B/./', 1, false) })
    const msg = mockWsInstance!.sent.map(s => JSON.parse(s)).find(m => m.type === 'board_update')
    expect(msg).toEqual({ type: 'board_update', layout: 'B/./', turn: 1 })
  })

  test('broadcastMove envía game_over si la partida termina', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(5) })
    act(() => { result.current.broadcastMove('B/BB', 0, true, 0) })
    const msg = mockWsInstance!.sent.map(s => JSON.parse(s)).find(m => m.type === 'game_over')
    expect(msg).toEqual({ type: 'game_over', layout: 'B/BB', winner: 0 })
  })

  test('broadcastMove actualiza el estado local además de enviar', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(5) })
    act(() => { result.current.broadcastMove('B/./', 1, false) })
    expect(result.current.state.layout).toBe('B/./')
    expect(result.current.state.currentTurn).toBe(1)
    expect(result.current.state.status).toBe('playing')
  })

  test('broadcastMove con finished=true pone status en finished', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(5) })
    act(() => { result.current.broadcastMove('B/BB', 0, true, 0) })
    expect(result.current.state.status).toBe('finished')
    expect(result.current.state.winner).toBe(0)
  })

  // ── disconnect ──────────────────────────────────────────────────────────

  test('disconnect vuelve status a idle y limpia roomCode', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(5) })
    act(() => {
      mockWsInstance!.receive({ type: 'room_created', roomCode: 'TST001', boardSize: 5 })
    })
    expect(result.current.state.roomCode).toBe('TST001')
    act(() => { result.current.disconnect() })
    expect(result.current.state.status).toBe('idle')
    expect(result.current.state.roomCode).toBeNull()
  })

  // ── error ───────────────────────────────────────────────────────────────

  test('mensaje de error del servidor pone status en error', () => {
    const { result } = renderHook(() => useWebSocketRoom('Alice'))
    act(() => { result.current.createRoom(5) })
    act(() => {
      mockWsInstance!.receive({ type: 'error', message: 'Sala no encontrada' })
    })
    expect(result.current.state.status).toBe('error')
    expect(result.current.state.error).toBe('Sala no encontrada')
  })
})