import { useRef, useState } from 'react';
import {
  Box,
  IconButton,
  InputBase,
  Tooltip,
  Typography,
  useTheme,
  Divider,
} from '@mui/material';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import CleaningServicesOutlinedIcon from '@mui/icons-material/CleaningServicesOutlined';
import SendIcon from '@mui/icons-material/Send';
import CommandPalette from './CommandPalette';

type Props = {
  draft: string;
  onChangeDraft: (text: string) => void;
  onSend: (text: string) => void;
  /** 從指令選單觸發某個 entry */
  onPickCommand?: (
    skillId: string,
    promptText: string,
    autoSend: boolean,
  ) => void;
  /** 清除對話 — 有提供時會在「指令」按鈕旁顯示清除 icon */
  onClear?: () => void;
  placeholder?: string;
}

export default function InputBar({
  draft,
  onChangeDraft,
  onSend,
  onPickCommand,
  onClear,
  placeholder = '請輸入指令...',
}: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteButtonRef = useRef<HTMLDivElement>(null);

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              ref={paletteButtonRef}
              role="button"
              onClick={() => setPaletteOpen(true)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                cursor: 'pointer',
                color: paletteOpen
                  ? theme.palette.dasPrimary.primary
                  : theme.palette.dasDark.dark03,
                bgcolor: paletteOpen
                  ? theme.palette.dasPrimary.lite03
                  : 'transparent',
                '&:hover': { bgcolor: theme.palette.dasGrey.grey05 },
              }}
            >
              <AutoAwesomeOutlinedIcon sx={{ fontSize: 18 }} />
              <Typography variant="body2">指令</Typography>
            </Box>
            {onClear && (
              <Tooltip title="清除對話" placement="top">
                <IconButton
                  size="small"
                  onClick={onClear}
                  sx={{
                    color: theme.palette.dasDark.dark03,
                    '&:hover': { bgcolor: theme.palette.dasGrey.grey05 },
                  }}
                >
                  <CleaningServicesOutlinedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
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

      <CommandPalette
        anchorEl={paletteButtonRef.current}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onPick={(skillId, promptText, autoSend) => {
          onPickCommand?.(skillId, promptText, autoSend);
        }}
      />
    </Box>
  );
}
