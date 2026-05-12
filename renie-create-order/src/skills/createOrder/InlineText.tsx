import { useState } from 'react';
import { Box, InputBase, useTheme, type SxProps, type Theme } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

type Props = {
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  /** 顯示時的 typography sx */
  textSx?: SxProps<Theme>;
  /** 輸入框寬度 */
  inputWidth?: number;
};

/**
 * 不帶 label 的 inline 編輯文字 — 用於訂單號這種獨立顯示但又要可編輯的欄位。
 */
export default function InlineText({
  value,
  onChange,
  disabled,
  textSx,
  inputWidth = 160,
}: Props) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [hovering, setHovering] = useState(false);

  if (editing && !disabled) {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          border: `1px solid ${theme.palette.dasPrimary.primary}`,
          borderRadius: 1,
          px: 1,
          height: 28,
          bgcolor: '#FFFFFF',
          width: inputWidth,
        }}
      >
        <InputBase
          autoFocus
          fullWidth
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') setEditing(false);
          }}
          sx={{ ...textSx, color: theme.palette.dasDark.dark01 }}
        />
      </Box>
    );
  }

  return (
    <Box
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={() => !disabled && setEditing(true)}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        cursor: disabled ? 'default' : 'pointer',
        ...textSx,
      }}
    >
      <span>{value}</span>
      {!disabled && hovering && (
        <EditOutlinedIcon
          sx={{ fontSize: 14, color: theme.palette.dasGrey.grey02 }}
        />
      )}
    </Box>
  );
}
