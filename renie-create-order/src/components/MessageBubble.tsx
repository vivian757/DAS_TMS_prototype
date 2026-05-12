import { Box, Typography, useTheme } from '@mui/material';
import PaperPlaneLogo from './PaperPlaneLogo';

type Props = {
  role: 'user' | 'renie';
  children: React.ReactNode;
  fullWidth?: boolean;
};

export default function MessageBubble({ role, children, fullWidth }: Props) {
  const theme = useTheme();
  const isUser = role === 'user';

  if (isUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Box
          sx={{
            maxWidth: '70%',
            bgcolor: theme.palette.dasPrimary.lite03,
            color: theme.palette.dasDark.dark01,
            px: 2,
            py: 1.25,
            borderRadius: '16px 16px 4px 16px',
            border: `1px solid ${theme.palette.dasPrimary.lite02}`,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: 14,
            lineHeight: '22px',
          }}
        >
          {children}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          bgcolor: '#FFFFFF',
          border: `1px solid ${theme.palette.dasGrey.grey04}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <PaperPlaneLogo size={18} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, maxWidth: fullWidth ? '100%' : '85%' }}>
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.dasGrey.grey01,
            display: 'block',
            mb: 0.5,
            fontWeight: 600,
          }}
        >
          Renie
        </Typography>
        {typeof children === 'string' ? (
          <Box
            sx={{
              fontSize: 14,
              lineHeight: '22px',
              color: theme.palette.dasDark.dark01,
              whiteSpace: 'pre-wrap',
            }}
          >
            {children}
          </Box>
        ) : (
          children
        )}
      </Box>
    </Box>
  );
}
