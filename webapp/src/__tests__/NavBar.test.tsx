import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import NavBar from '../components/layout/NavBar'

const baseProps = {
  isAuthenticated: false,
  username: '',
  currentView: 'landing' as const,
  onNavigate: vi.fn(),
  onLoginClick: vi.fn(),
  onLogout: vi.fn(),
}

describe('NavBar', () => {
  it('muestra el logo Y-Game', () => {
    render(<NavBar {...baseProps} />)
    expect(screen.getByText('Y-Game')).toBeInTheDocument()
  })

  it('no autenticado: muestra botón Acceder', () => {
    render(<NavBar {...baseProps} />)
    expect(screen.getByRole('button', { name: /acceder/i })).toBeInTheDocument()
  })

  it('no autenticado: no muestra enlaces de navegación', () => {
    render(<NavBar {...baseProps} />)
    expect(screen.queryByText('Jugar')).not.toBeInTheDocument()
    expect(screen.queryByText('Historial')).not.toBeInTheDocument()
    expect(screen.queryByText('Perfil')).not.toBeInTheDocument()
  })

  it('autenticado: muestra enlaces Jugar, Historial, Perfil', () => {
    render(<NavBar {...baseProps} isAuthenticated username="Alice" />)
    expect(screen.getByText('Jugar')).toBeInTheDocument()
    expect(screen.getByText('Historial')).toBeInTheDocument()
    expect(screen.getByText('Perfil')).toBeInTheDocument()
  })

  it('autenticado: muestra el nombre de usuario', () => {
    render(<NavBar {...baseProps} isAuthenticated username="Alice" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('autenticado: no muestra botón Acceder', () => {
    render(<NavBar {...baseProps} isAuthenticated username="Alice" />)
    expect(screen.queryByRole('button', { name: /acceder/i })).not.toBeInTheDocument()
  })

  it('llama a onLoginClick al pulsar Acceder', () => {
    const onLoginClick = vi.fn()
    render(<NavBar {...baseProps} onLoginClick={onLoginClick} />)
    fireEvent.click(screen.getByRole('button', { name: /acceder/i }))
    expect(onLoginClick).toHaveBeenCalled()
  })

  it('llama a onLogout al pulsar el botón de cerrar sesión', () => {
    const onLogout = vi.fn()
    render(<NavBar {...baseProps} isAuthenticated username="Alice" onLogout={onLogout} />)
    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }))
    expect(onLogout).toHaveBeenCalled()
  })

  it('llama a onNavigate("game") al pulsar Jugar', () => {
    const onNavigate = vi.fn()
    render(<NavBar {...baseProps} isAuthenticated username="Alice" onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Jugar'))
    expect(onNavigate).toHaveBeenCalledWith('game')
  })

  it('llama a onNavigate("history") al pulsar Historial', () => {
    const onNavigate = vi.fn()
    render(<NavBar {...baseProps} isAuthenticated username="Alice" onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Historial'))
    expect(onNavigate).toHaveBeenCalledWith('history')
  })

  it('llama a onNavigate("landing") al pulsar el logo', () => {
    const onNavigate = vi.fn()
    render(<NavBar {...baseProps} onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Y-Game'))
    expect(onNavigate).toHaveBeenCalledWith('landing')
  })
})
