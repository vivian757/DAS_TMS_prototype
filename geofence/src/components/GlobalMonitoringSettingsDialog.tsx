import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import WatchLaterOutlinedIcon from '@mui/icons-material/WatchLaterOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import AcUnitIcon from '@mui/icons-material/AcUnit';

export type OrderStatusCode = '配送中' | '已送達' | '離站' | '已完成';
const ORDER_STATUS_OPTIONS: OrderStatusCode[] = [
  '配送中',
  '已送達',
  '離站',
  '已完成',
];

export interface AlertRule {
  enabled: boolean;
  thresholdMin: number;
}

export interface MonitoringSettingsState {
  detectFrequencyMin: number;
  entry: {
    stayMinutes: number;
    autoOrderStatus: boolean;
    orderStatus: OrderStatusCode;
  };
  exit: {
    stayMinutes: number;
    autoOrderStatus: boolean;
    orderStatus: OrderStatusCode;
  };
  alerts: {
    late: AlertRule;
    overtime: AlertRule;
    noShow: AlertRule;
    tempLoss: AlertRule;
  };
}

export const DEFAULT_MONITORING_SETTINGS: MonitoringSettingsState = {
  detectFrequencyMin: 1,
  entry: { stayMinutes: 5, autoOrderStatus: true, orderStatus: '配送中' },
  exit: { stayMinutes: 5, autoOrderStatus: false, orderStatus: '已送達' },
  alerts: {
    late: { enabled: true, thresholdMin: 5 },
    overtime: { enabled: true, thresholdMin: 10 },
    noShow: { enabled: true, thresholdMin: 15 },
    tempLoss: { enabled: false, thresholdMin: 5 },
  },
};

export default function GlobalMonitoringSettingsDialog({
  open,
  onClose,
  state,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  state: MonitoringSettingsState;
  onChange: (next: MonitoringSettingsState) => void;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState<MonitoringSettingsState>(state);

  useEffect(() => {
    if (open) setDraft(state);
  }, [open, state]);

  function handleSave() {
    onChange(draft);
    onClose();
  }

  const freqConflict =
    draft.detectFrequencyMin >= draft.entry.stayMinutes ||
    draft.detectFrequencyMin >= draft.exit.stayMinutes;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5Bold" sx={{ display: 'block', mb: 0.25 }}>
          監控設定
        </Typography>
        <Typography
          variant="footnote"
          sx={{ color: theme.palette.dasGrey.grey01 }}
        >
          套用於所有圍籬的共用規則
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* 系統偵測 */}
        <SectionHeader title="系統偵測" />
        <Paper
          variant="outlined"
          sx={{ p: 2, mb: 2.5, borderRadius: 1.5 }}
        >
          <Typography
            variant="headline"
            sx={{
              display: 'block',
              color: theme.palette.dasGrey.grey01,
              mb: 0.75,
            }}
          >
            偵測頻率
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1">每</Typography>
            <TextField
              size="small"
              type="number"
              value={draft.detectFrequencyMin}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!isFinite(n)) return;
                setDraft((d) => ({
                  ...d,
                  detectFrequencyMin: Math.max(1, Math.min(60, n)),
                }));
              }}
              inputProps={{
                min: 1,
                max: 60,
                style: { textAlign: 'center', width: 48 },
              }}
              sx={{ width: 80 }}
            />
            <Typography variant="body1">分鐘比對車輛座標與圍籬範圍</Typography>
          </Box>
          {freqConflict && (
            <Alert
              severity="warning"
              sx={{ mt: 1.5, py: 0.25, '& .MuiAlert-message': { py: 0.5 } }}
            >
              <Typography variant="footnote">
                偵測頻率應小於停留判定分鐘數,否則無法採集足夠樣本。
              </Typography>
            </Alert>
          )}
        </Paper>

        {/* 進出場判定 */}
        <SectionHeader title="進出場判定" />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <EventRuleCard
            direction="entry"
            value={draft.entry}
            onChange={(entry) => setDraft((d) => ({ ...d, entry }))}
          />
          <EventRuleCard
            direction="exit"
            value={draft.exit}
            onChange={(exit) => setDraft((d) => ({ ...d, exit }))}
          />
        </Box>

        {/* 異常告警 */}
        <Box sx={{ mt: 2.5 }}>
          <SectionHeader title="異常告警" />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <AlertRuleCard
              icon={<WatchLaterOutlinedIcon sx={{ fontSize: 18 }} />}
              title="遲到預警"
              thresholdSentence={(input) => (
                <>
                  <Typography variant="body1">預計抵達前</Typography>
                  {input}
                  <Typography variant="body1">分鐘仍未進場 → 預警</Typography>
                </>
              )}
              value={draft.alerts.late}
              onChange={(late) =>
                setDraft((d) => ({ ...d, alerts: { ...d.alerts, late } }))
              }
            />
            <AlertRuleCard
              icon={<TimerOutlinedIcon sx={{ fontSize: 18 }} />}
              title="超時告警"
              thresholdSentence={(input) => (
                <>
                  <Typography variant="body1">停留超過預計時間</Typography>
                  {input}
                  <Typography variant="body1">分鐘 → 告警</Typography>
                </>
              )}
              value={draft.alerts.overtime}
              onChange={(overtime) =>
                setDraft((d) => ({
                  ...d,
                  alerts: { ...d.alerts, overtime },
                }))
              }
            />
            <AlertRuleCard
              icon={<EventBusyOutlinedIcon sx={{ fontSize: 18 }} />}
              title="應到未到"
              thresholdSentence={(input) => (
                <>
                  <Typography variant="body1">預計抵達時間過</Typography>
                  {input}
                  <Typography variant="body1">分鐘仍無進場事件 → 告警</Typography>
                </>
              )}
              value={draft.alerts.noShow}
              onChange={(noShow) =>
                setDraft((d) => ({ ...d, alerts: { ...d.alerts, noShow } }))
              }
            />
            <AlertRuleCard
              icon={<AcUnitIcon sx={{ fontSize: 18 }} />}
              title="失溫異常"
              titleAdornment={
                <Chip
                  label="客戶合約啟用"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 11,
                    bgcolor: theme.palette.dasGrey.grey06,
                    color: theme.palette.dasGrey.grey01,
                  }}
                />
              }
              thresholdSentence={(input) => (
                <>
                  <Typography variant="body1">溫度超出設定區間持續</Typography>
                  {input}
                  <Typography variant="body1">分鐘 → 告警</Typography>
                </>
              )}
              value={draft.alerts.tempLoss}
              onChange={(tempLoss) =>
                setDraft((d) => ({
                  ...d,
                  alerts: { ...d.alerts, tempLoss },
                }))
              }
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="secondary">
          取消
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          儲存設定
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SectionHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <Typography
      variant="body1"
      sx={{
        display: 'block',
        fontWeight: 600,
        color: theme.palette.dasDark.dark01,
        mb: 1,
      }}
    >
      {title}
    </Typography>
  );
}

