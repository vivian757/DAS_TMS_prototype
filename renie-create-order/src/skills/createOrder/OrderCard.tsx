import { useEffect, useRef, useState } from 'react';
import { Box, Tooltip, Typography, useTheme, Link } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import type { FieldKey, OrderDraft } from './types';
import { FIELD_META, FIELD_ORDER } from './fieldMeta';
import InlineField from './InlineField';
import InlineText from './InlineText';
import AmbiguousField from './AmbiguousField';

type Props = {
  order: OrderDraft;
  index: number;
  onUpdateOrderNo: (orderNo: string) => void;
  onUpdateField: (key: FieldKey, value: string) => void;
  onResolveAmbiguity?: (key: FieldKey, chosen: string | null) => void;
  onRemove?: () => void;
};

export default function OrderCard({
  order,
  index,
  onUpdateOrderNo,
  onUpdateField,
  onResolveAmbiguity,
  onRemove,
}: Props) {
  const theme = useTheme();
  const committed = !!order.committed;
  const missingSet = new Set<FieldKey>(order.missingFields ?? []);
  const ambiguous = order.ambiguousFields ?? {};
  const correctedSet = new Set<FieldKey>(order.recentlyCorrected?.fields ?? []);

  // Flash 動畫:recentlyCorrected.at 變動時短暫高亮卡片邊框
  const [flashing, setFlashing] = useState(false);
  const lastAtRef = useRef<number | undefined>(order.recentlyCorrected?.at);
  useEffect(() => {
    const at = order.recentlyCorrected?.at;
    if (at && at !== lastAtRef.current) {
      lastAtRef.current = at;
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 1800);
      return () => clearTimeout(t);
    }
  }, [order.recentlyCorrected?.at]);

  /**
   * Display fields = 解析到的欄位 ∪ Renie 認為應該補的欄位 ∪ 含歧義的欄位
   * 依 FIELD_ORDER 排序,fullWidth 欄位或歧義中欄位獨佔一行、其他兩兩配對。
   */
  const presentFields = FIELD_ORDER.filter(
    (k) => k in order.fields || missingSet.has(k) || k in ambiguous,
  );
  type Row =
    | { kind: 'full'; key: FieldKey }
    | { kind: 'pair'; left: FieldKey; right?: FieldKey };
  const rows: Row[] = [];
  let pending: FieldKey | null = null;
  for (const k of presentFields) {
    const meta = FIELD_META[k];
    // 歧義中欄位需要 chip group + 逃生口,佔一整行避免被擠
    const forceFull = meta.fullWidth || k in ambiguous;
    if (forceFull) {
      if (pending) {
        rows.push({ kind: 'pair', left: pending });
        pending = null;
      }
      rows.push({ kind: 'full', key: k });
    } else if (pending) {
      rows.push({ kind: 'pair', left: pending, right: k });
      pending = null;
    } else {
      pending = k;
    }
  }
  if (pending) rows.push({ kind: 'pair', left: pending });

  return (
    <Box
      sx={{
        bgcolor: '#FFFFFF',
        border: `1px solid ${flashing ? theme.palette.dasPrimary.primary : theme.palette.dasGrey.grey04}`,
        boxShadow: flashing
          ? `0 0 0 3px ${theme.palette.dasPrimary.lite03}`
          : 'none',
        borderRadius: 2.5,
        opacity: committed ? 0.6 : 1,
        px: 2.5,
        py: 2,
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          mb: 1.5,
        }}
      >
        <Typography
          variant="h5Bold"
          sx={{ color: theme.palette.dasDark.dark01 }}
        >
          {index + 1}.
        </Typography>
        {committed && (
          <CheckCircleIcon
            sx={{ fontSize: 18, color: theme.palette.dasGreen.dark03 }}
          />
        )}
        <Typography
          variant="h5Bold"
          sx={{ color: theme.palette.dasDark.dark01 }}
        >
          訂單
        </Typography>
        {committed ? (
          <Link
            href="#"
            onClick={(e) => e.preventDefault()}
            underline="hover"
            sx={{
              color: theme.palette.dasPrimary.primary,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            #{order.orderNo}
          </Link>
        ) : (
          <InlineText
            value={order.orderNo}
            onChange={onUpdateOrderNo}
            textSx={{
              fontSize: 16,
              fontWeight: 600,
              color: theme.palette.dasDark.dark01,
            }}
            inputWidth={140}
          />
        )}
        <Box sx={{ flex: 1 }} />
        {!committed && onRemove && (
          <Tooltip title="移除此筆訂單" arrow>
            <Box
              role="button"
              onClick={onRemove}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: '50%',
                cursor: 'pointer',
                color: theme.palette.dasGrey.grey02,
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: theme.palette.dasRed.lite01,
                  color: theme.palette.dasRed.dark01,
                },
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: 18 }} />
            </Box>
          </Tooltip>
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          pl: 1,
        }}
      >
        {rows.map((row, ri) => {
          if (row.kind === 'full') {
            return (
              <FieldRow
                key={ri}
                fieldKey={row.key}
                order={order}
                committed={committed}
                missingSet={missingSet}
                ambiguous={ambiguous}
                correctedSet={correctedSet}
                onUpdateField={onUpdateField}
                onResolveAmbiguity={onResolveAmbiguity}
                theme={theme}
              />
            );
          }
          const { left, right } = row;
          return (
            <Box
              key={ri}
              sx={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                columnGap: 4,
              }}
            >
              <FieldRow
                fieldKey={left}
                order={order}
                committed={committed}
                missingSet={missingSet}
                ambiguous={ambiguous}
                correctedSet={correctedSet}
                onUpdateField={onUpdateField}
                onResolveAmbiguity={onResolveAmbiguity}
                theme={theme}
              />
              {right && (
                <FieldRow
                  fieldKey={right}
                  order={order}
                  committed={committed}
                  missingSet={missingSet}
                  ambiguous={ambiguous}
                  correctedSet={correctedSet}
                  onUpdateField={onUpdateField}
                  onResolveAmbiguity={onResolveAmbiguity}
                  theme={theme}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

type FieldRowProps = {
  fieldKey: FieldKey;
  order: OrderDraft;
  committed: boolean;
  missingSet: Set<FieldKey>;
  ambiguous: Partial<Record<FieldKey, string[]>>;
  correctedSet: Set<FieldKey>;
  onUpdateField: (key: FieldKey, value: string) => void;
  onResolveAmbiguity?: (key: FieldKey, chosen: string | null) => void;
  theme: Theme;
};

/** 渲染單一欄位:歧義 → chip group;一般 → InlineField。修正過的欄位旁加 ✨ 標記。 */
function FieldRow({
  fieldKey,
  order,
  committed,
  missingSet,
  ambiguous,
  correctedSet,
  onUpdateField,
  onResolveAmbiguity,
  theme,
}: FieldRowProps) {
  const isAmbiguous = !committed && fieldKey in ambiguous;
  const candidates = ambiguous[fieldKey] ?? [];
  const wasCorrected = correctedSet.has(fieldKey);

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, flex: 1 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {isAmbiguous ? (
          <AmbiguousField
            label={FIELD_META[fieldKey].label}
            currentValue={order.fields[fieldKey] ?? ''}
            candidates={candidates}
            onPick={(chosen) => onResolveAmbiguity?.(fieldKey, chosen)}
            onEscape={() => onResolveAmbiguity?.(fieldKey, null)}
          />
        ) : (
          <InlineField
            label={FIELD_META[fieldKey].label}
            value={order.fields[fieldKey] ?? ''}
            disabled={committed}
            missing={missingSet.has(fieldKey)}
            onChange={(v) => onUpdateField(fieldKey, v)}
          />
        )}
      </Box>
      {wasCorrected && (
        <Tooltip title="此欄位剛由對話修正" arrow>
          <AutoAwesomeRoundedIcon
            sx={{
              fontSize: 14,
              color: theme.palette.dasPrimary.primary,
              mt: '6px',
              flexShrink: 0,
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
}
