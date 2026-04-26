import { type ReactNode } from 'react';
import { Box, Chip, Paper, Switch, Typography, useTheme } from '@mui/material';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';

export type MonitoringModuleKey = 'detection' | 'eventTrigger' | 'alert';
export type MonitoringRulesState = Record<MonitoringModuleKey, boolean>;

export const DEFAULT_MONITORING_RULES: MonitoringRulesState = {
  detection: true,
  eventTrigger: true,
  alert: true,
};

const MODULES: {
  key: MonitoringModuleKey;
  icon: ReactNode;
  title: string;
  detail: string;
}[] = [
  {
    key: 'detection',
    icon: <GpsFixedIcon fontSize="small" />,
    title: '進出偵測',
    detail: '每 1 分鐘偵測 · 連續 5 分鐘判定進場 · 5 分鐘判定離場',
  },
  {
    key: 'eventTrigger',
    icon: <EventNoteOutlinedIcon fontSize="small" />,
    title: '事件觸發',
    detail: '進場寫入「實際抵達時間」 · 離場寫入「實際離場時間」 · 自動切換訂單狀態',
  },
  {
    key: 'alert',
    icon: <NotificationsNoneOutlinedIcon fontSize="small" />,
    title: '異常告警',
    detail: '停留超時 → Email 告警 · 應到未到 → 提前 10 分鐘預警',
  },
];

export default function MonitoringRulesPreview({
  state,
  onChange,
  showHeader = false,
}: {
  state: MonitoringRulesState;
  onChange: (next: MonitoringRulesState) => void;
  showHeader?: boolean;
}) {
  const theme = useTheme();

  function toggle(k: MonitoringModuleKey) {
    onChange({ ...state, [k]: !state[k] });
  }

  return (
    <Box>
      {showHeader && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.75 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>監控規則</Typography>
          <Chip
            label="未來擴充"
            size="small"
            variant="outlined"
            sx={{
              height: 18,
              fontSize: 10,
              borderColor: theme.palette.dasPrimary.lite04,
              color: theme.palette.dasPrimary.dark01,
            }}
          />
        </Box>
      )}

      <Paper
        sx={{
          boxShadow: 'none',
          border: `1px solid ${theme.palette.dasGrey.grey04}`,
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        {MODULES.map((m, i) => {
          const on = state[m.key];
          return (
            <Box
              key={m.key}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.25,
                px: 1.5,
                py: 1.5,
                borderTop:
                  i === 0 ? undefined : `1px solid ${theme.palette.dasGrey.grey04}`,
                bgcolor: on ? '#fff' : theme.palette.dasGrey.grey06,
                transition: 'background-color 120ms',
              }}
            >
              <Box
                sx={{
                  mt: 0.25,
                  color: on
                    ? theme.palette.dasPrimary.dark01
                    : theme.palette.dasGrey.grey02,
                }}
              >
                {m.icon}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    mb: 0.25,
                    color: on
                      ? theme.palette.dasDark.dark01
                      : theme.palette.dasGrey.grey01,
                  }}
                >
                  {m.title}
                </Typography>
                <Typography
                  variant="footnote"
                  sx={{
                    color: theme.palette.dasGrey.grey01,
                    lineHeight: 1.5,
                    opacity: on ? 1 : 0.6,
                  }}
                >
                  {m.detail}
                </Typography>
              </Box>
              <Switch
                size="small"
                checked={on}
                onChange={() => toggle(m.key)}
                sx={{ alignSelf: 'center' }}
              />
            </Box>
          );
        })}
      </Paper>

      <Typography
        variant="footnote"
        sx={{ display: 'block', color: theme.palette.dasGrey.grey01, mt: 0.75 }}
      >
        各項規則的細節設定（偵測頻率、停留門檻、通知對象等）即將推出
      </Typography>
    </Box>
  );
}
