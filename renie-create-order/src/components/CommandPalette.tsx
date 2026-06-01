import { Box, Popover, Typography, useTheme } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import ManageSearchOutlinedIcon from '@mui/icons-material/ManageSearchOutlined';
import InsertChartOutlinedRoundedIcon from '@mui/icons-material/InsertChartOutlinedRounded';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import { SHADOWS } from '../theme';
import { SAVED_PROMPTS } from '../savedPrompts';

const SAVED_PROMPTS_MAX = 10;

type CommandTemplate = {
  id: string;
  label: string;
  Icon: SvgIconComponent;
  skillId?: string;
  payload: string;
  autoSend?: boolean;
};

// 指令範本 — OP 從這裡選一個 starting point,大多會把指令塞進 input draft 讓 OP 補完
const COMMAND_TEMPLATES: CommandTemplate[] = [
  {
    id: 'tpl-query',
    label: '查詢訂單',
    Icon: ManageSearchOutlinedIcon,
    payload: '查詢',
  },
  {
    id: 'tpl-report',
    label: '訂單報表',
    Icon: InsertChartOutlinedRoundedIcon,
    payload: '幫我整理訂單報表',
  },
  {
    id: 'tpl-create-order',
    label: '新增訂單',
    Icon: PostAddOutlinedIcon,
    skillId: 'create-order',
    payload: `新增訂單至少需要以下資訊,你可以直接貼上手邊的資料,或參考下方的格式回覆:

- 訂單編號:(若沒有提供則會自動編碼)
- 業務類型:(送 / 取 / 取送,若沒有提供則預設為「送」)
- 客戶:
- 收件人地址:

此外,你也可補充貨品、費用、寄件人/收件人、日期等資訊。`,
  },
  {
    id: 'tpl-create-dispatch',
    label: '新增派車單',
    Icon: PostAddOutlinedIcon,
    payload: `新增派車單至少需要以下資訊,你可以直接貼上手邊的資料,或參考下方的格式回覆:

- 派車單名稱:

此外,你也可補充派車單執行日期、指派的司機名稱。`,
  },
  {
    id: 'tpl-create-customer',
    label: '新增客戶',
    Icon: PersonAddAltOutlinedIcon,
    payload: `新增客戶至少需要以下資訊,你可以直接貼上手邊的資料,或參考下方的格式回覆:

- 客戶名稱:
- 客戶類型:(個人 / 企業,若沒有提供則預設為「個人」)

此外,你也可補充客戶的聯絡方式、企業負責人、統一編號等資訊。`,
  },
  {
    id: 'tpl-create-driver',
    label: '新增司機',
    Icon: BadgeOutlinedIcon,
    payload: `幫我新增司機
- 姓名:
- 手機:
- 車輛:`,
  },
];

type PickEntry = (
  skillId: string,
  promptText: string,
  autoSend: boolean,
) => void;

type Props = {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  /** 點任何一個 entry(saved prompt 或 template)後的 callback */
  onPick: PickEntry;
};

export default function CommandPalette({
  anchorEl,
  open,
  onClose,
  onPick,
}: Props) {
  const theme = useTheme();

  return (
    <Popover
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            mt: -1,
            width: 380,
            borderRadius: 2,
            boxShadow: SHADOWS.dp08,
            border: `1px solid ${theme.palette.dasGrey.grey04}`,
            maxHeight: 520,
            overflowY: 'auto',
            py: 1.5,
          },
        },
      }}
    >
      {/* ── 常用指令(用戶自訂) ────────────────────── */}
      <SectionHeader
        label={`常用指令 (${SAVED_PROMPTS.length}/${SAVED_PROMPTS_MAX})`}
      />
      {SAVED_PROMPTS.map((sp) => (
        <Box
          key={sp.id}
          role="button"
          onClick={() => {
            onPick('saved-prompt', sp.payload, sp.autoSend ?? false);
            onClose();
          }}
          sx={{
            px: 2,
            py: 1,
            cursor: 'pointer',
            fontSize: 14,
            color: theme.palette.dasDark.dark01,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            '&:hover': {
              bgcolor: theme.palette.dasPrimary.lite04,
              color: theme.palette.dasPrimary.dark01,
            },
          }}
        >
          {sp.payload}
        </Box>
      ))}

      {/* ── 指令範本 ───────────────────────────────── */}
      <SectionHeader label="指令範本" sx={{ mt: 1.5 }} />
      {COMMAND_TEMPLATES.map((tpl) => (
        <Box
          key={tpl.id}
          role="button"
          onClick={() => {
            onPick(tpl.skillId ?? 'template', tpl.payload, tpl.autoSend ?? false);
            onClose();
          }}
          sx={{
            px: 2,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: theme.palette.dasPrimary.lite04,
            },
          }}
        >
          <tpl.Icon
            sx={{
              fontSize: 20,
              color: theme.palette.dasPrimary.primary,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="body2"
            sx={{
              fontSize: 14,
              color: theme.palette.dasDark.dark01,
            }}
          >
            {tpl.label}
          </Typography>
        </Box>
      ))}
    </Popover>
  );
}

function SectionHeader({
  label,
  sx,
}: {
  label: string;
  sx?: Record<string, unknown>;
}) {
  const theme = useTheme();
  return (
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        px: 2,
        pb: 0.5,
        color: theme.palette.dasGrey.grey01,
        fontWeight: 500,
        ...(sx ?? {}),
      }}
    >
      {label}
    </Typography>
  );
}
