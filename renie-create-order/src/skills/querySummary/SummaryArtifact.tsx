import { Box, Typography, useTheme } from '@mui/material';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { ArtifactRendererProps } from '../types';

export type SummaryArtifactData = {
  total: number;
  delivered: number;
  inTransit: number;
  pending: number;
  exception: number;
};

export default function SummaryArtifact({
  artifactId,
  store,
}: ArtifactRendererProps) {
  const theme = useTheme();
  const data = store.get<SummaryArtifactData>(artifactId);
  if (!data) return null;

  const stats = [
    {
      label: '已送達',
      value: data.delivered,
      Icon: TaskAltIcon,
      color: theme.palette.dasGreen.dark03,
      bg: theme.palette.dasGreen.lite01,
    },
    {
      label: '配送中',
      value: data.inTransit,
      Icon: LocalShippingOutlinedIcon,
      color: theme.palette.dasPrimary.dark01,
      bg: theme.palette.dasPrimary.lite03,
    },
    {
      label: '待派車',
      value: data.pending,
      Icon: HourglassBottomIcon,
      color: theme.palette.dasDark.dark03,
      bg: theme.palette.dasGrey.grey05,
    },
    {
      label: '異常',
      value: data.exception,
      Icon: WarningAmberIcon,
      color: theme.palette.dasOrange.dark01,
      bg: theme.palette.dasOrange.lite01,
    },
  ];

  return (
    <Box
      sx={{
        bgcolor: '#FFFFFF',
        border: `1px solid ${theme.palette.dasGrey.grey04}`,
        borderRadius: 3,
        p: 2.5,
        boxShadow: '0px 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 1,
          mb: 2,
        }}
      >
        <Typography
          variant="h5Bold"
          sx={{ color: theme.palette.dasDark.dark01 }}
        >
          今日訂單執行狀況
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: theme.palette.dasGrey.grey01 }}
        >
          共 {data.total} 張
        </Typography>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1.5,
        }}
      >
        {stats.map((s) => (
          <Box
            key={s.label}
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: s.bg,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <s.Icon sx={{ fontSize: 16, color: s.color }} />
              <Typography
                variant="caption"
                sx={{ color: s.color, fontWeight: 600 }}
              >
                {s.label}
              </Typography>
            </Box>
            <Typography
              variant="h3"
              sx={{
                color: s.color,
                fontWeight: 600,
                lineHeight: 1.1,
                fontSize: 28,
              }}
            >
              {s.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
