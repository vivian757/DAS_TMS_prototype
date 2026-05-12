import { Box, Typography, useTheme } from '@mui/material';
import type { ArtifactRendererProps } from '../types';

export type CustomerShareData = {
  totalOrders: number;
  items: Array<{ customer: string; count: number; share: number }>;
};

export default function CustomerShareArtifact({
  artifactId,
  store,
}: ArtifactRendererProps) {
  const theme = useTheme();
  const data = store.get<CustomerShareData>(artifactId);
  if (!data) return null;

  const maxShare = Math.max(...data.items.map((i) => i.share));

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
          上月客戶訂單佔比
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: theme.palette.dasGrey.grey01 }}
        >
          共 {data.totalOrders} 張
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {data.items.map((it) => (
          <Box key={it.customer} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography
                variant="body1"
                sx={{ color: theme.palette.dasDark.dark01, fontWeight: 500 }}
              >
                {it.customer}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: theme.palette.dasDark.dark03 }}
              >
                {it.count} 張 ({it.share.toFixed(1)}%)
              </Typography>
            </Box>
            <Box
              sx={{
                height: 8,
                bgcolor: theme.palette.dasGrey.grey05,
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${(it.share / maxShare) * 100}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${theme.palette.dasPrimary.lite01}, ${theme.palette.dasPrimary.primary})`,
                }}
              />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
