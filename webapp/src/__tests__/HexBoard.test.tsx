import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import HexBoard, { buildHexGeometry, flatHexPoints } from '../components/game/HexBoard'

const defaultProps = {
  layout: './..',
  boardSize: 2,
  currentTurn: 0,
  canInteract: true,
  gameOver: false,
  loading: false,
  onCellClick: vi.fn(),
}

describe('buildHexGeometry', () => {
  it('genera el número correcto de celdas para tamaño 3', () => {
    const { cells } = buildHexGeometry(3, 30)
    // 1 + 2 + 3 = 6 celdas
    expect(cells).toHaveLength(6)
  })

  it('genera el número correcto de celdas para tamaño 5', () => {
    const { cells } = buildHexGeometry(5, 30)
    // 1+2+3+4+5 = 15 celdas
    expect(cells).toHaveLength(15)
  })

  it('la primera celda está en fila 0, col 0', () => {
    const { cells } = buildHexGeometry(3, 30)
    expect(cells[0]).toMatchObject({ row: 0, col: 0 })
  })

  it('la última celda es la última columna de la última fila', () => {
    const { cells } = buildHexGeometry(3, 30)
    const last = cells[cells.length - 1]
    expect(last).toMatchObject({ row: 2, col: 2 })
  })

  it('svgW y svgH son valores positivos', () => {
    const { svgW, svgH } = buildHexGeometry(5, 30)
    expect(svgW).toBeGreaterThan(0)
    expect(svgH).toBeGreaterThan(0)
  })

  it('hexR y colStep y rowStep son correctos', () => {
    const { hexR, colStep, rowStep } = buildHexGeometry(3, 30)
    expect(hexR).toBe(30)
    expect(colStep).toBeCloseTo(Math.sqrt(3) * 30)
    expect(rowStep).toBeCloseTo(1.5 * 30)
  })
})

describe('flatHexPoints', () => {
  it('devuelve una cadena con 6 pares de coordenadas', () => {
    const pts = flatHexPoints(50, 50, 20)
    const pairs = pts.trim().split(' ')
    expect(pairs).toHaveLength(6)
  })

  it('cada par tiene formato x,y', () => {
    const pts = flatHexPoints(50, 50, 20)
    pts.split(' ').forEach(pair => {
      expect(pair).toMatch(/^\d+\.?\d*,\d+\.?\d*$/)
    })
  })
})

describe('HexBoard', () => {
  it('renderiza el SVG del tablero', () => {
    render(<HexBoard {...defaultProps} />)
    expect(screen.getByTestId('hex-board')).toBeInTheDocument()
  })

  it('las celdas vacías son clickables cuando canInteract=true', () => {
    const onCellClick = vi.fn()
    render(<HexBoard {...defaultProps} onCellClick={onCellClick} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('llama a onCellClick al hacer click en una celda vacía', () => {
    const onCellClick = vi.fn()
    render(<HexBoard {...defaultProps} onCellClick={onCellClick} />)
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(onCellClick).toHaveBeenCalledWith(0, 0)
  })

  it('no hay botones clickables cuando canInteract=false', () => {
    render(<HexBoard {...defaultProps} canInteract={false} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('no hay botones clickables cuando gameOver=true', () => {
    render(<HexBoard {...defaultProps} gameOver />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('no hay botones clickables cuando loading=true', () => {
    render(<HexBoard {...defaultProps} loading />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('renderiza celdas azules (B) y rojas (R) correctamente', () => {
    // layout 2: fila0='B', fila1='R.'
    render(<HexBoard {...defaultProps} layout="B/R." boardSize={2} />)
    // Las celdas con B y R no son clickables (no vacías)
    const buttons = screen.queryAllByRole('button')
    // Solo la celda vacía (.) en fila 1 col 1 debería ser button
    expect(buttons).toHaveLength(1)
  })

  it('aplica aria-label a celdas clickables', () => {
    render(<HexBoard {...defaultProps} />)
    const cell = screen.getByLabelText('celda 0-0')
    expect(cell).toBeInTheDocument()
  })

  it('tamaño 1: solo una celda', () => {
    const { cells } = buildHexGeometry(1, 30)
    expect(cells).toHaveLength(1)
  })
})

describe('HexBoard — hover handlers', () => {
  it('onMouseEnter en celda vacía clickable no lanza error', () => {
    render(<HexBoard {...defaultProps} />)
    // Las celdas vacías clickables tienen un <polygon> dentro del <g role="button">
    const polygons = document.querySelectorAll('polygon')
    expect(polygons.length).toBeGreaterThan(0)
    // Disparar mouseEnter en el primer polygon (celda vacía)
    expect(() => fireEvent.mouseEnter(polygons[0])).not.toThrow()
  })

  it('onMouseLeave en celda vacía clickable no lanza error', () => {
    render(<HexBoard {...defaultProps} />)
    const polygons = document.querySelectorAll('polygon')
    expect(() => fireEvent.mouseLeave(polygons[0])).not.toThrow()
  })

  it('onMouseEnter/Leave en celda ocupada (no clickable) no hace nada', () => {
    render(<HexBoard {...defaultProps} layout="B/R." boardSize={2} canInteract />)
    const polygons = document.querySelectorAll('polygon')
    // Primer polygon es la celda B — no clickable
    expect(() => fireEvent.mouseEnter(polygons[0])).not.toThrow()
    expect(() => fireEvent.mouseLeave(polygons[0])).not.toThrow()
  })
})
