import { useState } from 'react';
import {
  Box,
  IconButton,
  InputBase,
  Typography,
  useTheme,
  Divider,
} from '@mui/material';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import SendIcon from '@mui/icons-material/Send';

type Props = {
  draft: string;
  onChangeDraft: (text: string) => void;
  onSend: (text: string) => void;
  placeholder?: string;
};

export default function InputBar({
  draft,
  onChangeDraft,
  onSend,
  placeholder = '請輸入指令...',
}: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const handleSend = () => {
    const t = draft.trim();
    if (!t) return;
    onSend(t);
  };

  const hasMultiline = draft.includes('\n') || draft.length > 60;

  return (
    <Box
      sx={{
        px: 5,
        pb: 2.5,
        pt: 1,
        bgcolor: theme.palette.background.default,
      }}
    >
      <Box
        sx={{
          maxWidth: 880,
          mx: 'auto',
          border: `1px solid ${
            focused ? theme.palette.dasPrimary.primary : theme.palette.dasGrey.grey04
          }`,
          borderRadius: 3,
          bgcolor: '#FFFFFF',
          boxShadow: focused ? '0 4px 12px rgba(39,170,225,0.10)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: hasMultiline ? 'flex-start' : 'center',
            px: 2,
            pt: hasMultiline ? 1.25 : 0,
          }}
        >
          <InputBase
            multiline
            minRows={1}
            maxRows={8}
            fullWidth
            value={draft}
            placeholder={placeholder}
            onChange={(e) => onChangeDraft(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            sx={{
              fontSize: 14,
              lineHeight: '20px',
              color: theme.palette.dasDark.dark01,
              py: 1.25,
            }}
          />
        </Box>

        <Divider sx={{ borderColor: theme.palette.dasGrey.grey05 }} />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5,
            py: 0.75,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: 1,
              cursor: 'pointer',
              color: theme.palette.dasDark.dark03,
              '&:hover': { bgcolor: theme.palette.dasGrey.grey05 },
            }}
          >
            <BookmarkBorderIcon sx={{ fontSize: 18 }} />
            <Typography variant="body2">常用指令 (8/10)</Typography>
          </Box>

          <IconButton
            onClick={handleSend}
            disabled={draft.trim() === ''}
            sx={{
              color:
                draft.trim() === ''
                  ? theme.palette.dasGrey.grey02
                  : theme.palette.dasPrimary.primary,
              '&:disabled': { color: theme.palette.dasGrey.grey03 },
            }}
          >
            <SendIcon sx={{ fontSize: 22, transform: 'rotate(-30deg)' }} />
          </IconButton>
        </Box>
      </Box>

      <Typography
        variant="caption"
        sx={{
          display: 'block',
          textAlign: 'center',
          color: theme.palette.dasGrey.grey01,
          mt: 1.25,
        }}
      >
        ⓘ 本服務產出的內容均由 AI 生成,目前提供訂單建立、檢索與分析。
      </Typography>
    </Box>
  );
}
