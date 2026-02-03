import React, { useState, useEffect } from 'react';
import { type YEN, chooseMove } from './api/gameyClient';

interface GameProps {
    size?: number;
}

const Game: React.FC<GameProps> = ({ size = 5 }) => {
    const [yen, setYen] = useState<YEN>({
        size: size,
        turn: 0,
        players: ['B', 'R'],
        layout: '',
    });
    const [status, setStatus] = useState<string>('Tu turno (Azul)');
    const [loading, setLoading] = useState<boolean>(false);

    const initializeLayout = (s: number): string => {
        let rows: string[] = [];
        for (let i = 1; i <= s; i++) {
            rows.push('.'.repeat(i));
        }
        return rows.join('/');
    };

    useEffect(() => {
        setYen(prev => ({
            ...prev,
            size: size,
            layout: initializeLayout(size),
            turn: 0
        }));
        setStatus('Tu turno (Azul)');
    }, [size]);

    // Lógica para verificar la victoria en el juego de Y
    const checkWinner = (layout: string, player: string): boolean => {
        const rows = layout.split('/');
        const visited = new Set<string>();
        const queue: [number, number][] = [];

        // 1. Iniciamos la búsqueda desde cualquier celda del jugador en el Lado Izquierdo (col 0)
        for (let r = 0; r < size; r++) {
            if (rows[r][0] === player) {
                queue.push([r, 0]);
                visited.add(`${r},0`);
            }
        }

        let touchesRight = false;
        let touchesBottom = false;

        while (queue.length > 0) {
            const [r, c] = queue.shift()!;

            // Verificar si la celda actual toca los otros bordes
            if (c === r) touchesRight = true;          // Lado Derecho
            if (r === size - 1) touchesBottom = true; // Lado Inferior

            if (touchesRight && touchesBottom) return true; // Conexión de 3 lados detectada

            // Vecinos en rejilla triangular (6 direcciones)
            const neighbors = [
                [r, c - 1], [r, c + 1],         // Misma fila
                [r - 1, c - 1], [r - 1, c],     // Fila superior
                [r + 1, c], [r + 1, c + 1]      // Fila inferior
            ];

            for (const [nr, nc] of neighbors) {
                if (nr >= 0 && nr < size && nc >= 0 && nc <= nr &&
                    rows[nr][nc] === player && !visited.has(`${nr},${nc}`)) {
                    visited.add(`${nr},${nc}`);
                    queue.push([nr, nc]);
                }
            }
        }
        return false;
    };

    const handleCellClick = async (row: number, col: number) => {
        // Bloquear si no es el turno del jugador (0), si está cargando o si el juego terminó (-1)
        if (yen.turn !== 0 || loading) return;

        let rows = yen.layout.split('/');
        if (rows[row][col] !== '.') return;

        // 1. Movimiento del Jugador
        let newRowStr = rows[row].substring(0, col) + yen.players[0] + rows[row].substring(col + 1);
        rows[row] = newRowStr;
        const layoutAfterPlayer = rows.join('/');

        if (checkWinner(layoutAfterPlayer, yen.players[0])) {
            setYen({ ...yen, layout: layoutAfterPlayer, turn: -1 });
            setStatus('¡HAS GANADO! (Azul)');
            return;
        }

        const nextYen = { ...yen, turn: 1, layout: layoutAfterPlayer };
        setYen(nextYen);
        setStatus('El bot está pensando...');
        setLoading(true);

        try {
            // 2. Movimiento del Bot
            const botMove = await chooseMove(nextYen);

            if (!botMove || !botMove.coords) throw new Error("Respuesta inválida del bot");

            // Conversión de coordenadas: x = size - 1 - row
            const botRow = size - 1 - botMove.coords.x;
            const botCol = botMove.coords.y;

            let botRows = layoutAfterPlayer.split('/');
            let targetRow = botRows[botRow];
            let finalRowStr = targetRow.substring(0, botCol) + yen.players[1] + targetRow.substring(botCol + 1);
            botRows[botRow] = finalRowStr;
            const finalLayout = botRows.join('/');

            if (checkWinner(finalLayout, yen.players[1])) {
                setYen({ ...yen, layout: finalLayout, turn: -1 });
                setStatus('El Bot ha ganado (Rojo)');
            } else {
                setYen({ ...yen, layout: finalLayout, turn: 0 });
                setStatus('Tu turno (Azul)');
            }

        } catch (e: any) {
            console.error(e);
            setStatus(`Error: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const renderBoard = () => {
        const rows = yen.layout.split('/');
        return rows.map((rowStr, rowIndex) => (
            <div key={rowIndex} style={{ display: 'flex', justifyContent: 'center' }}>
                {rowStr.split('').map((cell, colIndex) => (
                    <div
                        key={colIndex}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        style={{
                            width: '35px',
                            height: '35px',
                            borderRadius: '50%',
                            backgroundColor: cell === 'B' ? '#3b82f6' : cell === 'R' ? '#ef4444' : '#e5e7eb',
                            margin: '3px',
                            cursor: yen.turn === 0 ? 'pointer' : 'default',
                            border: '2px solid #374151',
                            transition: 'all 0.2s'
                        }}
                    />
                ))}
            </div>
        ));
    };

    return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
            <h3>Juego de Y (Tamaño {size})</h3>
            <div style={{
                margin: '15px',
                fontWeight: 'bold',
                color: status.includes('GANADO') ? '#059669' : '#374151'
            }}>
                {status}
            </div>
            <div className="board" style={{ backgroundColor: '#f3f4f6', padding: '20px', borderRadius: '10px' }}>
                {renderBoard()}
            </div>
            {yen.turn === -1 && (
                <button
                    onClick={() => window.location.reload()}
                    style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}
                >
                    Reiniciar Juego
                </button>
            )}
        </div>
    );
};

export default Game;