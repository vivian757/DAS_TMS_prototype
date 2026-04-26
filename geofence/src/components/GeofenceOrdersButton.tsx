import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Link,
  Popover,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Geofence, mockOrdersForGeofence } from '../data/mockGeofences';

export default function GeofenceOrdersButton({
  geofence,
}: {
  geofence: Geofence;
}) {
  const theme = useTheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const orders = useMemo(() => mockOrdersForGeofence(geofence), [geofence]);
  const count = orders.length;

  return (
    <>
      <Tooltip title="監控中訂單">
        <span>
          <Button
            size="small"
            disabled={count === 0}
            onClick={(e) => {
              e.stopPropagation();
              setAnchor(e.currentTarget);
            }}
            startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{
              minWidth: 0,
              px: 1,
              py: 0.25,
              textTransform: 'none',
              color:
                count > 0
                  ? theme.palette.dasDark.dark03
                  : theme.palette.dasGrey.grey02,
              fontSize: 13,
              fontWeight: 500,
              '& .MuiButton-startIcon': { mr: 0.5 },
            }}
          >
            {count}
          </Button>
        </span>
      </Tooltip>
      <Popover
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ p: 2, minWidth: 260, maxWidth: 320 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, display: 'block' }}>
            監控中訂單
          </Typography>
          <Typography
            variant="footnote"
            sx={{ color: theme.palette.dasGrey.grey01, display: 'block', mb: 1 }}
          >
            {count} 張
          </Typography>
          <Stack
            spacing={0.75}
            sx={{
              maxHeight: 280,
              overflow: 'auto',
              borderTop: `1px solid ${theme.palette.dasGrey.grey05}`,
              pt: 1,
            }}
          >
            {orders.map((id) => (
              <Link
                key={id}
                href={`#/orders/${id}`}
                underline="hover"
                onClick={(e) => e.stopPropagation()}
                sx={{
                  fontSize: 13,
                  fontFamily:
                    '"Roboto Mono", "SF Mono", Menlo, Consolas, monospace',
                  color: theme.palette.dasPrimary.primary,
                  py: 0.25,
                }}
              >
                {id}
              </Link>
            ))}
          </Stack>
        </Box>
      </Popover>
    </>
  );
}
