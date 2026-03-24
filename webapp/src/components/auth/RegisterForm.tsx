import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import HexagonIcon from '@mui/icons-material/Hexagon';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

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
    if (!username.trim()) { setError('Introduce un nombre de usuario.'); return; }
    if (!password.trim()) { setError('Introduce una contraseña.'); return; }

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
      const res = await fetch(`${API_URL}/createuser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error del servidor'); return; }

      setSuccessMessage(data.message);
      const loginRes = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const loginData = await loginRes.json();
      if (loginRes.ok) {
        setTimeout(() => onRegisterSuccess?.(username, loginData.userId), 500);
      } else {
        setTimeout(() => onGoToLogin?.(), 1000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de red');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        background: `radial-gradient(ellipse 70% 50% at 50% 0%, #ff3d7106 0%, transparent 70%), #060b18`,
      }}
    >
      <Container maxWidth="xs">
        <Box
          sx={{
            position: 'relative',
            backgroundColor: '#0d1526',
            border: '1px solid #ff3d711a',
            borderRadius: 2,
            p: { xs: 3, sm: 5 },
            boxShadow: '0 0 60px #ff3d7108, inset 0 1px 0 #ff3d7115',
            animation: 'slideUp 0.5s ease',
            '@keyframes slideUp': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
          }}
        >
          <Box sx={{ position: 'absolute', top: -1, left: -1, width: 40, height: 40, borderTop: '2px solid #ff3d71', borderLeft: '2px solid #ff3d71', borderTopLeftRadius: 8 }} />
          <Box sx={{ position: 'absolute', bottom: -1, right: -1, width: 40, height: 40, borderBottom: '2px solid #ff3d7144', borderRight: '2px solid #ff3d7144', borderBottomRightRadius: 8 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 4 }}>
            <HexagonIcon sx={{ color: '#ff3d71', fontSize: 28, filter: 'drop-shadow(0 0 6px #ff3d71)' }} />
            <Typography variant="h5" sx={{ fontFamily: '"Orbitron"', fontWeight: 700, letterSpacing: '0.1em', color: '#e8f4fd' }}>
              REGISTRO
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} display="flex" flexDirection="column" gap={2.5}>
            <TextField
              id="username"
              label="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon sx={{ color: '#7a9bb5', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: '#7a9bb5', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />

            {error && (
              <Alert severity="error" sx={{ backgroundColor: '#ff3d710d', border: '1px solid #ff3d7133', color: '#ff8fa3' }}>
                {error}
              </Alert>
            )}
            {successMessage && (
              <Alert severity="success" sx={{ backgroundColor: '#00e6760d', border: '1px solid #00e67633', color: '#69f0ae' }}>
                {successMessage}
              </Alert>
            )}

            <Button
              type="submit"
              variant="contained"
              color="secondary"
              size="large"
              disabled={loading}
              fullWidth
              sx={{ mt: 1, py: 1.5 }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : '¡Crear cuenta!'}
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 3, pt: 3, borderTop: '1px solid #ff3d710f' }}>
            <Typography variant="body2" sx={{ color: '#7a9bb5' }}>
              ¿Ya tienes cuenta?{' '}
              <Button
                variant="text"
                size="small"
                onClick={onGoToLogin}
                sx={{ color: '#ff3d71', p: 0, minWidth: 0, textTransform: 'none', fontSize: 'inherit', fontFamily: '"Rajdhani"', '&:hover': { color: '#ff7a9e' } }}
              >
                Inicia sesión
              </Button>
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default RegisterForm;
