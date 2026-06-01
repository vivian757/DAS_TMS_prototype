import { Box, Tooltip, Typography, useTheme } from '@mui/material';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

type Props = {
  label: string;
  /** AI 目前選的值(會作為 active chip 標示) */
  currentValue: string;
  candidates: string[];
  onPick: (chosen: string) => void;
  /** 都不是,改為使用者自行輸入 — 解除歧義狀態,變回一般 input */
  onEscape: () => void;
};

/**
 * 歧義欄位 UI:label + 「需確認」提示 + 候選 chip group + 「都不是」逃生口
 * 點 chip → onPick(chosen);點「都不是,我來輸入」→ onEscape()
 */
export default function AmbiguousField({
  label,
  currentValue,
  candidates,
  onPick,
  onEscape,
}: Props) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        minHeight: 24,
      }}
    >
      <Typography
        variant="body1"
        sx={{
          color: theme.palette.dasGrey.grey01,
          minWidth: 76,
          flexShrink: 0,
          mt: 0.5,
        }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            color: theme.palette.dasOrange.dark01,
            fontSize: 12,
          }}
        >
          <HelpOutlineRoundedIcon sx={{ fontSize: 14 }} />
          AI 在資料庫中找到多筆相近的客戶,請確認
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
          {candidates.map((c) => {
            const active = c === currentValue;
            return (
              <Tooltip key={c} title={active ? 'AI 目前選的值' : ''} arrow>
                <Box
                  role="button"
                  onClick={() => onPick(c)}
                  sx={{
                    px: 1.25,
                    height: 28,
                    borderRadius: '999px',
                    border: `1px solid ${active ? theme.palette.dasPrimary.primary : theme.palette.dasGrey.grey03}`,
                    bgcolor: active ? theme.palette.dasPrimary.lite04 : '#FFFFFF',
                    color: active ? theme.palette.dasPrimary.dark01 : theme.palette.dasDark.dark01,
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      borderColor: theme.palette.dasPrimary.primary,
                      bgcolor: theme.palette.dasPrimary.lite03,
                    },
                  }}
                >
                  {c}
                </Box>
              </Tooltip>
            );
          })}
          <Box
            role="button"
            onClick={onEscape}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.4,
              px: 1,
              height: 28,
              color: theme.palette.dasGrey.grey01,
              fontSize: 12,
              cursor: 'pointer',
              borderRadius: '999px',
              transition: 'all 0.15s ease',
              '&:hover': {
                color: theme.palette.dasPrimary.primary,
                bgcolor: theme.palette.dasPrimary.lite04,
              },
            }}
          >
            <EditOutlinedIcon sx={{ fontSize: 14 }} />
            都不是,我來輸入
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
