import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

export type OrderStatusCode = '待派送' | '進行中' | '已完成' | '已取消';
const ORDER_STATUS_OPTIONS: OrderStatusCode[] = [
  '待派送',
  '進行中',
  '已完成',
  '已取消',
];

export interface AlertRuleWithThreshold {
  enabled: boolean;
  thresholdMin: number;
}

export interface DirectionRule {
  stayMinutes: number;
  autoOrderStatus: boolean;
  orderStatus: OrderStatusCode | '';
}

export interface MonitoringSettingsState {
  detectFrequencyMin: number;
  entry: DirectionRule;
  exit: DirectionRule;
  alerts: {
    earlyArrival: AlertRuleWithThreshold; // 提早抵達
    overtime: AlertRuleWithThreshold; // 可能會逾時
    noShow: AlertRuleWithThreshold; // 應到未到（過預計結束時間 N 分鐘仍未進場）
  };
}

export const DEFAULT_MONITORING_SETTINGS: MonitoringSettingsState = {
  detectFrequencyMin: 5,
  entry: { stayMinutes: 5, autoOrderStatus: true, orderStatus: '進行中' },
  exit: { stayMinutes: 5, autoOrderStatus: false, orderStatus: '' },
  alerts: {
    earlyArrival: { enabled: false, thresholdMin: 10 },
    overtime: { enabled: true, thresholdMin: 60 },
    noShow: { enabled: true, thresholdMin: 15 },
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{ sx: { maxWidth: 1024 } }}
    >
      <DialogTitle>
        <Typography variant="h5Bold" sx={{ display: 'block', mb: 0.5 }}>
          設定監控
        </Typography>
        <Typography
          sx={{ fontSize: 13, color: theme.palette.dasGrey.grey01, lineHeight: 1.5 }}
        >
          此設定將套用於所有圍籬，如訂單受圍籬監控，則會觸發相關判斷及通知。
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* 偵測頻率 */}
        <Box>
          <SectionTitle title="偵測頻率" />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body1">系統每</Typography>
            <NumberInput
              value={draft.detectFrequencyMin}
              min={1}
              max={60}
              onChange={(n) =>
                setDraft((d) => ({ ...d, detectFrequencyMin: n }))
              }
            />
            <Typography variant="body1">
              分鐘比對一次車輛 GPS 位置與圍籬範圍
            </Typography>
          </Box>
        </Box>

        {/* 進/離場判斷 */}
        <Box>
          <SectionTitle title="進/離場判斷" />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 1.5,
            }}
          >
            <DirectionCard
              direction="entry"
              value={draft.entry}
              onChange={(entry) => setDraft((d) => ({ ...d, entry }))}
            />
            <DirectionCard
              direction="exit"
              value={draft.exit}
              onChange={(exit) => setDraft((d) => ({ ...d, exit }))}
            />
          </Box>
        </Box>

        {/* 異常告警 */}
        <Box>
          <SectionTitle title="異常提醒" />

          <AlertTimeline
            earlyArrival={draft.alerts.earlyArrival}
            overtime={draft.alerts.overtime}
            noShow={draft.alerts.noShow}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <AlertCard
              icon={
                <AccessTimeOutlinedIcon
                  sx={{ fontSize: 20, color: theme.palette.dasPrimary.primary }}
                />
              }
              title="提早抵達"
              calcExplain="觸發時機：預計配達開始時間 − 設定分鐘數。例如預計 10:00 開始，提早 10 分鐘 → 09:50 起若進場即觸發。"
              renderSentence={(input) => (
                <>
                  <Typography variant="body2">
                    車輛比訂單「預計配達開始時間」提早
                  </Typography>
                  {input}
                  <Typography variant="body2">分鐘進場</Typography>
                </>
              )}
              enabled={draft.alerts.earlyArrival.enabled}
              onEnabledChange={(enabled) =>
                setDraft((d) => ({
                  ...d,
                  alerts: {
                    ...d.alerts,
                    earlyArrival: { ...d.alerts.earlyArrival, enabled },
                  },
                }))
              }
              threshold={draft.alerts.earlyArrival.thresholdMin}
              onThresholdChange={(thresholdMin) =>
                setDraft((d) => ({
                  ...d,
                  alerts: {
                    ...d.alerts,
                    earlyArrival: { ...d.alerts.earlyArrival, thresholdMin },
                  },
                }))
              }
            />
            <AlertCard
              icon={
                <WarningAmberOutlinedIcon
                  sx={{ fontSize: 20, color: '#F4A340' }}
                />
              }
              title="可能會逾時"
              calcExplain="觸發時機：預計配達結束時間 − 設定分鐘數，仍未進場時。例如預計 12:00 結束，提前 60 分鐘 → 11:00 起若仍未進場即觸發。"
              renderSentence={(input) => (
                <>
                  <Typography variant="body2">
                    車輛於訂單「預計配達結束時間」前
                  </Typography>
                  {input}
                  <Typography variant="body2">分鐘還沒進場</Typography>
                </>
              )}
              enabled={draft.alerts.overtime.enabled}
              onEnabledChange={(enabled) =>
                setDraft((d) => ({
                  ...d,
                  alerts: {
                    ...d.alerts,
                    overtime: { ...d.alerts.overtime, enabled },
                  },
                }))
              }
              threshold={draft.alerts.overtime.thresholdMin}
              onThresholdChange={(thresholdMin) =>
                setDraft((d) => ({
                  ...d,
                  alerts: {
                    ...d.alerts,
                    overtime: { ...d.alerts.overtime, thresholdMin },
                  },
                }))
              }
            />
            <AlertCard
              icon={
                <ErrorOutlineIcon
                  sx={{ fontSize: 20, color: theme.palette.error.main }}
                />
              }
              title="應到未到"
              calcExplain="觸發時機：預計配達結束時間 + 設定分鐘數，仍未進場時。例如預計 12:00 結束、設定 15 分鐘 → 12:15 起若仍未進場即觸發。給 OP 一段 buffer 避免太早報警。"
              renderSentence={(input) => (
                <>
                  <Typography variant="body2">
                    車輛於訂單「預計配達結束時間」後
                  </Typography>
                  {input}
                  <Typography variant="body2">分鐘還沒進場</Typography>
                </>
              )}
              enabled={draft.alerts.noShow.enabled}
              onEnabledChange={(enabled) =>
                setDraft((d) => ({
                  ...d,
                  alerts: {
                    ...d.alerts,
                    noShow: { ...d.alerts.noShow, enabled },
                  },
                }))
              }
              threshold={draft.alerts.noShow.thresholdMin}
              onThresholdChange={(thresholdMin) =>
                setDraft((d) => ({
                  ...d,
                  alerts: {
                    ...d.alerts,
                    noShow: { ...d.alerts.noShow, thresholdMin },
                  },
                }))
              }
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" color="secondary">
          取消
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          儲存設定
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SectionTitle({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <Typography
      sx={{
        fontWeight: 600,
        fontSize: 16,
        color: theme.palette.dasDark.dark01,
        mb: 1.5,
      }}
    >
      {title}
    </Typography>
  );
}

function NumberInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <TextField
      size="small"
      type="number"
      value={value}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        if (!isFinite(n)) return;
        onChange(Math.max(min, Math.min(max, n)));
      }}
      inputProps={{
        min,
        max,
        style: { textAlign: 'center', width: 36, padding: '6px 8px' },
      }}
      sx={{ width: 64 }}
    />
  );
}

function DirectionCard({
  direction,
  value,
  onChange,
}: {
  direction: 'entry' | 'exit';
  value: DirectionRule;
  onChange: (next: DirectionRule) => void;
}) {
  const theme = useTheme();
  const isEntry = direction === 'entry';
  const label = isEntry ? '進場' : '離場';
  const sentence = isEntry
    ? '分鐘停留在圍籬內，判斷為進場'
    : '分鐘離開圍籬範圍，判斷為離場';
  const icon = isEntry ? (
    <LoginIcon sx={{ fontSize: 18, color: theme.palette.dasDark.dark01 }} />
  ) : (
    <LogoutIcon sx={{ fontSize: 18, color: theme.palette.dasDark.dark01 }} />
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 1.5,
        borderColor: theme.palette.dasGrey.grey04,
        bgcolor: theme.palette.dasGrey.grey06,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
        {icon}
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
          mb: 1.5,
        }}
      >
        <Typography variant="body2">車輛連續</Typography>
        <NumberInput
          value={value.stayMinutes}
          min={1}
          max={60}
          onChange={(n) => onChange({ ...value, stayMinutes: n })}
        />
        <Typography variant="body2">{sentence}</Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={value.autoOrderStatus}
              onChange={(_, checked) =>
                onChange({ ...value, autoOrderStatus: checked })
              }
              sx={{ p: 0.5 }}
            />
          }
          label={
            <Typography variant="body2">自動切換訂單狀態為</Typography>
          }
          sx={{ m: 0, gap: 0.5 }}
        />
        <Select
          size="small"
          value={value.orderStatus}
          displayEmpty
          disabled={!value.autoOrderStatus}
          onChange={(e) =>
            onChange({
              ...value,
              orderStatus: e.target.value as OrderStatusCode | '',
            })
          }
          sx={{ minWidth: 132 }}
          renderValue={(v) =>
            v ? (
              <span>{v}</span>
            ) : (
              <span style={{ color: theme.palette.dasGrey.grey02 }}>
                請選擇
              </span>
            )
          }
        >
          {ORDER_STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Paper>
  );
}

