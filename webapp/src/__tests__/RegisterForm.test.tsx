import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterForm from '../components/auth/RegisterForm'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('RegisterForm', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('Se intenta registrar sin poner nombre de usuario y muestra error', async () => {
    render(<RegisterForm />)
    const user = userEvent.setup()

    // El botón del componente dice "¡Crear cuenta!"
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      // El componente muestra "Introduce un nombre de usuario."
      expect(screen.getByText(/introduce un nombre de usuario/i)).toBeInTheDocument()
    })
  })

  test('Se intenta registrar sin poner contraseña y muestra error', async () => {
    render(<RegisterForm />)
    const user = userEvent.setup()

    // El label del campo es "Usuario" (id="username")
    await user.type(screen.getByLabelText(/usuario/i), 'Ana')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      // El componente muestra "Introduce una contraseña."
      expect(screen.getByText(/introduce una contraseña/i)).toBeInTheDocument()
    })
  })

  test('Se registra un usuario correctamente y muestra mensaje de bienvenida', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Hello Pablo! welcome to the course!' }),
    } as Response)

    render(<RegisterForm />)

    await user.type(screen.getByLabelText(/usuario/i), 'Pablo')
    await user.type(screen.getByLabelText(/contraseña/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/hello pablo! welcome to the course!/i)
      ).toBeInTheDocument()
    })
  })

  test('Se intenta registrar con un nombre de usuario en uso', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Username already taken' }),
    } as Response)

    render(<RegisterForm />)

    await user.type(screen.getByLabelText(/usuario/i), 'existinguser')
    await user.type(screen.getByLabelText(/contraseña/i), 'password')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(screen.getByText(/username already taken/i)).toBeInTheDocument()
    })
  })

  test('Muestra error de red si falla la llamada a la API', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('network down'))

    render(<RegisterForm />)

    await user.type(screen.getByLabelText(/usuario/i), 'foo')
    await user.type(screen.getByLabelText(/contraseña/i), 'bar')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => {
      expect(screen.getByText(/network down/i)).toBeInTheDocument()
    })
  })
})

  test('llama a onRegisterSuccess tras registro y auto-login exitoso', async () => {
    const onRegisterSuccess = vi.fn()
    const user = userEvent.setup()

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Hello Alice! welcome to the course!' }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ userId: 42 }) } as Response)

    render(<RegisterForm onRegisterSuccess={onRegisterSuccess} />)

    await user.type(screen.getByLabelText(/usuario/i), 'Alice')
    await user.type(screen.getByLabelText(/contraseña/i), 'pass123')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => expect(onRegisterSuccess).toHaveBeenCalledWith('Alice', 42), { timeout: 2000 })
  })

  test('llama a onGoToLogin si el auto-login falla tras registro', async () => {
    const onGoToLogin = vi.fn()
    const user = userEvent.setup()

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'Hello Bob! welcome to the course!' }) } as Response)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Invalid credentials' }) } as Response)

    render(<RegisterForm onGoToLogin={onGoToLogin} />)

    await user.type(screen.getByLabelText(/usuario/i), 'Bob')
    await user.type(screen.getByLabelText(/contraseña/i), 'pass123')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))

    await waitFor(() => expect(onGoToLogin).toHaveBeenCalled(), { timeout: 2000 })
  })

  test('el enlace Inicia sesión llama a onGoToLogin', async () => {
    const onGoToLogin = vi.fn()
    const user = userEvent.setup()
    render(<RegisterForm onGoToLogin={onGoToLogin} />)
    await user.click(screen.getByText(/inicia sesión/i))
    expect(onGoToLogin).toHaveBeenCalled()
  })
