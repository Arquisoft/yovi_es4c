import React, { useState, useEffect } from 'react';
import { type YEN, chooseMove, makeHumanMove } from '../../api/gameyClient';

interface GameProps {
    size?: number;
    onGameReset?: () => void;
    userId?: number | null;
    username?: string;
}

//  Define las dificultades disponibles y sus IDs correspondientes en el backend Rust
const BOT_DIFFICULTIES = [
    { id: 'random_bot', label: 'Fácil (Aleatorio)' },
    { id: 'greedy_bot', label: 'Medio (Greedy)' }, 
    { id: 'minimax_bot', label: 'Difícil (Minimax)' } 
];

const Game: React.FC<GameProps> = ({ size = 5, onGameReset, userId = null, username = 'Azul' }) => {
    // boardSize controla el tamaño del tablero que el usuario puede modificar
    const [boardSize, setBoardSize] = useState<number>(size);

    const [yen, setYen] = useState<YEN>({
        size: boardSize,
        turn: 0,
        players: ['B', 'R'],
        layout: '',
    });
    const [status, setStatus] = useState<string>('Tu turno (Azul)');
    const [loading, setLoading] = useState<boolean>(false);

    // NUEVO ESTADO: Almacena el bot seleccionado
    const [selectedBot, setSelectedBot] = useState<string>(BOT_DIFFICULTIES[0].id);

    const initializeLayout = (s: number): string => {
        const rows: string[] = [];
        for (let i = 1; i <= s; i++) {
            rows.push('.'.repeat(i));
        }
        return rows.join('/');
    };

    const createInitialGame = (s: number): YEN => ({
        size: s,
        turn: 0,
        players: ['B', 'R'],
        layout: initializeLayout(s),
    });

    // whenever boardSize cambia reiniciamos el juego
    useEffect(() => {
        setYen(createInitialGame(boardSize));
        setStatus('Tu turno (Azul)');
    }, [boardSize]);

    const saveGame = async (layoutStr: string, botWon: boolean) => {
        const players = [
            // Human player — link to authenticated user if logged in
            { userId: userId, name: username, isWinner: !botWon },
            // Bot player — always anonymous
            { userId: null, name: 'Bot (Rojo)', isWinner: botWon },
        ];
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/games`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ yen: layoutStr, players }),
            });
        } catch (e) {
            console.error('Failed to save game', e);
        }
    };

    const toCubeCoords = (row: number, col: number, boardSize: number) => {
        const x = boardSize - 1 - row;
        const y = col;
        const z = boardSize - 1 - x - y;
        return { x, y, z };
    };

    const handleCellClick = async (row: number, col: number) => {
        if (yen.turn !== 0 || loading) return;
        const rows = yen.layout.split('/');
        if (rows[row][col] !== '.') return;

        setLoading(true);
        setStatus('Procesando movimiento...');

        try {
            const coords = toCubeCoords(row, col, boardSize);
            const humanResult = await makeHumanMove(yen, coords, 0);
            setYen(humanResult.yen);

            if (humanResult.status === 'Finished') {
                setStatus('¡HAS GANADO! (Azul)');
                await saveGame(humanResult.yen.layout, false);
                setLoading(false);
                return;
            }

            setStatus('El bot esta pensando...');
            // MODIFICACIÓN: Pasamos el selectedBot a la función chooseMove
            const botChoice = await chooseMove(humanResult.yen, selectedBot);

            //const botChoice = await chooseMove(humanResult.yen);
            const botResult = await makeHumanMove(humanResult.yen, botChoice.coords, 1);
            setYen(botResult.yen);

            if (botResult.status === 'Finished') {
                setStatus('El Bot ha ganado (Rojo)');
                await saveGame(botResult.yen.layout, true);
            } else {
                setStatus('Tu turno (Azul)');
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Unknown error';
            console.error(e);
            setStatus(`Error: ${message}`);
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
                            transition: 'all 0.2s',
                        }}
                    />
                ))}
            </div>
        ));
    };

    const resetGame = () => {
        setYen(createInitialGame(boardSize));
        setStatus('Tu turno (Azul)');
        setLoading(false);
        onGameReset?.();
    };

    return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
            <h3>Juego de Y (Tamaño {boardSize})</h3>

            {/* Selector de tamaño del tablero */}
            <div style={{ marginBottom: '20px' }}>
                <label htmlFor="size-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>
                    Tamaño del tablero:
                </label>
                <select
                    id="size-select"
                    value={boardSize}
                    onChange={(e) => {
                        const newSize = Number(e.target.value);
                        setBoardSize(newSize);
                        // reiniciar automáticamente
                    }}
                    disabled={loading}
                    style={{ padding: '5px', borderRadius: '4px' }}
                >
                    {/* valores entre 5 y 10 inclusive */}
                    {[5, 6, 7, 8, 9, 10].map(n => (
                        <option key={n} value={n}>
                            {n}
                        </option>
                    ))}
                </select>
            </div>

            {/* 4. NUEVO: Selector de dificultad */}
            <div style={{ marginBottom: '20px' }}>
                <label htmlFor="bot-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>
                    Dificultad del Bot:
                </label>
                <select 
                    id="bot-select" 
                    value={selectedBot} 
                    onChange={(e) => setSelectedBot(e.target.value)}
                    disabled={loading || yen.layout !== initializeLayout(boardSize)} 
                    style={{ padding: '5px', borderRadius: '4px' }}
                >
                    {BOT_DIFFICULTIES.map(bot => (
                        <option key={bot.id} value={bot.id}>
                            {bot.label}
                        </option>
                    ))}
                </select>
            </div>

            <div style={{
                margin: '15px',
                fontWeight: 'bold',
                color: status.includes('GANADO') ? '#059669' : '#374151',
            }}>
                {status}
            </div>
            <div className="board" style={{ backgroundColor: '#f3f4f6', padding: '20px', borderRadius: '10px' }}>
                {renderBoard()}
            </div>
            {(status.includes('GANADO') || status.includes('ganado')) && (
                <button
                    onClick={resetGame}
                    style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}
                >
                    Reiniciar Juego
                </button>
            )}
        </div>
    );
};

export default Game;