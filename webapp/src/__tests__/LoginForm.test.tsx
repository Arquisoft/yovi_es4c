import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import LoginForm from '../components/auth/LoginForm'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function submit(username = '', password = '') {
  if (username) fireEvent.change(screen.getByRole('textbox', { name: /usuario/i }), { target: { value: username } })
  if (password) fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: password } })
  fireEvent.submit(document.querySelector('form')!)
}

describe('LoginForm', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renderiza el campo de usuario', () => {
    render(<LoginForm />)
    expect(screen.getByRole('textbox', { name: /usuario/i })).toBeInTheDocument()
  })

  it('renderiza el campo de contraseña', () => {
    render(<LoginForm />)
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument()
  })

  it('renderiza el botón Entrar', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('muestra error si se envía sin usuario', async () => {
    render(<LoginForm />)
    submit()
    await waitFor(() => expect(screen.getByText(/introduce un nombre de usuario/i)).toBeInTheDocument())
  })

  it('muestra error si se envía sin contraseña', async () => {
    render(<LoginForm />)
    submit('Alice')
    await waitFor(() => expect(screen.getByText(/introduce una contraseña/i)).toBeInTheDocument())
  })

  it('llama a fetch con las credenciales al enviar', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ userId: 1 }) })
    render(<LoginForm />)
    submit('Alice', 'pass123')
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/login'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ username: 'Alice', password: 'pass123' }) })
    ))
  })

  it('llama a onLoginSuccess tras login exitoso', async () => {
    const onLoginSuccess = vi.fn()
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ userId: 42 }) })
    render(<LoginForm onLoginSuccess={onLoginSuccess} />)
    submit('Alice', 'pass123')
    // El componente hace setTimeout(300ms) antes de llamar onLoginSuccess
    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith('Alice', 42), { timeout: 2000 })
  })

  it('muestra el error de la API con credenciales incorrectas', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Credenciales inválidas' }) })
    render(<LoginForm />)
    submit('Alice', 'wrong')
    await waitFor(() => expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument())
  })

  it('muestra error de red si fetch lanza excepción', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    render(<LoginForm />)
    submit('Alice', 'pass')
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument())
  })

  it('deshabilita el botón mientras carga', async () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {}))
    render(<LoginForm />)
    submit('Alice', 'pass')
    await waitFor(() => {
      const btn = document.querySelector('button[type="submit"]')
      expect(btn).toBeDisabled()
    })
  })

  it('llama a onGoToRegister al pulsar el enlace de registro', () => {
    const onGoToRegister = vi.fn()
    render(<LoginForm onGoToRegister={onGoToRegister} />)
    fireEvent.click(screen.getByText(/regístrate aquí/i))
    expect(onGoToRegister).toHaveBeenCalled()
  })
})
