import { Box, IconButton, Typography, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LanguageIcon from '@mui/icons-material/Language';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PaperPlaneLogo from './PaperPlaneLogo';
import { SHADOWS } from '../theme';

export default function TopBar() {
  const theme = useTheme();
  return (
    <Box
      sx={{
        height: 64,
        bgcolor: '#FFFFFF',
        borderBottom: `1px solid ${theme.palette.dasGrey.grey04}`,
        boxShadow: SHADOWS.dp02,
        display: 'flex',
        alignItems: 'center',
        px: 2,
        gap: 2,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <IconButton size="small" sx={{ color: theme.palette.dasDark.dark01 }}>
        <MenuIcon />
      </IconButton>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 22,
            color: theme.palette.dasDark.dark01,
            fontStyle: 'italic',
          }}
        >
          3drens
        </Typography>
        <Typography
          sx={{
            fontWeight: 400,
            fontSize: 22,
            color: theme.palette.dasPrimary.primary,
            fontStyle: 'italic',
          }}
        >
          tms
        </Typography>
      </Box>

      <Typography
        variant="body1"
        sx={{ color: theme.palette.dasDark.dark02, ml: 4 }}
      >
        Renie.ai
      </Typography>

      <Box sx={{ flex: 1 }} />

      <Box
        sx={{
          height: 36,
          px: 1.5,
          borderRadius: '999px',
          border: `1px solid ${theme.palette.dasPrimary.primary}`,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          color: theme.palette.dasPrimary.primary,
          cursor: 'pointer',
        }}
      >
        <PaperPlaneLogo size={20} />
        <Typography
          variant="headline"
          sx={{ color: theme.palette.dasPrimary.primary }}
        >
          Renie.ai
        </Typography>
      </Box>

      <IconButton size="small">
        <LanguageIcon sx={{ color: theme.palette.dasDark.dark02 }} />
      </IconButton>
      <IconButton size="small">
        <NotificationsNoneIcon sx={{ color: theme.palette.dasDark.dark02 }} />
      </IconButton>
    </Box>
  );
}
