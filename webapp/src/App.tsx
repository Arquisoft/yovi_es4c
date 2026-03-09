import './App.css'
import { useState } from 'react';
import RegisterForm from './components/auth/RegisterForm';
import LoginForm from './components/auth/LoginForm';
import Game from './components/game/Game';
import GameHistory from './components/game/GameHistory';
import Logout from './components/auth/Logout';
import { Box, Container, Typography } from '@mui/material';
import reactLogo from './assets/react.svg';

type AuthView = 'login' | 'register';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [userId, setUserId] = useState<number | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const handleLoginSuccess = (loggedUsername: string, loggedUserId: number) => {
    setUsername(loggedUsername);
    setUserId(loggedUserId);
    setIsAuthenticated(true);
  };

  const handleRegisterSuccess = (newUsername: string, newUserId: number) => {
    setUsername(newUsername);
    setUserId(newUserId);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setUserId(null);
    setAuthView('login');
  };

  const refreshHistory = () => {
    setHistoryRefresh(prev => prev + 1);
  };

  return (
    <div className="App">
      <Box display="flex" justifyContent="center" gap={2} mb={1}>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </Box>

      <Typography variant="h5" fontWeight={600} mb={3}>
        Welcome to the Software Architecture 2025-2026 course
      </Typography>

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
        <Container maxWidth="md">
          <Logout username={username} onLogout={handleLogout} />
          <Game onGameReset={refreshHistory}
            userId={userId}
            username={username}
          
          />
          <Box my={3}><hr /></Box>
          <GameHistory
            refreshTrigger={historyRefresh}
            userId={userId}
            username={username}
          />
        </Container>
      )}
    </div>
  );
}

export default App;
