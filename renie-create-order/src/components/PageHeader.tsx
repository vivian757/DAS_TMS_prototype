import { Box, IconButton, Tooltip, Typography, useTheme } from '@mui/material';
import CleaningServicesOutlinedIcon from '@mui/icons-material/CleaningServicesOutlined';

type Props = { onClear?: () => void; canClear?: boolean };

export default function PageHeader({ onClear, canClear }: Props) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        px: 5,
        pt: 4,
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Typography variant="h3" sx={{ color: theme.palette.dasDark.dark01 }}>
        Renie.ai
      </Typography>
      <Tooltip title="清除對話" placement="left">
        <span>
          <IconButton
            size="small"
            onClick={onClear}
            disabled={!canClear}
            sx={{ color: theme.palette.dasDark.dark02 }}
          >
            <CleaningServicesOutlinedIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
