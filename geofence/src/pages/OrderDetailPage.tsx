import { useMemo } from 'react';
import {
  Box,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Select,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import AlarmOutlinedIcon from '@mui/icons-material/AlarmOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';

interface GeofenceOption {
  id: string;
  name: string;
}

const GEOFENCE_OPTIONS: GeofenceOption[] = [
  { id: 'gf-001', name: '僑力_南崁廠' },
  { id: 'gf-002', name: '僑力_觀音廠' },
  { id: 'gf-003', name: '僑力_中壢廠' },
];

const ORDER_DATE = '2026/04/28';

const MOCK_ORDER = {
  id: 'ORD-20260428-001',
  status: '進行中',
  customer: '富邦食品有限公司',
  vehicle: 'ABC-1234',
  driver: '王大明',
  scheduledDate: ORDER_DATE,
  deliveryStart: `${ORDER_DATE} 11:00`,
  deliveryEnd: `${ORDER_DATE} 12:00`,
  defaultGeofenceId: 'gf-001',
  actualEntry: `${ORDER_DATE} 10:55`,
  actualExit: `${ORDER_DATE} 11:45`,
};

interface MonitorData {
  geofenceName: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualEntry?: string;
  actualExit?: string;
  status: StatusResult;
  dwellMin: number | null;
}

export default function OrderDetailPage() {
  const theme = useTheme();

  const data: MonitorData = useMemo(() => {
    const dwell =
      MOCK_ORDER.actualEntry && MOCK_ORDER.actualExit
        ? diffMinutes(MOCK_ORDER.actualEntry, MOCK_ORDER.actualExit)
        : null;
    return {
      geofenceName:
        GEOFENCE_OPTIONS.find((g) => g.id === MOCK_ORDER.defaultGeofenceId)
          ?.name ?? '',
      scheduledStart: MOCK_ORDER.deliveryStart,
      scheduledEnd: MOCK_ORDER.deliveryEnd,
      actualEntry: MOCK_ORDER.actualEntry,
      actualExit: MOCK_ORDER.actualExit,
      status: computeStatus(
        MOCK_ORDER.actualEntry,
        MOCK_ORDER.deliveryStart,
        MOCK_ORDER.deliveryEnd,
      ),
      dwellMin: dwell,
    };
  }, []);

  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: theme.palette.dasGrey.grey06,
        minHeight: '100%',
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          width: '100%',
          mx: 'auto',
          p: 4,
          boxSizing: 'border-box',
        }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" sx={{ display: 'block', mb: 0.5 }}>
            訂單詳情
          </Typography>
          <Typography
            sx={{ fontSize: 13, color: theme.palette.dasGrey.grey01 }}
          >
            這個 prototype 在試「電子圍籬」這張牌卡的呈現方式。下方列出 4 種不同的資訊結構，比較它們對「狀態 ↔ 預計時間 ↔ 實際時間 ↔ 停留時間」之間關係的呈現效果。
          </Typography>
        </Box>

        <Paper sx={{ p: 3, mb: 2, borderRadius: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 1.5,
            }}
          >
            <Typography variant="h5Bold">{MOCK_ORDER.id}</Typography>
            <Chip
              label={MOCK_ORDER.status}
              size="small"
              sx={{
                bgcolor: theme.palette.dasPrimary.lite03,
                color: theme.palette.dasPrimary.dark01,
                fontWeight: 600,
              }}
            />
            <Typography
              sx={{
                ml: 1,
                fontSize: 13,
                color: theme.palette.dasGrey.grey01,
              }}
            >
              {MOCK_ORDER.scheduledDate}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 2,
            }}
          >
            <KeyValue label="客戶" value={MOCK_ORDER.customer} />
            <KeyValue label="車輛" value={MOCK_ORDER.vehicle} />
            <KeyValue label="司機" value={MOCK_ORDER.driver} />
          </Box>
        </Paper>

        {/* Variant A: 並排 grid（目前版本） */}
        <VariantWrapper
          letter="A"
          title="並排 grid"
          desc="狀態 + 三個時間數據並排，最緊湊；資訊密度高但層級扁平。"
        >
          <VariantInline data={data} />
        </VariantWrapper>

        {/* Variant B: 狀態頭條 */}
        <VariantWrapper
          letter="B"
          title="狀態頭條（status hero）"
          desc="狀態升級為頭條 banner，下方 3 個時間數據作為佐證；強調「結論先行」。"
        >
          <VariantHero data={data} />
        </VariantWrapper>

        {/* Variant C: 預計 vs 實際 對照式 */}
        <VariantWrapper
          letter="C"
          title="預計 vs 實際 對照表"
          desc="預計與實際時間用兩列對照呈現，差距用標註標出；最直接展現「狀態的計算來源」。"
        >
          <VariantCompare data={data} />
        </VariantWrapper>

        {/* Variant D: 視覺化時間軸 */}
        <VariantWrapper
          letter="D"
          title="視覺化時間軸"
          desc="水平時間軸把預計與實際的相對位置畫出來；最直觀但需要讀圖。"
        >
          <VariantTimeline data={data} />
        </VariantWrapper>
      </Box>
    </Box>
  );
}

