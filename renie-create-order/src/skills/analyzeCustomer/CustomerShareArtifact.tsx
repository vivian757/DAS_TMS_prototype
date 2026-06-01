import { Box, Link, Tooltip, Typography, useTheme } from '@mui/material';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PieChartOutlineIcon from '@mui/icons-material/PieChartOutline';
import type { ArtifactRendererProps } from '../types';
import LoadingOverlay from '../../components/LoadingOverlay';
import ArtifactPill from '../../components/ArtifactPill';

export type CustomerShareData = {
  totalOrders: number;
  items: Array<{ customer: string; count: number; share: number }>;
};

export default function CustomerShareArtifact({
  artifactId,
  store,
  displayMode = 'inline',
  isPinned = false,
  isActive = false,
  isLoading = false,
  onTogglePin,
  onExitSideMode,
}: ArtifactRendererProps) {
  const theme = useTheme();
  const data = store.get<CustomerShareData>(artifactId);
  if (!data) return null;
  const isPanel = displayMode === 'panel';

  // Inline + 並排模式 → pill
  if (displayMode === 'inline' && isPinned) {
    return (
      <ArtifactPill
        icon={PieChartOutlineIcon}
        label="上月客戶訂單佔比"
        isActive={isActive}
        onClick={onTogglePin}
      />
    );
  }

  const maxShare = Math.max(...data.items.map((i) => i.share));

  return (
    <Box
      sx={{
        bgcolor: '#FFFFFF',
        border: `1px solid ${theme.palette.dasGrey.grey04}`,
        borderRadius: 2.5,
        boxShadow: '0px 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        display: isPanel ? 'flex' : 'block',
        flexDirection: isPanel ? 'column' : undefined,
        flex: isPanel ? 1 : undefined,
        position: 'relative',
      }}
    >
      <LoadingOverlay show={isLoading} />
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          borderBottom: `1px solid ${theme.palette.dasGrey.grey04}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
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

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {!isPanel && onTogglePin && (
            <Link
              component="button"
              onClick={onTogglePin}
              underline="hover"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: theme.palette.dasPrimary.primary,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <ArrowOutwardRoundedIcon sx={{ fontSize: 16 }} />
              並排檢視
            </Link>
          )}
          {isPanel && (onExitSideMode || onTogglePin) && (
            <Tooltip title="退出並排檢視" arrow>
              <Box
                role="button"
                onClick={onExitSideMode ?? onTogglePin}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: theme.palette.dasPrimary.primary,
                  '&:hover': {
                    bgcolor: theme.palette.dasPrimary.lite04,
                  },
                }}
              >
                <CloseRoundedIcon sx={{ fontSize: 20 }} />
              </Box>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          p: 2.5,
          flex: isPanel ? 1 : undefined,
          overflow: isPanel ? 'auto' : undefined,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {data.items.map((it) => (
            <Box
              key={it.customer}
              sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography
                  variant="body1"
                  sx={{
                    color: theme.palette.dasDark.dark01,
                    fontWeight: 500,
                  }}
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
    </Box>
  );
}