function AlertTimeline({
  earlyArrival,
  overtime,
  noShow,
}: {
  earlyArrival: AlertRuleWithThreshold;
  overtime: AlertRuleWithThreshold;
  noShow: AlertRuleWithThreshold;
}) {
  const theme = useTheme();
  const items = [
    {
      kind: 'alert' as const,
      label: '提早抵達',
      anchorRef: '預計開始',
      sub: `−${earlyArrival.thresholdMin} 分`,
      color: theme.palette.dasPrimary.primary,
      enabled: earlyArrival.enabled,
    },
    {
      kind: 'anchor' as const,
      label: '預計開始',
    },
    {
      kind: 'alert' as const,
      label: '可能逾時',
      anchorRef: '預計結束',
      sub: `−${overtime.thresholdMin} 分`,
      color: '#F4A340',
      enabled: overtime.enabled,
    },
    {
      kind: 'anchor' as const,
      label: '預計結束',
    },
    {
      kind: 'alert' as const,
      label: '應到未到',
      anchorRef: '預計結束',
      sub: `+${noShow.thresholdMin} 分`,
      color: theme.palette.error.main,
      enabled: noShow.enabled,
    },
  ];

  const ROW_TOP = 56;
  const ROW_DOT = 14;
  const ROW_BOT = 26;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 1.5,
        borderRadius: 1.5,
        borderColor: theme.palette.dasGrey.grey04,
        bgcolor: theme.palette.dasGrey.grey06,
      }}
    >
      <Typography
        variant="footnote"
        sx={{ display: 'block', color: theme.palette.dasGrey.grey01, mb: 1 }}
      >
        參考時間軸（僅示意，實際時間將根據訂單的預計配達開始/結束時間為準）
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
        {items.map((it, i) => {
          const isAlert = it.kind === 'alert';
          const dotColor = isAlert ? it.color : theme.palette.dasGrey.grey01;
          const textColor = isAlert ? it.color : theme.palette.dasDark.dark01;
          return (
            <Box
              key={i}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              {/* Top row: alert label + sub */}
              <Box
                sx={{
                  height: ROW_TOP,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  pb: 0.5,
                }}
              >
                {isAlert && (
                  <>
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: textColor,
                        lineHeight: 1.3,
                      }}
                    >
                      {it.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: textColor,
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: 1.3,
                      }}
                    >
                      {it.anchorRef} {it.sub}
                    </Typography>
                  </>
                )}
              </Box>

              {/* Middle row: dot + line */}
              <Box
                sx={{
                  height: ROW_DOT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  position: 'relative',
                }}
              >
                {/* Left half line */}
                {i > 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      right: '50%',
                      top: '50%',
                      height: '2px',
                      bgcolor: theme.palette.dasGrey.grey04,
                      transform: 'translateY(-50%)',
                    }}
                  />
                )}
                {/* Right half line */}
                {i < items.length - 1 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: '50%',
                      right: 0,
                      top: '50%',
                      height: '2px',
                      bgcolor: theme.palette.dasGrey.grey04,
                      transform: 'translateY(-50%)',
                    }}
                  />
                )}
                {/* Dot */}
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: dotColor,
                    border: `2px solid ${theme.palette.dasGrey.grey06}`,
                    boxShadow: `0 0 0 1px ${dotColor}`,
                    zIndex: 1,
                  }}
                />
              </Box>

              {/* Bottom row: anchor label */}
              <Box
                sx={{
                  height: ROW_BOT,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  pt: 0.75,
                }}
              >
                {!isAlert && (
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: textColor,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {it.label}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

function AlertCard({
  icon,
  title,
  calcExplain,
  renderSentence,
  enabled,
  onEnabledChange,
  threshold,
  onThresholdChange,
}: {
  icon: React.ReactNode;
  title: string;
  calcExplain: string;
  renderSentence: (input?: React.ReactNode) => React.ReactNode;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  threshold?: number;
  onThresholdChange?: (n: number) => void;
}) {
  const theme = useTheme();
  const hasThreshold =
    typeof threshold === 'number' && typeof onThresholdChange === 'function';

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 1.5,
        borderColor: theme.palette.dasGrey.grey04,
        bgcolor: theme.palette.dasGrey.grey06,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
            {icon}
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.75,
              flexWrap: 'wrap',
              color: theme.palette.dasDark.dark01,
            }}
          >
            {hasThreshold
              ? renderSentence(
                  <NumberInput
                    value={threshold}
                    min={1}
                    max={240}
                    onChange={onThresholdChange!}
                  />,
                )
              : renderSentence()}
            <Tooltip title={calcExplain} placement="top" arrow>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.25,
                  color: theme.palette.dasGrey.grey01,
                  cursor: 'help',
                }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 14 }} />
                <Typography variant="body2" sx={{ color: 'inherit' }}>
                  計算方式
                </Typography>
              </Box>
            </Tooltip>
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flexShrink: 0,
          }}
        >
          <Switch
            size="small"
            checked={enabled}
            onChange={(_, v) => onEnabledChange(v)}
          />
          <Typography variant="body2" sx={{ color: theme.palette.dasGrey.grey01 }}>
            發送通知
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}
