import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00e5ff',
      light: '#6effff',
      dark: '#00b2cc',
      contrastText: '#0a0f1e',
    },
    secondary: {
      main: '#ff3d71',
      light: '#ff7a9e',
      dark: '#c4003f',
      contrastText: '#fff',
    },
    background: {
      default: '#060b18',
      paper: '#0d1526',
    },
    text: {
      primary: '#e8f4fd',
      secondary: '#7a9bb5',
    },
    success: {
      main: '#00e676',
    },
    error: {
      main: '#ff3d71',
    },
    warning: {
      main: '#ffab40',
    },
  },
  typography: {
    fontFamily: '"Rajdhani", "Orbitron", sans-serif',
    h1: { fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.1em', fontWeight: 900 },
    h2: { fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.08em', fontWeight: 700 },
    h3: { fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.06em', fontWeight: 700 },
    h4: { fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.05em', fontWeight: 600 },
    h5: { fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.04em', fontWeight: 600 },
    h6: { fontFamily: '"Rajdhani", sans-serif', letterSpacing: '0.05em', fontWeight: 700 },
    body1: { fontFamily: '"Rajdhani", sans-serif', letterSpacing: '0.02em', fontSize: '1rem' },
    body2: { fontFamily: '"Rajdhani", sans-serif', letterSpacing: '0.02em' },
    button: { fontFamily: '"Rajdhani", sans-serif', letterSpacing: '0.1em', fontWeight: 700 },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body {
          background: #060b18;
          min-height: 100vh;
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0d1526; }
        ::-webkit-scrollbar-thumb { background: #00e5ff33; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #00e5ff66; }
      `,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          fontWeight: 700,
          transition: 'all 0.2s ease',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #00e5ff 0%, #0097a7 100%)',
          color: '#060b18',
          boxShadow: '0 0 20px #00e5ff44',
          '&:hover': {
            background: 'linear-gradient(135deg, #6effff 0%, #00e5ff 100%)',
            boxShadow: '0 0 35px #00e5ff88',
            transform: 'translateY(-1px)',
          },
        },
        outlinedPrimary: {
          borderColor: '#00e5ff55',
          color: '#00e5ff',
          '&:hover': {
            borderColor: '#00e5ff',
            backgroundColor: '#00e5ff11',
            boxShadow: '0 0 15px #00e5ff33',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #ff3d71 0%, #c4003f 100%)',
          boxShadow: '0 0 20px #ff3d7144',
          '&:hover': {
            boxShadow: '0 0 35px #ff3d7188',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#0a0f1e',
            borderRadius: 4,
            '& fieldset': { borderColor: '#00e5ff22' },
            '&:hover fieldset': { borderColor: '#00e5ff55' },
            '&.Mui-focused fieldset': {
              borderColor: '#00e5ff',
              boxShadow: '0 0 10px #00e5ff33',
            },
          },
          '& .MuiInputLabel-root': { color: '#7a9bb5', fontFamily: '"Rajdhani", sans-serif', letterSpacing: '0.05em' },
          '& .MuiInputLabel-root.Mui-focused': { color: '#00e5ff' },
          '& .MuiInputBase-input': { color: '#e8f4fd', fontFamily: '"Rajdhani", sans-serif' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0d1526',
          border: '1px solid #00e5ff11',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0d1526',
          border: '1px solid #00e5ff15',
          transition: 'all 0.2s ease',
          '&:hover': {
            border: '1px solid #00e5ff33',
            boxShadow: '0 4px 20px #00e5ff15',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: 600,
          letterSpacing: '0.05em',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontFamily: '"Rajdhani", sans-serif',
          borderRadius: 4,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          backgroundColor: '#0a0f1e',
          color: '#e8f4fd',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#00e5ff22' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00e5ff55' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00e5ff' },
        },
      },
    },
  },
});
