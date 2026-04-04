/**
 * HexBoard.tsx
 *
 * Tablero SVG hexagonal — pirámide centrada, crece de arriba a abajo.
 *
 * GEOMETRÍA — Hexágonos flat-top (lados planos arriba/abajo):
 *
 *   colStep = √3 · r   → separación horizontal entre centros de la misma fila
 *   rowStep = 1.5 · r  → separación vertical entre filas
 *
 *   Anchura de la fila r (en celdas): r + 1
 *   Anchura máxima (base, fila n-1):  n celdas → baseWidth = (n-1) · colStep
 *
 *   Para centrar la fila r respecto a la base:
 *     offsetX(r) = (baseWidth - rowWidth(r)) / 2
 *               = ((n-1) · colStep - r · colStep) / 2
 *               = (n - 1 - r) · colStep / 2
 *
 *   Posición de la celda (row, col):
 *     cx = offsetX(row) + col · colStep
 *     cy = row · rowStep
 *
 * Con esto la fila 0 tiene 1 celda centrada arriba y la fila n-1
 * tiene n celdas centradas abajo: forma de pirámide perfecta.
 *
 * La función buildHexGeometry se exporta para que GameHistory
 * use exactamente el mismo algoritmo en su MiniBoard.
 */
import { memo } from 'react';
import { Box, Paper } from '@mui/material';

// ── Tipos públicos ──────────────────────────────────────────────────────────

export interface HexBoardProps {
  layout:      string;   // YEN: filas separadas por '/', celdas '.' | 'B' | 'R'
  boardSize:   number;
  currentTurn: number;
  canInteract: boolean;
  gameOver:    boolean;
  loading:     boolean;
  onCellClick: (row: number, col: number) => void;
}

export interface HexCell {
  row: number;
  col: number;
  cx:  number;
  cy:  number;
}

export interface HexGeometry {
  cells:   HexCell[];
  svgW:    number;
  svgH:    number;
  hexR:    number;
  colStep: number;
  rowStep: number;
}

// ── Geometría exportada ──────────────────────────────────────────────────────

/**
 * Calcula las posiciones de todas las celdas del tablero triangular
 * formando una pirámide centrada (fila 0 = 1 celda arriba, fila n-1 = n celdas abajo).
 *
 * @param n     tamaño del tablero (número de filas)
 * @param hexR  radio del hexágono (distancia del centro a cada vértice)
 */
export function buildHexGeometry(n: number, hexR: number): HexGeometry {
  const colStep = Math.sqrt(3) * hexR;   // separación horizontal
  const rowStep = 1.5 * hexR;            // separación vertical

  const cells: HexCell[] = [];

  for (let row = 0; row < n; row++) {
    // Offset para centrar esta fila respecto a la base (fila n-1)
    const offsetX = ((n - 1 - row) * colStep) / 2;

    for (let col = 0; col <= row; col++) {
      cells.push({
        row,
        col,
        cx: offsetX + col * colStep,
        cy: row * rowStep,
      });
    }
  }

  // Ancho = anchura de la base (fila n-1 tiene n celdas)
  // La base ocupa desde 0 hasta (n-1)*colStep + colStep = n*colStep
  const svgW = (n - 1) * colStep + colStep;
  // Alto = hasta el centro de la última fila + radio
  const maxCy = (n - 1) * rowStep;
  const svgH  = maxCy + 2 * hexR;

  return { cells, svgW, svgH, hexR, colStep, rowStep };
}

/**
 * Puntos de un hexágono flat-top centrado en (cx, cy) con radio r.
 * Ángulo 0° = vértice derecho, incrementos de 60°.
 */
export function flatHexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i;
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
}

// ── Colores ─────────────────────────────────────────────────────────────────

const C = {
  emptyFill:   '#0d1f35',
  emptyStroke: '#00e5ff22',
  hoverFill:   '#1a3a5c',
  hoverStroke: '#00e5ff99',
  blueFill:    '#1d4ed8',
  blueStroke:  '#60a5fa',
  blueDot:     '#93c5fd',
  redFill:     '#b91c1c',
  redStroke:   '#f87171',
  redDot:      '#fca5a5',
} as const;

// ── Componente ───────────────────────────────────────────────────────────────

const HexBoard = memo(function HexBoard({
  layout,
  boardSize,
  canInteract,
  gameOver,
  loading,
  onCellClick,
}: HexBoardProps) {
  // Radio sin límite superior: escala libremente con el tamaño del tablero
  const HEX_R    = Math.max(10, Math.round(220 / boardSize));
  const GAP      = 1.5;
  const RENDER_R = HEX_R - GAP;
  const PAD      = HEX_R * 1.2;

  const { cells, svgW, svgH } = buildHexGeometry(boardSize, HEX_R);
  const viewW = svgW + PAD * 2;
  const viewH = svgH + PAD * 2;

  const layoutRows = layout ? layout.split('/') : [];

  return (
    <Paper
      sx={{
        border:     '1px solid #00e5ff15',
        background: 'linear-gradient(135deg, #0a1628 0%, #0d1526 100%)',
        overflow:   'auto',
        p:          { xs: 1, sm: 2 },
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
            const rawCell   = layoutRows[row]?.[col] ?? '.';
            const isBlue    = rawCell === 'B';
            const isRed     = rawCell === 'R';
            const isEmpty   = rawCell === '.';
            const clickable = isEmpty && canInteract && !gameOver && !loading;

            const pcx = cx + PAD;
            const pcy = cy + PAD;
            const pts = flatHexPoints(pcx, pcy, RENDER_R);

            const fill   = isBlue ? C.blueFill   : isRed ? C.redFill   : C.emptyFill;
            const stroke = isBlue ? C.blueStroke : isRed ? C.redStroke : C.emptyStroke;
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
                    el.setAttribute('fill', C.hoverFill);
                    el.setAttribute('stroke', C.hoverStroke);
                    el.setAttribute('stroke-width', '2');
                  } : undefined}
                  onMouseLeave={clickable ? (e) => {
                    const el = e.currentTarget as SVGPolygonElement;
                    el.setAttribute('fill', C.emptyFill);
                    el.setAttribute('stroke', C.emptyStroke);
                    el.setAttribute('stroke-width', '1');
                  } : undefined}
                />
                {(isBlue || isRed) && (
                  <circle
                    cx={pcx}
                    cy={pcy}
                    r={RENDER_R * 0.28}
                    fill={isBlue ? C.blueDot : C.redDot}
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
