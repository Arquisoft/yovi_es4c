import { Box, Button, Container, Typography } from '@mui/material';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import HexagonIcon from '@mui/icons-material/Hexagon';

interface LandingViewProps {
  onPlayNow: () => void;
}

export default function LandingView({ onPlayNow }: LandingViewProps) {
  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: `
          radial-gradient(ellipse 80% 60% at 50% 0%, #00e5ff08 0%, transparent 70%),
          radial-gradient(ellipse 60% 40% at 80% 80%, #ff3d7106 0%, transparent 60%),
          #060b18
        `,
      }}
    >
      {/* Animated hex grid background */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.06,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='70'%3E%3Cpolygon points='30,5 55,17.5 55,52.5 30,65 5,52.5 5,17.5' fill='none' stroke='%2300e5ff' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 70px',
        }}
      />

      {/* Floating hex decorations */}
      {[...Array(6)].map((_, i) => (
        <HexagonIcon
          key={i}
          sx={{
            position: 'absolute',
            color: i % 2 === 0 ? '#00e5ff' : '#ff3d71',
            opacity: 0.04 + (i * 0.01),
            fontSize: [80, 120, 60, 100, 90, 70][i],
            top: ['10%', '60%', '30%', '80%', '15%', '70%'][i],
            left: ['5%', '8%', '88%', '85%', '45%', '55%'][i],
            transform: `rotate(${i * 15}deg)`,
            animation: `float${i} ${4 + i}s ease-in-out infinite alternate`,
            '@keyframes float0': { from: { transform: 'rotate(0deg) translateY(0)' }, to: { transform: 'rotate(10deg) translateY(-10px)' } },
            '@keyframes float1': { from: { transform: 'rotate(0deg) translateY(0)' }, to: { transform: 'rotate(-8deg) translateY(-15px)' } },
            '@keyframes float2': { from: { transform: 'rotate(30deg) translateY(0)' }, to: { transform: 'rotate(40deg) translateY(-8px)' } },
            '@keyframes float3': { from: { transform: 'rotate(0deg) translateY(0)' }, to: { transform: 'rotate(12deg) translateY(-12px)' } },
            '@keyframes float4': { from: { transform: 'rotate(0deg) translateY(0)' }, to: { transform: 'rotate(-5deg) translateY(-6px)' } },
            '@keyframes float5': { from: { transform: 'rotate(0deg) translateY(0)' }, to: { transform: 'rotate(8deg) translateY(-10px)' } },
          }}
        />
      ))}

      <Container maxWidth="md" sx={{ position: 'relative', textAlign: 'center', py: 8 }}>
        {/* Badge */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 0.5,
            borderRadius: 10,
            border: '1px solid #00e5ff33',
            backgroundColor: '#00e5ff0a',
            mb: 4,
            animation: 'fadeIn 0.8s ease forwards',
            '@keyframes fadeIn': { from: { opacity: 0, transform: 'translateY(-10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
          }}
        >
          <HexagonIcon sx={{ color: '#00e5ff', fontSize: 14 }} />
          <Typography sx={{ color: '#00e5ff', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: '"Rajdhani"' }}>
            Arquitectura de Software · 2025–2026
          </Typography>
        </Box>

        {/* Title */}
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '2.5rem', sm: '4rem', md: '5rem' },
            fontWeight: 900,
            lineHeight: 1,
            mb: 1,
            background: 'linear-gradient(135deg, #ffffff 0%, #e8f4fd 40%, #00e5ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'slideUp 0.8s ease 0.2s both',
            '@keyframes slideUp': { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
          }}
        >
          Y-GAME
        </Typography>

        <Typography
          variant="h3"
          sx={{
            fontSize: { xs: '1rem', sm: '1.4rem' },
            color: '#7a9bb5',
            mb: 5,
            fontWeight: 400,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            animation: 'slideUp 0.8s ease 0.35s both',
          }}
        >
          El juego de conexión hexagonal
        </Typography>

        {/* Feature pills */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 2,
            mb: 6,
            animation: 'slideUp 0.8s ease 0.5s both',
          }}
        >
          {[
            { label: '3 Niveles de IA', color: '#00e5ff' },
            { label: 'Tableros 5–10', color: '#ff3d71' },
            { label: 'Historial de partidas', color: '#00e676' },
          ].map(({ label, color }) => (
            <Box
              key={label}
              sx={{
                px: 2.5,
                py: 0.8,
                border: `1px solid ${color}44`,
                borderRadius: 1,
                backgroundColor: `${color}0a`,
                color,
                fontSize: '0.8rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                fontFamily: '"Rajdhani"',
              }}
            >
              {label}
            </Box>
          ))}
        </Box>

        {/* CTA */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
            flexWrap: 'wrap',
            animation: 'slideUp 0.8s ease 0.65s both',
          }}
        >
          <Button
            variant="contained"
            size="large"
            startIcon={<SportsEsportsIcon />}
            onClick={onPlayNow}
            sx={{
              px: 5,
              py: 1.5,
              fontSize: '1rem',
              letterSpacing: '0.15em',
            }}
          >
            Jugar ahora
          </Button>
        </Box>

        {/* Abstract board preview */}
        <Box
          sx={{
            mt: 10,
            display: 'flex',
            justifyContent: 'center',
            gap: 0.5,
            opacity: 0.25,
            animation: 'fadeIn 1s ease 0.9s both',
          }}
        >
          {[3, 4, 5, 4, 3].map((count, rowIdx) => (
            <Box key={rowIdx} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: rowIdx % 2 === 0 ? 1.5 : 0 }}>
              {[...Array(count)].map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    backgroundColor: Math.random() > 0.6 ? '#00e5ff' : Math.random() > 0.5 ? '#ff3d71' : '#1a2a3a',
                    border: '1px solid #00e5ff22',
                  }}
                />
              ))}
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