function VariantWrapper({
  letter,
  title,
  desc,
  children,
}: {
  letter: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Paper sx={{ p: 3, mb: 2, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            bgcolor: theme.palette.dasPrimary.primary,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {letter}
        </Box>
        <Typography variant="h5Bold">{title}</Typography>
      </Box>
      <Typography
        sx={{
          fontSize: 13,
          color: theme.palette.dasGrey.grey01,
          lineHeight: 1.6,
          mb: 2,
          ml: 4,
        }}
      >
        {desc}
      </Typography>
      <Divider sx={{ mb: 2.5 }} />
      <GeofenceLabel />
      {children}
    </Paper>
  );
}

function GeofenceLabel() {
  const theme = useTheme();
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        sx={{
          fontSize: 12,
          color: theme.palette.dasGrey.grey01,
          mb: 0.75,
        }}
      >
        圍籬
      </Typography>
      <Select
        size="small"
        value={MOCK_ORDER.defaultGeofenceId}
        sx={{ minWidth: 320, fontWeight: 500 }}
        onChange={() => {}}
      >
        {GEOFENCE_OPTIONS.map((g) => (
          <MenuItem key={g.id} value={g.id}>
            {g.name}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}

/* ────────────────────────────────────────────────────────
   Variant A — 並排 grid
   ──────────────────────────────────────────────────────── */
function VariantInline({ data }: { data: MonitorData }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(180px, 220px) 1fr 1fr 1fr',
        gap: 2.5,
        alignItems: 'center',
      }}
    >
      <StatusBadge result={data.status} />
      <DataBlock label="進場時間" value={data.actualEntry ?? '—'} />
      <DataBlock label="離場時間" value={data.actualExit ?? '—'} />
      <DataBlock
        label="總停留時間"
        value={data.dwellMin != null ? formatDuration(data.dwellMin) : '—'}
        tooltip="計算方式：離場時間 − 進場時間"
      />
    </Box>
  );
}

/* ────────────────────────────────────────────────────────
   Variant B — 狀態頭條（status hero）
   ──────────────────────────────────────────────────────── */
function VariantHero({ data }: { data: MonitorData }) {
  const theme = useTheme();
  return (
    <Box>
      <StatusBanner result={data.status} />
      <Box
        sx={{
          mt: 2,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 0,
          border: `1px solid ${theme.palette.dasGrey.grey04}`,
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <DataCell
          label="進場時間"
          value={data.actualEntry ?? '—'}
          icon={<LoginOutlinedIcon sx={{ fontSize: 16 }} />}
        />
        <DataCell
          label="離場時間"
          value={data.actualExit ?? '—'}
          icon={<LogoutOutlinedIcon sx={{ fontSize: 16 }} />}
        />
        <DataCell
          label="總停留時間"
          value={data.dwellMin != null ? formatDuration(data.dwellMin) : '—'}
          icon={<AccessTimeOutlinedIcon sx={{ fontSize: 16 }} />}
          tooltip="計算方式：離場時間 − 進場時間"
        />
      </Box>
      <Box
        sx={{
          mt: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          color: theme.palette.dasGrey.grey01,
        }}
      >
        <Typography sx={{ fontSize: 13 }}>
          預計時間 {fmtTimeOnly(data.scheduledStart)} -{' '}
          {fmtTimeOnly(data.scheduledEnd)}
        </Typography>
      </Box>
    </Box>
  );
}

function StatusBanner({ result }: { result: StatusResult }) {
  const theme = useTheme();
  const cfg = statusConfig(result, theme);
  const Icon = cfg.icon;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2.5,
        py: 1.75,
        borderRadius: 1.5,
        bgcolor: cfg.bg,
        color: cfg.color,
      }}
    >
      <Icon sx={{ fontSize: 26, flexShrink: 0 }} />
      <Box>
        <Typography
          sx={{ fontSize: 18, fontWeight: 700, color: 'inherit', lineHeight: 1.3 }}
        >
          {cfg.headline}
        </Typography>
        {cfg.sub && (
          <Typography
            sx={{
              fontSize: 12,
              color: 'inherit',
              opacity: 0.8,
              lineHeight: 1.3,
            }}
          >
            {cfg.sub}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function DataCell({
  label,
  value,
  icon,
  tooltip,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tooltip?: string;
}) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: 2,
        borderRight: `1px solid ${theme.palette.dasGrey.grey04}`,
        '&:last-child': { borderRight: 'none' },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mb: 0.5,
          color: theme.palette.dasGrey.grey01,
        }}
      >
        {icon}
        <Typography sx={{ fontSize: 12, color: 'inherit' }}>{label}</Typography>
        {tooltip && (
          <Tooltip title={tooltip} placement="top" arrow>
            <InfoOutlinedIcon
              sx={{ fontSize: 13, cursor: 'help' }}
            />
          </Tooltip>
        )}
      </Box>
      <Typography
        sx={{
          fontSize: 16,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

/* ────────────────────────────────────────────────────────
   Variant C — 預計 vs 實際 對照表
   ──────────────────────────────────────────────────────── */
function VariantCompare({ data }: { data: MonitorData }) {
  const theme = useTheme();
  const entryDelta = data.actualEntry
    ? toMinutes(data.actualEntry) - toMinutes(data.scheduledStart)
    : null;
  const exitDelta = data.actualExit
    ? toMinutes(data.actualExit) - toMinutes(data.scheduledEnd)
    : null;

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '90px 1fr 1fr 1fr',
          rowGap: 0.5,
          columnGap: 2,
          alignItems: 'center',
          py: 2,
          px: 2.5,
          bgcolor: theme.palette.dasGrey.grey06,
          borderRadius: 1.5,
          border: `1px solid ${theme.palette.dasGrey.grey04}`,
        }}
      >
        {/* Header row */}
        <Box />
        <Typography sx={{ fontSize: 12, color: theme.palette.dasGrey.grey01 }}>
          開始
        </Typography>
        <Typography sx={{ fontSize: 12, color: theme.palette.dasGrey.grey01 }}>
          結束
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            color: theme.palette.dasGrey.grey01,
          }}
        >
          <Typography sx={{ fontSize: 12, color: 'inherit' }}>
            總停留時間
          </Typography>
          <Tooltip title="計算方式：離場時間 − 進場時間" placement="top" arrow>
            <InfoOutlinedIcon sx={{ fontSize: 13, cursor: 'help' }} />
          </Tooltip>
        </Box>

        {/* 預計 row */}
        <Typography
          sx={{
            fontSize: 13,
            color: theme.palette.dasGrey.grey01,
            fontWeight: 500,
          }}
        >
          預計
        </Typography>
        <Typography
          sx={{
            fontSize: 14,
            color: theme.palette.dasGrey.grey01,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmtTimeOnly(data.scheduledStart)}
        </Typography>
        <Typography
          sx={{
            fontSize: 14,
            color: theme.palette.dasGrey.grey01,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmtTimeOnly(data.scheduledEnd)}
        </Typography>
        <Typography
          sx={{
            fontSize: 14,
            color: theme.palette.dasGrey.grey02,
          }}
        >
          —
        </Typography>

        {/* 實際 row */}
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>實際</Typography>
        <ActualWithDelta
          value={data.actualEntry ? fmtTimeOnly(data.actualEntry) : '—'}
          deltaMin={entryDelta}
          anchor="start"
        />
        <ActualWithDelta
          value={data.actualExit ? fmtTimeOnly(data.actualExit) : '—'}
          deltaMin={exitDelta}
          anchor="end"
        />
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {data.dwellMin != null ? formatDuration(data.dwellMin) : '—'}
        </Typography>
      </Box>

      <Box sx={{ mt: 2 }}>
        <StatusBadge result={data.status} />
      </Box>
    </Box>
  );
}

function ActualWithDelta({
  value,
  deltaMin,
  anchor,
}: {
  value: string;
  deltaMin: number | null;
  anchor: 'start' | 'end';
}) {
  const theme = useTheme();
  const renderDelta = () => {
    if (deltaMin == null) return null;
    if (anchor === 'start') {
      // 進場：負值 = 早，正值 = 晚
      if (deltaMin < 0) {
        return (
          <DeltaTag
            text={`早 ${-deltaMin} 分`}
            color={theme.palette.dasPrimary.dark01}
            bg={theme.palette.dasPrimary.lite03}
          />
        );
      }
      if (deltaMin === 0) return null;
      return (
        <DeltaTag
          text={`晚 ${deltaMin} 分`}
          color={theme.palette.dasOrange.dark01}
          bg={theme.palette.dasOrange.lite01}
        />
      );
    }
    // 離場：與預計結束比較，負值 = 提早離開，正值 = 延後離開
    if (deltaMin < 0) {
      return (
        <DeltaTag
          text={`提早 ${-deltaMin} 分`}
          color={theme.palette.dasGreen.dark02}
          bg={theme.palette.dasGreen.lite01}
        />
      );
    }
    if (deltaMin === 0) return null;
    return (
      <DeltaTag
        text={`延後 ${deltaMin} 分`}
        color={theme.palette.dasOrange.dark01}
        bg={theme.palette.dasOrange.lite01}
      />
    );
  };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography
        sx={{
          fontSize: 14,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
      {renderDelta()}
    </Box>
  );
}

function DeltaTag({
  text,
  color,
  bg,
}: {
  text: string;
  color: string;
  bg: string;
}) {
  return (
    <Box
      sx={{
        px: 0.75,
        py: 0.25,
        borderRadius: 0.75,
        bgcolor: bg,
        color: color,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </Box>
  );
}

/* ────────────────────────────────────────────────────────
   Variant D — 視覺化時間軸
   ──────────────────────────────────────────────────────── */
function VariantTimeline({ data }: { data: MonitorData }) {
  const theme = useTheme();

  // 取四個時間點，計算最小最大、然後 normalize
  const times = [
    { key: 'sched-start', label: '預計開始', kind: 'sched', t: data.scheduledStart },
    { key: 'sched-end', label: '預計結束', kind: 'sched', t: data.scheduledEnd },
    ...(data.actualEntry
      ? [
          {
            key: 'actual-entry',
            label: '進場',
            kind: 'actual',
            t: data.actualEntry,
          },
        ]
      : []),
    ...(data.actualExit
      ? [
          {
            key: 'actual-exit',
            label: '離場',
            kind: 'actual',
            t: data.actualExit,
          },
        ]
      : []),
  ];

  const minM = Math.min(...times.map((p) => toMinutes(p.t)));
  const maxM = Math.max(...times.map((p) => toMinutes(p.t)));
  const range = Math.max(1, maxM - minM);

  function pct(t: string): number {
    return ((toMinutes(t) - minM) / range) * 100;
  }

  // dwell highlight bar (進場 → 離場)
  const dwellLeft = data.actualEntry ? pct(data.actualEntry) : null;
  const dwellRight = data.actualExit ? pct(data.actualExit) : null;
  // scheduled window bar (預計開始 → 預計結束)
  const schedLeft = pct(data.scheduledStart);
  const schedRight = pct(data.scheduledEnd);

  return (
    <Box>
      <Box sx={{ px: 5, py: 2 }}>
        <Box sx={{ position: 'relative', height: 100, width: '100%' }}>
        {/* 預計 window bar (背景帶) */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: `${schedLeft}%`,
            width: `${schedRight - schedLeft}%`,
            height: 14,
            bgcolor: theme.palette.dasGrey.grey05,
            borderRadius: 7,
            transform: 'translateY(-50%)',
          }}
        />

        {/* dwell bar (進場-離場) overlaid on top */}
        {dwellLeft != null && dwellRight != null && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: `${dwellLeft}%`,
              width: `${dwellRight - dwellLeft}%`,
              height: 6,
              bgcolor: theme.palette.dasPrimary.primary,
              borderRadius: 3,
              transform: 'translateY(-50%)',
            }}
          />
        )}

        {/* 各 marker */}
        {times.map((p) => {
          const left = pct(p.t);
          const isActual = p.kind === 'actual';
          const above = isActual; // 實際在線上方，預計在線下方
          return (
            <Box
              key={p.key}
              sx={{
                position: 'absolute',
                top: '50%',
                left: `${left}%`,
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* 標籤 above 或 below dot */}
              {above && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 18,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 11,
                      color: theme.palette.dasGrey.grey01,
                      lineHeight: 1.2,
                    }}
                  >
                    {p.label}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: theme.palette.dasDark.dark01,
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.2,
                    }}
                  >
                    {fmtTimeOnly(p.t)}
                  </Typography>
                </Box>
              )}

              {/* dot */}
              <Box
                sx={{
                  width: isActual ? 14 : 10,
                  height: isActual ? 14 : 10,
                  borderRadius: '50%',
                  bgcolor: isActual
                    ? theme.palette.dasPrimary.primary
                    : '#fff',
                  border: isActual
                    ? `2px solid #fff`
                    : `2px solid ${theme.palette.dasGrey.grey02}`,
                  boxShadow: isActual
                    ? `0 0 0 2px ${theme.palette.dasPrimary.primary}`
                    : 'none',
                  zIndex: 2,
                }}
              />

              {!above && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 18,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: theme.palette.dasGrey.grey01,
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.2,
                    }}
                  >
                    {fmtTimeOnly(p.t)}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 11,
                      color: theme.palette.dasGrey.grey01,
                      lineHeight: 1.2,
                    }}
                  >
                    {p.label}
                  </Typography>
                </Box>
              )}
            </Box>
          );
        })}
        </Box>
      </Box>

      <Box
        sx={{
          mt: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 2,
          alignItems: 'center',
        }}
      >
        <StatusBadge result={data.status} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: theme.palette.dasGrey.grey01,
            }}
          >
            <AccessTimeOutlinedIcon sx={{ fontSize: 16 }} />
            <Typography sx={{ fontSize: 13 }}>
              停留{' '}
              {data.dwellMin != null ? formatDuration(data.dwellMin) : '—'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/* ────────────────────────────────────────────────────────
   Shared bits
   ──────────────────────────────────────────────────────── */
type StatusType = '提早抵達' | '準時抵達' | '遲到' | '應到未到' | '監控中';

interface StatusResult {
  type: StatusType;
  diffMin?: number;
}

interface StatusCfg {
  icon: typeof AccessTimeOutlinedIcon;
  color: string;
  bg: string;
  headline: string;
  sub?: string;
}

function statusConfig(result: StatusResult, theme: Theme): StatusCfg {
  switch (result.type) {
    case '提早抵達':
      return {
        icon: AccessTimeOutlinedIcon,
        color: theme.palette.dasPrimary.dark01,
        bg: theme.palette.dasPrimary.lite03,
        headline: `比預計開始時間早 ${result.diffMin} 分鐘進場`,
        sub: '訂單在預計區間之前抵達圍籬',
      };
    case '準時抵達':
      return {
        icon: CheckCircleOutlineIcon,
        color: theme.palette.dasGreen.dark02,
        bg: theme.palette.dasGreen.lite01,
        headline: '準時抵達',
        sub: '訂單在預計區間內抵達圍籬',
      };
    case '遲到':
      return {
        icon: WarningAmberOutlinedIcon,
        color: theme.palette.dasOrange.dark01,
        bg: theme.palette.dasOrange.lite01,
        headline: `比預計結束時間晚 ${result.diffMin} 分鐘進場`,
        sub: '訂單超過預計區間才抵達圍籬',
      };
    case '應到未到':
      return {
        icon: AlarmOutlinedIcon,
        color: theme.palette.error.main,
        bg: '#FFEDEA',
        headline: '應到未到',
        sub: '已超過預計結束時間，仍未進場',
      };
    case '監控中':
      return {
        icon: HourglassEmptyOutlinedIcon,
        color: theme.palette.dasGrey.grey01,
        bg: theme.palette.dasGrey.grey05,
        headline: '監控中',
      };
  }
}

function StatusBadge({ result }: { result: StatusResult }) {
  const theme = useTheme();
  const cfg = statusConfig(result, theme);
  const Icon = cfg.icon;
  // Compact format: secondary text on top, primary below
  const isCompound = cfg.headline.includes('分鐘');
  const [secondary, primary] = isCompound
    ? splitHeadline(cfg.headline)
    : [undefined, cfg.headline];
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 1.25,
        borderRadius: 1,
        bgcolor: cfg.bg,
        color: cfg.color,
        minHeight: 56,
      }}
    >
      <Icon sx={{ fontSize: 20, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        {secondary && (
          <Typography
            sx={{
              fontSize: 12,
              color: 'inherit',
              opacity: 0.85,
              lineHeight: 1.3,
            }}
          >
            {secondary}
          </Typography>
        )}
        <Typography
          sx={{
            fontSize: 14,
            fontWeight: 600,
            color: 'inherit',
            lineHeight: 1.3,
          }}
        >
          {primary}
        </Typography>
      </Box>
    </Box>
  );
}

