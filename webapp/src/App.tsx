import './App.css'
import { useState } from 'react';
import RegisterForm from './components/auth/RegisterForm';
import LoginForm from './components/auth/LoginForm';
import Game from './components/game/Game';
import GameHistory from './components/game/GameHistory';
import Logout from './components/auth/Logout';
import reactLogo from './assets/react.svg'

type AuthView = 'login' | 'register';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [authView, setAuthView] = useState<AuthView>('login');
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const handleLoginSuccess = (loggedUsername: string) => {
    setUsername(loggedUsername);
    setIsAuthenticated(true);
  };

  const handleRegisterSuccess = (newUsername: string) => {
    setUsername(newUsername);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setAuthView('login');
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

      <h2>Welcome to the Software Architecture 2025-2026 course</h2>

      {!isAuthenticated ? (
        authView === 'login' ? (
          <LoginForm
            onLoginSuccess={handleLoginSuccess}
            onGoToRegister={() => setAuthView('register')}
          />
        ) : (
          <RegisterForm
            onRegisterSuccess={handleRegisterSuccess}
            onGoToLogin={() => setAuthView('login')}
          />
        )
      ) : (
        <div>
          <Logout username={username} onLogout={handleLogout} />
          <Game onGameReset={refreshHistory} />
          <hr style={{ margin: '20px 0' }} />
          <GameHistory refreshTrigger={historyRefresh} />
        </div>
      )}
    </div>
  );
}

export default App;
