import React, { useState, useEffect } from 'react';
import { type YEN, chooseMove, makeHumanMove } from '../../api/gameyClient';

interface GameProps {
    size?: number;
}

const Game: React.FC<GameProps> = ({ size = 5 }) => {
    // Estado inicial
    const [yen, setYen] = useState<YEN>({
        size: size,
        turn: 0,
        players: ['B', 'R'],
        layout: '',
    });
    const [status, setStatus] = useState<string>('Tu turno (Azul)');
    const [loading, setLoading] = useState<boolean>(false);

    // Inicializa el string del tablero (solo visual inicial)
    const initializeLayout = (s: number): string => {
        let rows: string[] = [];
        for (let i = 1; i <= s; i++) {
            rows.push('.'.repeat(i));
        }
        return rows.join('/');
    };


    const saveGame = async (layoutStr: string, botWon: boolean) => {
        const players = [
            { userId: null, name: 'Azul', isWinner: !botWon },
            { userId: null, name: 'Rojo', isWinner: botWon }
        ];
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/games`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ yen: layoutStr, players })
            });
            // Opcional: Recargar la página o avisar al historial
        } catch (e) {
            console.error('Failed to save game', e);
        }
    };

    useEffect(() => {
        setYen({
            size: size,
            turn: 0,
            players: ['B', 'R'],
            layout: initializeLayout(size),
        });
        setStatus('Tu turno (Azul)');
    }, [size]);

    // Conversión de coordenadas: (fila, columna) -> (x, y, z) para Rust
    const toCubeCoords = (row: number, col: number, boardSize: number) => {
        const x = boardSize - 1 - row;
        const y = col;
        const z = boardSize - 1 - x - y;
        return { x, y, z };
    };

    const handleCellClick = async (row: number, col: number) => {
        // Bloqueos básicos
        if (yen.turn !== 0 || loading) return;
        const rows = yen.layout.split('/');
        if (rows[row][col] !== '.') return;

        setLoading(true);
        setStatus("Procesando movimiento...");

        try {
            // 1. Convertir coordenadas para Rust
            const coords = toCubeCoords(row, col, size);

            // 2. ENVIAR MOVIMIENTO HUMANO A RUST (Puerto 4000)
            // Aquí es donde Rust aplica la lógica de conexión y victoria
            const humanResult = await makeHumanMove(yen, coords, 0); // 0 = Azul

            // Actualizamos el tablero con la respuesta oficial del servidor
            setYen(humanResult.yen);

            // Verificamos si Rust dice que el juego terminó
            if (humanResult.status === 'Finished') {
                setStatus('¡HAS GANADO! (Azul)');
                // Guardamos en el historial (Puerto 3000)
                await saveGame(humanResult.yen.layout, false);
                setLoading(false);
                return;
            }

            // 3. TURNO DEL BOT
            setStatus('El bot está pensando...');

            // A. Pedir al bot que elija coordenada
            const botChoice = await chooseMove(humanResult.yen);

            // B. Aplicar el movimiento del bot en el servidor Rust
            const botResult = await makeHumanMove(humanResult.yen, botChoice.coords, 1); // 1 = Rojo

            setYen(botResult.yen);

            if (botResult.status === 'Finished') {
                setStatus('El Bot ha ganado (Rojo)');
                await saveGame(botResult.yen.layout, true);
            } else {
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
                            cursor: (cell === '.' && yen.turn === 0) ? 'pointer' : 'default',
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
            {(status.includes('GANADO') || status.includes('ganado')) && (
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