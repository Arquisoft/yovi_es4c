import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi, afterEach } from 'vitest'
import '@testing-library/jest-dom'
import GameModeSelector from '../components/game/GameModeSelector'

describe('GameModeSelector', () => {
  afterEach(() => vi.restoreAllMocks())

  // ── Renderizado inicial ──────────────────────────────────────────────────

  test('muestra ambas tarjetas de modo', () => {
    render(<GameModeSelector onStart={vi.fn()} />)
    expect(screen.getByTestId('mode-bot')).toBeInTheDocument()
    expect(screen.getByTestId('mode-multiplayer')).toBeInTheDocument()
  })

  test('el modo "vs Bot" está seleccionado por defecto', () => {
    render(<GameModeSelector onStart={vi.fn()} />)
    expect(screen.getByTestId('mode-bot')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('mode-multiplayer')).toHaveAttribute('aria-pressed', 'false')
  })

  test('en modo bot se muestra el selector de dificultad y quién empieza', () => {
    render(<GameModeSelector onStart={vi.fn()} />)
    expect(screen.getByLabelText(/dificultad/i)).toBeInTheDocument()
    expect(screen.getByTestId('starts-human')).toBeInTheDocument()
    expect(screen.getByTestId('starts-bot')).toBeInTheDocument()
  })

  test('el tamaño inicial del tablero es 7', () => {
    render(<GameModeSelector onStart={vi.fn()} />)
    expect(screen.getByTestId('board-size-value')).toHaveTextContent('7')
  })

  // ── Selección de modo ────────────────────────────────────────────────────

  test('al pulsar la tarjeta multijugador se selecciona', async () => {
    const user = userEvent.setup()
    render(<GameModeSelector onStart={vi.fn()} />)
    await user.click(screen.getByTestId('mode-multiplayer'))
    expect(screen.getByTestId('mode-multiplayer')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('mode-bot')).toHaveAttribute('aria-pressed', 'false')
  })

  test('en modo multijugador desaparecen las opciones de bot', async () => {
    const user = userEvent.setup()
    render(<GameModeSelector onStart={vi.fn()} />)
    await user.click(screen.getByTestId('mode-multiplayer'))
    expect(screen.queryByLabelText(/dificultad/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('starts-human')).not.toBeInTheDocument()
  })

  // ── Tamaño del tablero ───────────────────────────────────────────────────

  test('el botón "+" incrementa el tamaño', async () => {
    const user = userEvent.setup()
    render(<GameModeSelector onStart={vi.fn()} />)
    await user.click(screen.getByTestId('size-increase'))
    expect(screen.getByTestId('board-size-value')).toHaveTextContent('8')
  })

  test('el botón "-" decrementa el tamaño', async () => {
    const user = userEvent.setup()
    render(<GameModeSelector onStart={vi.fn()} />)
    await user.click(screen.getByTestId('size-increase')) // 8
    await user.click(screen.getByTestId('size-decrease')) // 7
    expect(screen.getByTestId('board-size-value')).toHaveTextContent('7')
  })

  test('no se puede bajar del mínimo (5)', async () => {
    const user = userEvent.setup()
    render(<GameModeSelector onStart={vi.fn()} />)
    for (let i = 0; i < 5; i++) {
      const btn = screen.getByTestId('size-decrease')
      if (!btn.hasAttribute('disabled')) await user.click(btn)
    }
    expect(screen.getByTestId('size-decrease')).toBeDisabled()
    expect(screen.getByTestId('board-size-value')).toHaveTextContent('5')
  })

  test('no existe límite superior (botón "+" nunca se deshabilita)', async () => {
    const user = userEvent.setup()
    render(<GameModeSelector onStart={vi.fn()} />)
    for (let i = 0; i < 10; i++) {
      await user.click(screen.getByTestId('size-increase'))
    }
    expect(screen.getByTestId('size-increase')).toBeEnabled()
    expect(screen.getByTestId('board-size-value')).toHaveTextContent('17')
  })

  // ── Llamada a onStart ────────────────────────────────────────────────────

  test('onStart recibe config correcta en modo bot por defecto', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<GameModeSelector onStart={onStart} />)
    await user.click(screen.getByTestId('btn-start-game'))
    expect(onStart).toHaveBeenCalledOnce()
    const cfg = onStart.mock.calls[0][0]
    expect(cfg.mode).toBe('bot')
    expect(cfg.boardSize).toBe(7)
    expect(cfg.botDifficulty).toBe('random_bot')
    expect(cfg.humanPlayerIndex).toBe(0)
  })

  test('onStart recibe humanPlayerIndex=1 cuando se elige "Bot empieza"', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<GameModeSelector onStart={onStart} />)
    await user.click(screen.getByTestId('starts-bot'))
    await user.click(screen.getByTestId('btn-start-game'))
    expect(onStart.mock.calls[0][0].humanPlayerIndex).toBe(1)
  })

  test('onStart recibe mode=multiplayer en modo multijugador', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<GameModeSelector onStart={onStart} />)
    await user.click(screen.getByTestId('mode-multiplayer'))
    await user.click(screen.getByTestId('btn-start-game'))
    expect(onStart.mock.calls[0][0].mode).toBe('multiplayer')
  })

  test('el texto del botón cambia según el modo', async () => {
    const user = userEvent.setup()
    render(<GameModeSelector onStart={vi.fn()} />)
    expect(screen.getByTestId('btn-start-game')).toHaveTextContent(/JUGAR CONTRA BOT/i)
    await user.click(screen.getByTestId('mode-multiplayer'))
    expect(screen.getByTestId('btn-start-game')).toHaveTextContent(/BUSCAR SALA/i)
  })

  test('onStart recibe el boardSize actualizado', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    render(<GameModeSelector onStart={onStart} />)
    await user.click(screen.getByTestId('size-increase')) // 8
    await user.click(screen.getByTestId('size-increase')) // 9
    await user.click(screen.getByTestId('btn-start-game'))
    expect(onStart.mock.calls[0][0].boardSize).toBe(9)
  })
})
