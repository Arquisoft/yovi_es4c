import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Logout from '../components/auth/Logout'
import { describe, expect, test, vi } from 'vitest'
import '@testing-library/jest-dom'

describe('Logout', () => {

  test('Muestra el nombre de usuario', () => {
    render(<Logout username="Sergio" onLogout={() => {}} />)

    expect(screen.getByText(/conectado como:/i)).toBeInTheDocument()
    expect(screen.getByText(/sergio/i)).toBeInTheDocument()
  })

  test('Llama a la función de desconexión al clickear el botón', async () => {
    const user = userEvent.setup()
    const mockLogout = vi.fn()

    render(<Logout username="Pablo" onLogout={mockLogout} />)

    await user.click(screen.getByRole('button', { name: /desconectar/i }))

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

})