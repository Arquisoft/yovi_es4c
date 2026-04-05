import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import LandingView from '../components/layout/LandingView'

describe('LandingView', () => {
  it('muestra el título Y-GAME', () => {
    render(<LandingView onPlayNow={vi.fn()} />)
    expect(screen.getByText('Y-GAME')).toBeInTheDocument()
  })

  it('muestra el subtítulo con el juego de conexión hexagonal', () => {
    render(<LandingView onPlayNow={vi.fn()} />)
    expect(screen.getByText(/conexión hexagonal/i)).toBeInTheDocument()
  })

  it('muestra el botón Jugar ahora', () => {
    render(<LandingView onPlayNow={vi.fn()} />)
    expect(screen.getByRole('button', { name: /jugar ahora/i })).toBeInTheDocument()
  })

  it('llama a onPlayNow al pulsar el botón', () => {
    const onPlayNow = vi.fn()
    render(<LandingView onPlayNow={onPlayNow} />)
    fireEvent.click(screen.getByRole('button', { name: /jugar ahora/i }))
    expect(onPlayNow).toHaveBeenCalledTimes(1)
  })

  it('muestra las feature pills', () => {
    render(<LandingView onPlayNow={vi.fn()} />)
    expect(screen.getByText(/niveles de ia/i)).toBeInTheDocument()
    expect(screen.getByText(/historial de partidas/i)).toBeInTheDocument()
  })
})
