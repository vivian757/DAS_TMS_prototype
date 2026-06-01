import { useRef, useState } from 'react';
import {
  Box,
  Popover,
  Typography,
  useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import type { SvgIconComponent } from '@mui/icons-material';
import ManageSearchOutlinedIcon from '@mui/icons-material/ManageSearchOutlined';
import InsertChartOutlinedRoundedIcon from '@mui/icons-material/InsertChartOutlinedRounded';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import PaperPlaneLogo from './PaperPlaneLogo';
import InputBar from './InputBar';
import { CREATE_ORDER_DEMO_SHORTCUTS } from '../skills/createOrder';
import { SAMPLE_INPUT_FULL } from '../skills/createOrder/data';

type CategoryCommand = {
  text: string;
  /** 有 skillId + autoSend=true → 直接執行;否則塞進 input draft 由 OP 編輯 */
  skillId?: string;
  payload?: string;
  autoSend?: boolean;
};

type Category = {
  id: string;
  label: string;
  Icon: SvgIconComponent;
  commands: CategoryCommand[];
};

const CATEGORIES: Category[] = [
  {
    id: 'query',
    label: '資料檢索',
    Icon: ManageSearchOutlinedIcon,
    commands: [
      { text: '找出今日尚未派車的訂單' },
      { text: '找出本週未完成的訂單' },
      { text: '找出今日延遲或可能延遲的訂單' },
    ],
  },
  {
    id: 'stats',
    label: '統計與分析',
    Icon: InsertChartOutlinedRoundedIcon,
    commands: [
      {
        text: '總結今天的訂單執行狀況',
        skillId: 'query-today-summary',
        payload: '總結今天的訂單執行狀況',
        autoSend: true,
      },
      {
        text: '統計這週內各司機被指派的訂單量',
        skillId: 'analyze-driver-load',
        payload: '統計這週內各司機被指派的訂單量',
        autoSend: true,
      },
      {
        text: '分析上個月的訂單中,各家客戶的佔比',
        skillId: 'analyze-customer-share',
        payload: '分析上個月的訂單中,各家客戶的佔比',
        autoSend: true,
      },
    ],
  },
  {
    id: 'create',
    label: '快速新增',
    Icon: PostAddOutlinedIcon,
    commands: [
      {
        text: '幫我新增今天的訂單',
        skillId: 'create-order',
        payload: SAMPLE_INPUT_FULL,
        autoSend: true,
      },
      { text: '幫我新增派車單' },
      { text: '幫我新增客戶' },
    ],
  },
];

type Props = {
  userName: string;
  /** 輸入框狀態 — 直接交給內嵌的 InputBar */
  draft: string;
  onChangeDraft: (text: string) => void;
  onSend: (text: string) => void;
  onPickSuggestion: (
    skillId: string,
    promptText: string,
    autoSend: boolean,
  ) => void;
  /** Demo chip 專用入口 — auto-send + 可選 initialViewMode */
  onPickDemo?: (
    skillId: string,
    promptText: string,
    options?: { initialViewMode?: 'cards' | 'table' },
  ) => void;
};

export default function InitialScreen({
  userName,
  draft,
  onChangeDraft,
  onSend,
  onPickSuggestion,
  onPickDemo,
}: Props) {
  const theme = useTheme();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const anchorRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleCardClick = (categoryId: string) => {
    setActiveCategory((current) => (current === categoryId ? null : categoryId));
  };

  const handleCommand = (cmd: CategoryCommand) => {
    setActiveCategory(null);
    if (cmd.skillId && cmd.autoSend && cmd.payload) {
      onPickSuggestion(cmd.skillId, cmd.payload, true);
      return;
    }
    if (cmd.skillId && cmd.payload) {
      onPickSuggestion(cmd.skillId, cmd.payload, false);
      return;
    }
    // 沒有 skill 連動 → 直接把指令文字塞進 input draft,OP 自己編輯送出
    onChangeDraft(cmd.text);
  };

  const activeCategoryData = CATEGORIES.find((c) => c.id === activeCategory);

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        py: 4,
      }}
    >
      <PaperPlaneLogo size={88} />

      <Box sx={{ textAlign: 'center', mb: 1 }}>
        <Typography variant="h4" sx={{ color: theme.palette.dasDark.dark01 }}>
          嗨👋,{userName}
        </Typography>
        <Typography
          variant="h4"
          sx={{ color: theme.palette.dasDark.dark01, mt: 0.5 }}
        >
          有什麼可以幫助你的嗎?
        </Typography>
      </Box>

      <Box sx={{ width: '100%', maxWidth: 880 }}>
        <InputBar
          draft={draft}
          onChangeDraft={onChangeDraft}
          onSend={onSend}
          onPickCommand={onPickSuggestion}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center' }}>
        {CATEGORIES.map((cat) => {
          const active = activeCategory === cat.id;
          return (
            <Box
              key={cat.id}
              ref={(el: HTMLDivElement | null) => {
                anchorRefs.current[cat.id] = el;
              }}
              role="button"
              onClick={() => handleCardClick(cat.id)}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 2,
                height: 48,
                borderRadius: 2,
                border: `1px solid ${
                  active
                    ? theme.palette.dasPrimary.primary
                    : theme.palette.dasGrey.grey04
                }`,
                bgcolor: '#FFFFFF',
                boxShadow: active
                  ? '0 4px 12px rgba(39,170,225,0.12)'
                  : '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': {
                  borderColor: theme.palette.dasPrimary.primary,
                  bgcolor: theme.palette.dasPrimary.lite04,
                },
              }}
            >
              <cat.Icon
                sx={{
                  fontSize: 22,
                  color: theme.palette.dasPrimary.primary,
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: theme.palette.dasDark.dark01,
                }}
              >
                {cat.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Popover
        open={!!activeCategoryData}
        anchorEl={
          activeCategoryData ? anchorRefs.current[activeCategoryData.id] : null
        }
        onClose={() => setActiveCategory(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 360,
              borderRadius: 2,
              boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
              py: 1,
            },
          },
        }}
      >
        {activeCategoryData?.commands.map((cmd, idx) => (
          <Box
            key={idx}
            role="button"
            onClick={() => handleCommand(cmd)}
            sx={{
              px: 2,
              py: 1.25,
              fontSize: 14,
              color: theme.palette.dasDark.dark01,
              cursor: 'pointer',
              '&:hover': {
                bgcolor: theme.palette.dasPrimary.lite04,
                color: theme.palette.dasPrimary.dark01,
              },
            }}
          >
            {cmd.text}
          </Box>
        ))}
      </Popover>

      <DemoShortcuts
        theme={theme}
        onPickSuggestion={onPickSuggestion}
        onPickDemo={onPickDemo}
      />
    </Box>
  );
}

