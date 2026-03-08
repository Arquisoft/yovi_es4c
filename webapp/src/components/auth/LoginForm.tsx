import React, { useState } from 'react';

interface LoginFormProps {
  onLoginSuccess?: (username: string) => void;
  onGoToRegister?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess, onGoToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Please enter a username.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter a password.');
      return;
    }

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setTimeout(() => {
          onLoginSuccess?.(username);
        }, 300);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="register-form">
      <div className="form-group">
        <label htmlFor="login-username">Username</label>
        <input
          type="text"
          id="login-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="form-input"
          autoComplete="username"
        />
      </div>
      <div className="form-group">
        <label htmlFor="login-password">Password</label>
        <input
          type="password"
          id="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input"
          autoComplete="current-password"
        />
      </div>

      <button type="submit" className="submit-button" disabled={loading}>
        {loading ? 'Logging in...' : 'Log in'}
      </button>

      {error && (
        <div className="error-message" style={{ marginTop: 12, color: 'red' }}>
          {error}
        </div>
      )}

      <p style={{ marginTop: 16, fontSize: '0.9rem' }}>
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onGoToRegister}
          style={{ background: 'none', border: 'none', color: '#646cff', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
        >
          Register here
        </button>
      </p>
    </form>
  );
};

export default LoginForm;
