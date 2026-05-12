import { useState } from 'react';
import { Box, InputBase, Typography, useTheme } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';

type Props = {
  label: string;
  value: string;
  disabled?: boolean;
  /** 欄位被視為「待補」— 顯示紅框 + 紅標籤 + 永遠顯示 input */
  missing?: boolean;
  labelWidth?: number;
  placeholder?: string;
  onChange?: (value: string) => void;
};

export default function InlineField({
  label,
  value,
  disabled,
  missing,
  labelWidth = 76,
  placeholder = '請填寫',
  onChange,
}: Props) {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [hovering, setHovering] = useState(false);

  const showInput = (editing || missing) && !disabled;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        minHeight: 24,
      }}
    >
      <Typography
        variant="body1"
        sx={{
          color: theme.palette.dasGrey.grey01,
          minWidth: labelWidth,
          flexShrink: 0,
        }}
      >
        {label}
      </Typography>
      {showInput ? (
        <Box
          sx={{
            flex: 1,
            border: `1px solid ${
              missing
                ? theme.palette.dasRed.dark01
                : theme.palette.dasPrimary.primary
            }`,
            borderRadius: 1,
            px: 1,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            bgcolor: missing ? theme.palette.dasRed.lite01 : '#FFFFFF',
          }}
        >
          <InputBase
            autoFocus={editing}
            fullWidth
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange?.(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                setEditing(false);
              }
            }}
            sx={{ fontSize: 14, color: theme.palette.dasDark.dark01 }}
          />
        </Box>
      ) : (
        <Box
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onClick={() => !disabled && setEditing(true)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            cursor: disabled ? 'default' : 'pointer',
            color: disabled
              ? theme.palette.dasGrey.grey01
              : theme.palette.dasDark.dark01,
            fontSize: 14,
            lineHeight: '20px',
          }}
        >
          <span>{value}</span>
          {!disabled && hovering && (
            <EditOutlinedIcon
              sx={{ fontSize: 14, color: theme.palette.dasGrey.grey02 }}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
