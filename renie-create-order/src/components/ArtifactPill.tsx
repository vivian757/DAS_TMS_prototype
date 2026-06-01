import { Box, Typography, useTheme } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

type Props = {
  icon: SvgIconComponent;
  label: string;
  isActive: boolean;
  onClick?: () => void;
};

/**
 * 並排檢視模式下,inline 對話流裡的 artifact pill。
 *
 * - active(目前在 panel 顯示中)→ 藍色外框、灰 icon、右側「預覽中」灰字、cursor default
 * - inactive → 灰外框、藍色 icon、右側藍色 → 箭頭;hover 時外框轉藍。點擊切換到此 artifact
 */
export default function ArtifactPill({ icon: Icon, label, isActive, onClick }: Props) {
  const theme = useTheme();

  if (isActive) {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.75,
          py: 1.25,
          minWidth: 220,
          borderRadius: 1.5,
          border: `1.5px solid ${theme.palette.dasPrimary.primary}`,
          bgcolor: '#FFFFFF',
          color: theme.palette.dasDark.dark01,
          cursor: 'default',
        }}
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
          <Icon sx={{ fontSize: 20, color: theme.palette.dasDark.dark02 }} />
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: theme.palette.dasDark.dark01,
            }}
          >
            {label}
          </Typography>
        </Box>
        <Typography
          sx={{
            ml: 3,
            fontSize: 13,
            color: theme.palette.dasGrey.grey01,
          }}
        >
          預覽中
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      role="button"
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 1.75,
        py: 1.25,
        minWidth: 220,
        borderRadius: 1.5,
        border: `1px solid ${theme.palette.dasGrey.grey04}`,
        bgcolor: '#FFFFFF',
        color: theme.palette.dasDark.dark01,
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        '&:hover': {
          borderColor: theme.palette.dasPrimary.primary,
        },
      }}
    >
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
        <Icon sx={{ fontSize: 20, color: theme.palette.dasPrimary.primary }} />
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 600,
            color: theme.palette.dasDark.dark01,
          }}
        >
          {label}
        </Typography>
      </Box>
      <ArrowForwardRoundedIcon
        sx={{
          ml: 3,
          fontSize: 18,
          color: theme.palette.dasPrimary.primary,
        }}
      />
    </Box>
  );
}
