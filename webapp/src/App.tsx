import { useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';
import NavBar from './components/layout/NavBar';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import GameView from './components/game/GameView';
import GameHistory from './components/game/GameHistory';
import LandingView from './components/layout/LandingView';
import ProfileView from './components/layout/ProfileView';

export type AppView = 'landing' | 'game' | 'history' | 'profile';
export type AuthView = 'login' | 'register';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [userId, setUserId] = useState<number | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [appView, setAppView] = useState<AppView>('landing');
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const handleLoginSuccess = (loggedUsername: string, loggedUserId: number) => {
    setUsername(loggedUsername);
    setUserId(loggedUserId);
    setIsAuthenticated(true);
    setAppView('game');
  };

  const handleRegisterSuccess = (newUsername: string, newUserId: number) => {
    setUsername(newUsername);
    setUserId(newUserId);
    setIsAuthenticated(true);
    setAppView('game');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsername('');
    setUserId(null);
    setAppView('landing');
    setAuthView('login');
  };

  const refreshHistory = () => {
    setHistoryRefresh(prev => prev + 1);
  };

  const renderContent = () => {
    if (!isAuthenticated) {
      if (appView === 'landing') {
        return (
          <LandingView
            onPlayNow={() => setAppView('game')}
          />
        );
      }
      return authView === 'login' ? (
        <LoginForm
          onLoginSuccess={handleLoginSuccess}
          onGoToRegister={() => setAuthView('register')}
        />
      ) : (
        <RegisterForm
          onRegisterSuccess={handleRegisterSuccess}
          onGoToLogin={() => setAuthView('login')}
        />
      );
    }

    switch (appView) {
      case 'profile':
        return (
          <ProfileView
            userId={userId}
            username={username}
          />
        );
      case 'history':
        return (
          <GameHistory
            refreshTrigger={historyRefresh}
            userId={userId}
            username={username}
          />
        );
      case 'game':
      default:
        return (
          <GameView
            userId={userId}
            username={username}
            onGameReset={refreshHistory}
          />
        );
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NavBar
        isAuthenticated={isAuthenticated}
        username={username}
        currentView={appView}
        onNavigate={(view) => {
          if (!isAuthenticated && view !== 'landing') {
            setAppView(view);
            setAuthView('login');
          } else {
            setAppView(view);
          }
        }}
        onLoginClick={() => { setAppView('game'); setAuthView('login'); }}
        onLogout={handleLogout}
      />
      {renderContent()}
    </ThemeProvider>
  );
}

export default App;
