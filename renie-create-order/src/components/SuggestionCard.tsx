import { Box, Typography, useTheme } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

type Props = {
  text: string;
  Icon?: SvgIconComponent;
  highlight?: boolean;
  onClick?: () => void;
};

export default function SuggestionCard({
  text,
  Icon,
  highlight,
  onClick,
}: Props) {
  const theme = useTheme();
  return (
    <Box
      role="button"
      onClick={onClick}
      sx={{
        width: 520,
        px: 2,
        py: 1.5,
        border: `1px solid ${
          highlight ? theme.palette.dasPrimary.primary : theme.palette.dasGrey.grey04
        }`,
        bgcolor: highlight ? theme.palette.dasPrimary.lite03 : '#FFFFFF',
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        '&:hover': {
          borderColor: theme.palette.dasPrimary.primary,
          bgcolor: theme.palette.dasPrimary.lite03,
        },
      }}
    >
      {Icon && (
        <Icon
          sx={{
            fontSize: 18,
            color: highlight
              ? theme.palette.dasPrimary.primary
              : theme.palette.dasGrey.grey01,
          }}
        />
      )}
      <Typography
        variant="body1"
        sx={{
          color: highlight
            ? theme.palette.dasPrimary.dark01
            : theme.palette.dasDark.dark02,
          fontWeight: highlight ? 600 : 400,
          flex: 1,
        }}
      >
        {text}
      </Typography>
      {highlight && (
        <Box
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: '999px',
            bgcolor: theme.palette.dasPrimary.primary,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          NEW
        </Box>
      )}
    </Box>
  );
}
