/**
 * HexBoard.tsx
 *
 * Tablero SVG para el juego Hex (triángulo de n×n celdas).
 * Corrección de la geometría original:
 *   - Se usa orientación "pointy-top" (vértice arriba).
 *   - colStep = sqrt(3) * r  → separación horizontal entre centros de la misma fila.
 *   - rowStep = 1.5 * r      → separación vertical entre filas.
 *   - El offset horizontal de cada fila hace que el tablero tenga forma de rombo.
 *   - Se deja un gap de 1.5px entre hexágonos (radio de render = r − 1.5).
 * Con esto cada hexágono ocupa exactamente su espacio sin solaparse con vecinos.
 */
import { memo } from 'react';
import { Box, Paper } from '@mui/material';

export interface HexBoardProps {
  /** YEN layout: filas separadas por '/', celdas: '.' | 'B' | 'R' */
  layout: string;
  boardSize: number;
  /** Índice del jugador cuyo turno es (0 = Azul, 1 = Rojo) */
  currentTurn: number;
  /** Si el usuario que ve el tablero puede hacer click */
  canInteract: boolean;
  gameOver: boolean;
  loading: boolean;
  onCellClick: (row: number, col: number) => void;
}

// ----- Geometría -----

/** Puntos de un hexágono pointy-top centrado en (cx, cy) con radio r */
function pointyHexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6; // 30° de offset → pointy-top
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
}

interface Cell {
  row: number;
  col: number;
  cx: number;
  cy: number;
}

/**
 * Construye las posiciones de las n*(n+1)/2 celdas del tablero triangular.
 * Fila r tiene (r+1) celdas; la fila r se desplaza a la derecha conforme r crece
 * para mantener la forma de rombo del Hex.
 */
function buildCells(n: number, r: number): { cells: Cell[]; svgW: number; svgH: number } {
  const colStep = Math.sqrt(3) * r;   // distancia horizontal entre centros
  const rowStep = 1.5 * r;            // distancia vertical entre centros

  const cells: Cell[] = [];
  for (let row = 0; row < n; row++) {
    // Cada fila se desplaza medio colStep hacia la derecha respecto a la anterior
    const rowOffsetX = row * (colStep / 2);
    for (let col = 0; col <= row; col++) {
      cells.push({
        row,
        col,
        cx: rowOffsetX + col * colStep,
        cy: row * rowStep,
      });
    }
  }

  // Dimensiones del SVG: añadir margen r en todos los lados
  const maxCx = Math.max(...cells.map(c => c.cx));
  const maxCy = Math.max(...cells.map(c => c.cy));
  return {
    cells,
    svgW: maxCx + colStep,   // colStep da espacio para el último hexágono
    svgH: maxCy + 2 * r,     // 2r da espacio vertical para el último hexágono
  };
}

// ----- Colores -----
const EMPTY_FILL   = '#0d1f35';
const EMPTY_STROKE = '#00e5ff22';
const HOVER_FILL   = '#1a3a5c';
const HOVER_STROKE = '#00e5ff99';

const BLUE_FILL   = '#1d4ed8';
const BLUE_STROKE = '#60a5fa';
const BLUE_DOT    = '#93c5fd';

const RED_FILL   = '#b91c1c';
const RED_STROKE = '#f87171';
const RED_DOT    = '#fca5a5';

// ----- Componente -----
const HexBoard = memo(function HexBoard({
  layout,
  boardSize,
  canInteract,
  gameOver,
  loading,
  onCellClick,
}: HexBoardProps) {
  // Radio del hexágono escalado según el tamaño del tablero
  const HEX_R = Math.max(13, Math.min(34, Math.round(260 / boardSize)));
  const GAP = 1.5; // gap visual entre hexágonos
  const RENDER_R = HEX_R - GAP;

  const PAD = HEX_R * 1.4;
  const { cells, svgW, svgH } = buildCells(boardSize, HEX_R);
  const viewW = svgW + PAD * 2;
  const viewH = svgH + PAD * 2;

  const layoutRows = layout ? layout.split('/') : [];

  return (
    <Paper
      sx={{
        border: '1px solid #00e5ff15',
        background: 'linear-gradient(135deg, #0a1628 0%, #0d1526 100%)',
        overflow: 'auto',
        p: { xs: 1, sm: 2 },
      }}
    >
      <Box sx={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${viewW} ${viewH}`}
          style={{ width: '100%', maxWidth: viewW, height: 'auto', display: 'block', margin: '0 auto' }}
          aria-label="tablero de juego"
          data-testid="hex-board"
        >
          <defs>
            <filter id="hb-glow-b" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="hb-glow-r" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {cells.map(({ row, col, cx, cy }) => {
            const rawCell = layoutRows[row]?.[col] ?? '.';
            const isBlue  = rawCell === 'B';
            const isRed   = rawCell === 'R';
            const isEmpty = rawCell === '.';
            const clickable = isEmpty && canInteract && !gameOver && !loading;

            // Trasladar al centro del SVG aplicando el padding
            const pcx = cx + PAD;
            const pcy = cy + PAD;
            const pts = pointyHexPoints(pcx, pcy, RENDER_R);

            const fill   = isBlue ? BLUE_FILL   : isRed ? RED_FILL   : EMPTY_FILL;
            const stroke = isBlue ? BLUE_STROKE : isRed ? RED_STROKE : EMPTY_STROKE;
            const sw     = isBlue || isRed ? 2 : 1;
            const filter = isBlue ? 'url(#hb-glow-b)' : isRed ? 'url(#hb-glow-r)' : undefined;

            return (
              <g
                key={`${row}-${col}`}
                role={clickable ? 'button' : undefined}
                aria-label={clickable ? `celda ${row}-${col}` : undefined}
                style={{ cursor: clickable ? 'pointer' : 'default' }}
                onClick={() => clickable && onCellClick(row, col)}
              >
                <polygon
                  points={pts}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={sw}
                  filter={filter}
                  style={{ transition: 'fill 0.12s, stroke 0.12s' }}
                  onMouseEnter={clickable ? (e) => {
                    const el = e.currentTarget as SVGPolygonElement;
                    el.setAttribute('fill', HOVER_FILL);
                    el.setAttribute('stroke', HOVER_STROKE);
                    el.setAttribute('stroke-width', '2');
                  } : undefined}
                  onMouseLeave={clickable ? (e) => {
                    const el = e.currentTarget as SVGPolygonElement;
                    el.setAttribute('fill', EMPTY_FILL);
                    el.setAttribute('stroke', EMPTY_STROKE);
                    el.setAttribute('stroke-width', '1');
                  } : undefined}
                />
                {/* Punto indicador en casillas ocupadas */}
                {(isBlue || isRed) && (
                  <circle
                    cx={pcx}
                    cy={pcy}
                    r={RENDER_R * 0.28}
                    fill={isBlue ? BLUE_DOT : RED_DOT}
                    opacity={0.8}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </Box>
    </Paper>
  );
});

export default HexBoard;
