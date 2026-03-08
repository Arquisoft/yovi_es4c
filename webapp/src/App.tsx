import './App.css'
import { useState } from 'react';
import RegisterForm from './components/auth/RegisterForm';
import Game from './components/game/Game';
import GameHistory from './components/game/GameHistory';
import Logout from './components/auth/Logout';
import reactLogo from './assets/react.svg'

function App() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [username, setUsername] = useState<string>('');

  const [historyRefresh, setHistoryRefresh] = useState(0);

  const handleRegisterSuccess = (newUsername: string) => {
    setUsername(newUsername);
    setIsRegistered(true);
  };

  const handleLogout = () => {
    setIsRegistered(false);
    setUsername('');
  };

  const refreshHistory = () => {
    setHistoryRefresh(prev => prev + 1);
  };

  return (
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      <h2>Welcome to the Software Arquitecture 2025-2026 course</h2>

      {!isRegistered ? (
        <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
      ) : (
        <div>
          <Logout username={username} onLogout={handleLogout} />

          <Game onGameReset={refreshHistory}/>

          <hr style={{ margin: '20px 0' }} />

          <GameHistory refreshTrigger={historyRefresh} />
        </div>
      )}
    </div>
  );
}

export default App;