function EventRuleCard({
  direction,
  value,
  onChange,
}: {
  direction: 'entry' | 'exit';
  value: MonitoringSettingsState['entry'];
  onChange: (next: MonitoringSettingsState['entry']) => void;
}) {
  const theme = useTheme();
  const isEntry = direction === 'entry';
  const label = isEntry ? '進場' : '離場';
  const icon = isEntry ? (
    <LoginIcon sx={{ fontSize: 16 }} />
  ) : (
    <LogoutIcon sx={{ fontSize: 16 }} />
  );

  return (
    <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 2,
          py: 0.75,
          bgcolor: theme.palette.dasGrey.grey06,
          color: theme.palette.dasDark.dark01,
          borderBottom: `1px solid ${theme.palette.dasGrey.grey04}`,
        }}
      >
        {icon}
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      </Box>
      <Box sx={{ p: 2 }}>
        {/* 停留分鐘 — inline 語句 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body1">連續</Typography>
          <TextField
            size="small"
            type="number"
            value={value.stayMinutes}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!isFinite(n)) return;
              onChange({
                ...value,
                stayMinutes: Math.max(1, Math.min(60, n)),
              });
            }}
            inputProps={{
              min: 1,
              max: 60,
              style: { textAlign: 'center', width: 48 },
            }}
            sx={{ width: 80 }}
          />
          <Typography variant="body1">
            分鐘{isEntry ? '停留在圍籬內' : '離開圍籬'} → 判定為「{label}」
          </Typography>
        </Box>

        {/* 自動切換訂單狀態 — switch-controlled */}
        <Box
          sx={{
            mt: 1.5,
            pt: 1.5,
            borderTop: `1px dashed ${theme.palette.dasGrey.grey04}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Switch
            size="small"
            checked={value.autoOrderStatus}
            onChange={(_, v) => onChange({ ...value, autoOrderStatus: v })}
          />
          <Typography variant="body2" sx={{ color: theme.palette.dasGrey.grey01 }}>
            偵測{label}時,自動切換訂單狀態為
          </Typography>
          <Select
            size="small"
            value={value.orderStatus}
            disabled={!value.autoOrderStatus}
            onChange={(e) =>
              onChange({
                ...value,
                orderStatus: e.target.value as OrderStatusCode,
              })
            }
            sx={{ minWidth: 108 }}
          >
            {ORDER_STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Box>
    </Paper>
  );
}

function AlertRuleCard({
  icon,
  title,
  titleAdornment,
  thresholdSentence,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  titleAdornment?: React.ReactNode;
  thresholdSentence: (input: React.ReactNode) => React.ReactNode;
  value: AlertRule;
  onChange: (next: AlertRule) => void;
}) {
  const theme = useTheme();

  return (
    <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 0.75,
          bgcolor: theme.palette.dasGrey.grey06,
          borderBottom: value.enabled
            ? `1px solid ${theme.palette.dasGrey.grey04}`
            : 'none',
          color: theme.palette.dasDark.dark01,
        }}
      >
        {icon}
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {titleAdornment}
        <Box sx={{ flex: 1 }} />
        <Switch
          size="small"
          checked={value.enabled}
          onChange={(_, v) => onChange({ ...value, enabled: v })}
        />
      </Box>

      {value.enabled && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            flexWrap: 'wrap',
          }}
        >
          {thresholdSentence(
            <TextField
              size="small"
              type="number"
              value={value.thresholdMin}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!isFinite(n)) return;
                onChange({
                  ...value,
                  thresholdMin: Math.max(1, Math.min(120, n)),
                });
              }}
              inputProps={{
                min: 1,
                max: 120,
                style: { textAlign: 'center', width: 48 },
              }}
              sx={{ width: 80 }}
            />,
          )}
        </Box>
      )}
    </Paper>
  );
}
