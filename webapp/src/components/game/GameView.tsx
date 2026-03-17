import { Box, Container, Typography } from '@mui/material';
import HexagonIcon from '@mui/icons-material/Hexagon';
import Game from './Game';

interface GameViewProps {
  userId: number | null;
  username: string;
  onGameReset?: () => void;
}

export default function GameView({ userId, username, onGameReset }: GameViewProps) {
  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        background: `
          radial-gradient(ellipse 80% 40% at 50% 0%, #00e5ff06 0%, transparent 60%),
          #060b18
        `,
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        {/* Page header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, animation: 'fadeIn 0.5s ease', '@keyframes fadeIn': { from: { opacity: 0 }, to: { opacity: 1 } } }}>
          <HexagonIcon sx={{ color: '#00e5ff', fontSize: 22, filter: 'drop-shadow(0 0 4px #00e5ff88)' }} />
          <Typography variant="h5" sx={{ fontFamily: '"Orbitron"', fontWeight: 700, letterSpacing: '0.08em', color: '#e8f4fd' }}>
            PARTIDA
          </Typography>
          <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, #00e5ff22, transparent)' }} />
        </Box>

        <Game
          onGameReset={onGameReset}
          userId={userId}
          username={username}
        />
      </Container>
    </Box>
  );
}
