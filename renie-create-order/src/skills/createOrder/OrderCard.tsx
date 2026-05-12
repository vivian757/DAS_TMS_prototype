import { Box, Typography, useTheme, Link } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { FieldKey, OrderDraft } from './types';
import { FIELD_META, FIELD_ORDER } from './fieldMeta';
import InlineField from './InlineField';
import InlineText from './InlineText';

type Props = {
  order: OrderDraft;
  index: number;
  onUpdateOrderNo: (orderNo: string) => void;
  onUpdateField: (key: FieldKey, value: string) => void;
};

export default function OrderCard({
  order,
  index,
  onUpdateOrderNo,
  onUpdateField,
}: Props) {
  const theme = useTheme();
  const committed = !!order.committed;
  const missingSet = new Set<FieldKey>(order.missingFields ?? []);

  /**
   * Display fields = 解析到的欄位 ∪ Renie 認為應該補的欄位(missingFields)
   * 依 FIELD_ORDER 排序,fullWidth 欄位獨佔一行、其他兩兩配對。
   */
  const presentFields = FIELD_ORDER.filter(
    (k) => k in order.fields || missingSet.has(k),
  );
  type Row =
    | { kind: 'full'; key: FieldKey }
    | { kind: 'pair'; left: FieldKey; right?: FieldKey };
  const rows: Row[] = [];
  let pending: FieldKey | null = null;
  for (const k of presentFields) {
    const meta = FIELD_META[k];
    if (meta.fullWidth) {
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
        border: `1px solid ${theme.palette.dasGrey.grey04}`,
        borderRadius: 2.5,
        opacity: committed ? 0.6 : 1,
        px: 2.5,
        py: 2,
        transition: 'all 0.2s ease',
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
              <InlineField
                key={ri}
                label={FIELD_META[row.key].label}
                value={order.fields[row.key] ?? ''}
                disabled={committed}
                missing={missingSet.has(row.key)}
                onChange={(v) => onUpdateField(row.key, v)}
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
              <InlineField
                label={FIELD_META[left].label}
                value={order.fields[left] ?? ''}
                disabled={committed}
                missing={missingSet.has(left)}
                onChange={(v) => onUpdateField(left, v)}
              />
              {right && (
                <InlineField
                  label={FIELD_META[right].label}
                  value={order.fields[right] ?? ''}
                  disabled={committed}
                  missing={missingSet.has(right)}
                  onChange={(v) => onUpdateField(right, v)}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
