import { Box, useTheme } from '@mui/material';

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
            bgcolor: theme.palette.dasGrey.grey05,
            color: theme.palette.dasDark.dark01,
            px: 2,
            py: 1.25,
            borderRadius: '16px 16px 4px 16px',
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
    <Box sx={{ mb: 2, maxWidth: fullWidth ? '100%' : '85%' }}>
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
  );
}
