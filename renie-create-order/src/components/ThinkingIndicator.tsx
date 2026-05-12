import { Box, CircularProgress, Typography, useTheme } from '@mui/material';

type Props = {
  /** 子狀態文字,例如「解讀指令內容」「解析訂單資料」 */
  status?: string;
};

export default function ThinkingIndicator({
  status = '解讀指令內容',
}: Props) {
  const theme = useTheme();
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="body1"
        sx={{ color: theme.palette.dasDark.dark02, mb: 0.75 }}
      >
        Renie 正在思考...
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress
          size={14}
          thickness={4.5}
          sx={{ color: theme.palette.dasPrimary.primary }}
        />
        <Typography
          variant="body2"
          sx={{ color: theme.palette.dasGrey.grey01 }}
        >
          {status}
        </Typography>
      </Box>
    </Box>
  );
}
