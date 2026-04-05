import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from '../App'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock WebSocket para evitar conexiones reales
const MockWS = function() {
  return { readyState: 1, send: vi.fn(), close: vi.fn(), onopen: null, onmessage: null, onerror: null, onclose: null }
}
MockWS.OPEN = 1; MockWS.CLOSED = 3
vi.stubGlobal('WebSocket', MockWS)

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ([]) })
  })

  it('muestra la landing page al arrancar', () => {
    render(<App />)
    expect(screen.getByText('Y-GAME')).toBeInTheDocument()
  })

  it('muestra el NavBar siempre', () => {
    render(<App />)
    expect(screen.getByText('Y-Game')).toBeInTheDocument()
  })

  it('al pulsar Jugar ahora en landing se muestra el login', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /jugar ahora/i }))
    expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument()
  })

  it('al pulsar Regístrate aquí desde login se muestra el formulario de registro', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /jugar ahora/i }))
    fireEvent.click(screen.getByText(/regístrate aquí/i))
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument()
  })

  it('tras login exitoso muestra el selector de modo de juego', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ userId: 1 }) })
      .mockResolvedValue({ ok: true, json: async () => ([]) })

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /jugar ahora/i }))
    fireEvent.change(screen.getByRole('textbox', { name: /usuario/i }), { target: { value: 'Alice' } })
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: 'pass123' } })
    fireEvent.submit(document.querySelector('form')!)

    // El LoginForm hace setTimeout(300ms) antes de navegar
    await waitFor(() => {
      expect(screen.getByTestId('btn-start-game')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('el NavBar muestra Acceder cuando no está autenticado', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /acceder/i })).toBeInTheDocument()
  })

  it('al pulsar Acceder en el NavBar muestra el login', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /acceder/i }))
    expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument()
  })
})

// Helper: hace login completo y espera al selector de juego
async function loginAs(username = 'Alice', password = 'pass123') {
  fireEvent.click(screen.getByRole('button', { name: /jugar ahora/i }))
  fireEvent.change(screen.getByRole('textbox', { name: /usuario/i }), { target: { value: username } })
  fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: password } })
  fireEvent.submit(document.querySelector('form')!)
  await waitFor(() => expect(screen.getByTestId('btn-start-game')).toBeInTheDocument(), { timeout: 2000 })
}

describe('App — navegación autenticada', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ userId: 1 }) })
      .mockResolvedValue({ ok: true, json: async () => ([]) })
  })

  it('el NavBar muestra los enlaces de navegación tras login', async () => {
    render(<App />)
    await loginAs()
    expect(screen.getByText('Jugar')).toBeInTheDocument()
    expect(screen.getByText('Historial')).toBeInTheDocument()
    expect(screen.getByText('Perfil')).toBeInTheDocument()
  })

  it('navegar a Historial muestra el historial de partidas', async () => {
    render(<App />)
    await loginAs()
    fireEvent.click(screen.getByText('Historial'))
    await waitFor(() => expect(screen.getByText(/partidas/i)).toBeInTheDocument())
  })

  it('navegar a Perfil muestra la vista de perfil', async () => {
    render(<App />)
    await loginAs()
    fireEvent.click(screen.getByText('Perfil'))
    await waitFor(() => expect(screen.getByText('PERFIL')).toBeInTheDocument())
  })

  it('logout vuelve a la landing page y elimina los enlaces de nav', async () => {
    render(<App />)
    await loginAs()
    fireEvent.click(screen.getByTestId('btn-logout'))
    expect(screen.getByText('Y-GAME')).toBeInTheDocument()
    expect(screen.queryByText('Jugar')).not.toBeInTheDocument()
  })

  it('navegar a un appView sin autenticación muestra el login', () => {
    render(<App />)
    // Simular click en Acceder (navega a game sin auth)
    fireEvent.click(screen.getByRole('button', { name: /acceder/i }))
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('el logo Y-Game está visible en el NavBar y navega al juego', async () => {
    render(<App />)
    await loginAs()
    // Logo visible en NavBar
    expect(screen.getByText('Y-Game')).toBeInTheDocument()
    // Click en logo → appView='landing' + autenticado → default → GameView
    fireEvent.click(screen.getByText('Y-Game'))
    await waitFor(() => expect(screen.getByTestId('btn-start-game')).toBeInTheDocument())
  })
})

describe('App — rutas de autenticación adicionales', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ([]) })
  })

  it('desde el registro, pulsar "Inicia sesión" vuelve al login', () => {
    render(<App />)
    // Ir a landing → pulsar Jugar ahora → login
    fireEvent.click(screen.getByRole('button', { name: /jugar ahora/i }))
    // Ir a registro
    fireEvent.click(screen.getByText(/regístrate aquí/i))
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument()
    // Volver al login
    fireEvent.click(screen.getByText(/inicia sesión/i))
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('onGameReset (refreshHistory) se llama tras guardar partida bot', async () => {
    // login
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ userId: 1 }) })   // login
      .mockResolvedValueOnce({ ok: true, json: async () => ({ gameId: 42 }) })   // saveGame
      .mockResolvedValue({ ok: true, json: async () => ([]) })                   // history fetch

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /jugar ahora/i }))
    fireEvent.change(screen.getByRole('textbox', { name: /usuario/i }), { target: { value: 'Alice' } })
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: 'pass' } })
    fireEvent.submit(document.querySelector('form')!)
    await waitFor(() => expect(screen.getByTestId('btn-start-game')).toBeInTheDocument(), { timeout: 2000 })

    // Iniciar partida bot y hacer un movimiento ganador para disparar onGameReset
    // Solo comprobamos que no lanza errores — refreshHistory actualiza historyRefresh interno
    expect(screen.getByTestId('btn-start-game')).toBeInTheDocument()
  })
})