// 把「比預計開始時間早 5 分鐘進場」拆成「比預計開始時間早」「5 分鐘進場」
function splitHeadline(text: string): [string, string] {
  const match = text.match(/^(.+早|.+晚)\s*(\d+\s*分鐘進場)$/);
  if (match) return [match[1], match[2]];
  return ['', text];
}

function DataBlock({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string;
  tooltip?: string;
}) {
  const theme = useTheme();
  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mb: 0.5,
          color: theme.palette.dasGrey.grey01,
        }}
      >
        <Typography sx={{ fontSize: 12, color: 'inherit' }}>{label}</Typography>
        {tooltip && (
          <Tooltip title={tooltip} placement="top" arrow>
            <InfoOutlinedIcon
              sx={{ fontSize: 14, cursor: 'help' }}
            />
          </Tooltip>
        )}
      </Box>
      <Typography
        sx={{
          fontSize: 14,
          fontWeight: 500,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 12,
          color: theme.palette.dasGrey.grey01,
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 500 }}>{value}</Typography>
    </Box>
  );
}

function computeStatus(
  entry: string | undefined,
  start: string,
  end: string,
): StatusResult {
  if (!entry) return { type: '應到未到' };
  const e = toMinutes(entry);
  const s = toMinutes(start);
  const t = toMinutes(end);
  if (e < s) return { type: '提早抵達', diffMin: s - e };
  if (e <= t) return { type: '準時抵達' };
  return { type: '遲到', diffMin: e - t };
}

function toMinutes(s: string): number {
  const time = s.split(' ')[1] ?? s;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function diffMinutes(a: string, b: string): number {
  return toMinutes(b) - toMinutes(a);
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} 分鐘`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} 小時` : `${h} 小時 ${m} 分`;
}

function fmtTimeOnly(s: string): string {
  return s.split(' ')[1] ?? s;
}
