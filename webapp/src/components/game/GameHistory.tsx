import { useEffect, useState } from 'react';
import './GameHistory.css';

interface Player {
  id: number;
  player_name: string;
  is_winner: boolean;
  user_id: number | null;
}

interface GameRecord {
  id: number;
  yen: string;
  created_at: string;
  players: Player[];
}

// se añade el trigger que será disparado desde el componente padre (App) cada vez que se reinicie el juego, 
// para forzar la recarga del historial y mostrar la nueva partida guardada.
interface GameHistoryProps {
  refreshTrigger: number;
}

export default function GameHistory({ refreshTrigger }: GameHistoryProps)  {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGameHistory();
  }, [refreshTrigger]);

  const fetchGameHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
      const response = await fetch(`${API_URL}/api/games`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Games fetched:', data);
      setGames(data || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error fetching games:', errorMsg);
      setError(errorMsg);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  const seedDatabase = async () => {
    try {
      console.log('Seeding database...');
      const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000"
      const response = await fetch(`${API_URL}/api/games/seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Database seeded:', data);
      alert(`✅ ${data.message}`);
      await fetchGameHistory();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('Error seeding database:', errorMsg);
      alert(`❌ Error: ${errorMsg}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return <div className="game-history"><p>Cargando historial de partidas...</p></div>;
  }

  if (error) {
    return (
      <div className="game-history">
        <p className="error">❌ Error: {error}</p>
        <p className="error-hint">Asegúrate de que el servicio de usuarios esté corriendo en http://localhost:3000</p>
        <div className="button-group">
          <button onClick={fetchGameHistory} className="refresh-btn">Reintentar</button>
          <button onClick={seedDatabase} className="seed-btn">Cargar datos de prueba</button>
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="game-history">
        <p>📭 No hay partidas registradas aún.</p>
        <div className="button-group">
          <button onClick={fetchGameHistory} className="refresh-btn">Actualizar</button>
          <button onClick={seedDatabase} className="seed-btn">Cargar datos de prueba</button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-history">
      <h3>📊 Historial de Partidas ({games.length})</h3>
      <div className="games-container">
        {games.map((game) => (
          <div key={game.id} className="game-card">
            <div className="game-header">
              <h4>Partida #{game.id}</h4>
              <span className="game-date">{formatDate(game.created_at)}</span>
            </div>
            <div className="game-details">
              <div className="yen-notation">
                <strong>Notación YEN:</strong>
                <pre>{game.yen}</pre>
              </div>
              <div className="players">
                <strong>Jugadores ({game.players.length}):</strong>
                {game.players.length > 0 ? (
                  <ul>
                    {game.players.map((player) => (
                      <li key={player.id} className={player.is_winner ? 'winner' : ''}>
                        <span className="player-name">{player.player_name}</span>
                        {player.is_winner && <span className="winner-badge">🏆 Ganador</span>}
                        {player.user_id && <span className="user-id">(Usuario ID: {player.user_id})</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-players">Sin jugadores registrados</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={fetchGameHistory} className="refresh-btn">Actualizar</button>
    </div>
  );
}
