import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterForm from '../components/auth/RegisterForm'
import { afterEach, describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('RegisterForm', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('Se intenta logear sin poner nombre de usuario y muestra error', async () => {
    render(<RegisterForm />)
    const user = userEvent.setup()

    // Envío del formulario
    await user.click(screen.getByRole('button', { name: /let's go!/i }))

    await waitFor(() => {
      expect(screen.getByText(/please enter a username/i)).toBeInTheDocument()
    })
  })

  test('Se intenta logear sin poner contraseña y muestra error', async () => {
    render(<RegisterForm />)
    const user = userEvent.setup()

    // Introducción de datos y envío del formulario
    await user.type(screen.getByLabelText(/username/i), 'Ana')
    await user.click(screen.getByRole('button', { name: /let's go!/i }))

    await waitFor(() => {
      expect(screen.getByText(/please enter a password/i)).toBeInTheDocument()
    })
  })

  test('Se logea un usuario correctamente', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Hello Pablo! Welcome to the course!' }),
    } as Response)

    render(<RegisterForm />)

    // Introducción de datos y envío del formulario
    await user.type(screen.getByLabelText(/username/i), 'Pablo')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /let's go!/i }))

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

    // Introducción de datos y envío del formulario
    await user.type(screen.getByLabelText(/username/i), 'existinguser')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /let's go!/i }))

    await waitFor(() => {
      expect(screen.getByText(/username already taken/i)).toBeInTheDocument()
    })
  })

  test('Muestra error de red si falla la llamada a la API', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('network down'))

    render(<RegisterForm />)

    // Introducción de datos y envío del formulario
    await user.type(screen.getByLabelText(/username/i), 'foo')
    await user.type(screen.getByLabelText(/password/i), 'bar')
    await user.click(screen.getByRole('button', { name: /let's go!/i }))

    await waitFor(() => {
      expect(screen.getByText(/network down/i)).toBeInTheDocument()
    })
  })

})