// ─── Demo 快捷 ─────────────────────────────────────────────────
function DemoShortcuts({
  theme,
  onPickSuggestion,
  onPickDemo,
}: {
  theme: Theme;
  onPickSuggestion: (
    skillId: string,
    promptText: string,
    autoSend: boolean,
  ) => void;
  onPickDemo?: (
    skillId: string,
    promptText: string,
    options?: { initialViewMode?: 'cards' | 'table' },
  ) => void;
}) {
  return (
    <Box
      sx={{
        mt: 2,
        width: 520,
        borderTop: `1px dashed ${theme.palette.dasGrey.grey04}`,
        pt: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          mb: 1,
          color: theme.palette.dasGrey.grey01,
        }}
      >
        <ScienceOutlinedIcon sx={{ fontSize: 14 }} />
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          Demo 快捷(僅供測試)
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {CREATE_ORDER_DEMO_SHORTCUTS.map((s) => (
          <Box
            key={s.id}
            role="button"
            title={s.description}
            onClick={() => {
              if (s.initialViewMode && onPickDemo) {
                onPickDemo('create-order', s.payload, {
                  initialViewMode: s.initialViewMode,
                });
              } else {
                onPickSuggestion('create-order', s.payload, true);
              }
            }}
            sx={{
              px: 1.25,
              height: 28,
              borderRadius: '999px',
              border: `1px dashed ${theme.palette.dasGrey.grey03}`,
              bgcolor: '#FFFFFF',
              color: theme.palette.dasDark.dark03,
              fontSize: 12,
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              '&:hover': {
                borderColor: theme.palette.dasPrimary.primary,
                color: theme.palette.dasPrimary.primary,
                bgcolor: theme.palette.dasPrimary.lite03,
              },
            }}
          >
            {s.label}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
