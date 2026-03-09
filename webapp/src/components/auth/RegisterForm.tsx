import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

interface RegisterFormProps {
  onRegisterSuccess?: (username: string, userId: number) => void;
  onGoToLogin?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onRegisterSuccess, onGoToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSuccessMessage(null);
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

      const res = await fetch(`${API_URL}/createuser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Server error');
        return;
      }

      setSuccessMessage(data.message);

      const loginRes = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const loginData = await loginRes.json();
      if (loginRes.ok) {
        setTimeout(() => {
          onRegisterSuccess?.(username, loginData.userId);
        }, 500);
      } else {
        setTimeout(() => onGoToLogin?.(), 1000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Network error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box display="flex" justifyContent="center" mt={4}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Typography variant="h5" fontWeight={700} mb={3} textAlign="center">
          Create account
        </Typography>

        <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            fullWidth
            inputProps={{ id: 'username' }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            fullWidth
          />

          {error && <Alert severity="error">{error}</Alert>}
          {successMessage && <Alert severity="success" className="success-message">{successMessage}</Alert>}

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            fullWidth
            className="submit-button"
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Let's go!"}
          </Button>
        </Box>

        <Typography variant="body2" textAlign="center" mt={2}>
          Already have an account?{' '}
          <Button
            variant="text"
            size="small"
            onClick={onGoToLogin}
            sx={{ p: 0, minWidth: 0, textTransform: 'none' }}
          >
            Log in here
          </Button>
        </Typography>
      </Paper>
    </Box>
  );
};

export default RegisterForm;