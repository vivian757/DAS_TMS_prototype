import { Fragment, useEffect, useRef, useState } from 'react';
import {
  Box,
  InputBase,
  Popover,
  Select,
  MenuItem,
  Tooltip,
  keyframes,
  useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import type { FieldKey, OrderDraft, PendingBatchUpdate } from './types';
import { FIELD_META, REQUIRED_FIELDS } from './fieldMeta';

// Row 級的 flash 動畫 — 對話批改 / resolve ambiguity 後讓對應 row 短暫高亮
const rowFlashKeyframes = (color: string) => keyframes`
  0%   { background-color: ${color}; }
  60%  { background-color: ${color}; }
  100% { background-color: transparent; }
`;

// 「點 alert 上的列號 → 對應 row 閃藍框」用 box-shadow 不影響 layout
const rowHighlightKeyframes = (color: string) => keyframes`
  0%   { box-shadow: inset 0 0 0 2px ${color}; }
  60%  { box-shadow: inset 0 0 0 2px ${color}; }
  100% { box-shadow: inset 0 0 0 0 transparent; }
`;

// AlertBox 發給 OrderTable 的 row-highlight 事件 — 點擊列號後觸發
const HIGHLIGHT_EVENT = 'renie:highlight-order-row';

export type HighlightRowEventDetail = { row: number };

type Column = {
  key: FieldKey | 'orderNo' | 'action' | 'index' | 'addItem';
  label: string;
  width?: number;
  flex?: number;
};

/** flex / fixed width 的統一 sizing — flex 欄佔據剩餘空間,fixed 欄禁止壓縮 */
function sizingSx(c: Column) {
  if (c.flex) {
    return { flex: c.flex, minWidth: c.width ?? 0 };
  }
  return { width: c.width, flexShrink: 0 };
}

// Inline 模式(在 chat 對話泡內) — 較窄,只顯示前 6 個欄位
const COMPACT_COLUMNS: Column[] = [
  { key: 'action', label: '', width: 40 },
  { key: 'index', label: '', width: 40 },
  { key: 'orderNo', label: '訂單編號', width: 120 },
  { key: 'customerName', label: '客戶', flex: 1, width: 140 },
  { key: 'businessType', label: '業務類型', width: 90 },
  { key: 'temperatureLayer', label: '溫層', width: 80 },
  { key: 'addItem', label: '', width: 40 },
];

// Panel 模式(釘到右側,預設) — 對應設計稿的精簡欄位
// 客戶欄設 flex:1,當 container 比所有欄位 sum 寬時負責吸收剩餘空間
const EXPANDED_COLUMNS: Column[] = [
  { key: 'action', label: '', width: 48 },
  { key: 'index', label: '', width: 40 },
  { key: 'orderNo', label: '訂單編號', width: 130 },
  { key: 'customerName', label: '客戶', width: 130, flex: 1 },
  { key: 'businessType', label: '業務類型', width: 100 },
  { key: 'temperatureLayer', label: '溫層', width: 80 },
  { key: 'totalVolume', label: '總材積(cuft)', width: 130 },
  { key: 'totalWeight', label: '總重量(kg)', width: 130 },
  { key: 'deliveryFee', label: '運費', width: 110 },
  { key: 'addItem', label: '', width: 48 },
];

// 「展開明細」模式 — 完整欄位,可左右 scroll;不顯示 per-row + 按鈕(因全部都已展開)
const FULL_COLUMNS: Column[] = [
  { key: 'action', label: '', width: 48 },
  { key: 'index', label: '', width: 40 },
  { key: 'orderNo', label: '訂單編號', width: 110 },
  { key: 'customerName', label: '客戶', width: 90 },
  { key: 'businessType', label: '業務類型', width: 90 },
  { key: 'temperatureLayer', label: '溫層', width: 70 },
  { key: 'totalVolume', label: '總材積(cuft)', width: 110 },
  { key: 'totalWeight', label: '總重量(kg)', width: 110 },
  { key: 'deliveryFee', label: '運費', width: 80 },
  { key: 'additionalFee', label: '附加費', width: 100 },
  { key: 'cashOnDelivery', label: '代收款', width: 100 },
  { key: 'senderCompany', label: '寄件人公司', width: 130 },
  { key: 'senderName', label: '寄件人姓名', width: 110 },
  { key: 'senderPhone', label: '寄件人電話', width: 130 },
  { key: 'senderMobile', label: '寄件人手機號碼', width: 150 },
  { key: 'senderAddress', label: '寄件人地址', width: 200 },
  { key: 'recipientCompany', label: '收件人公司', width: 130 },
  { key: 'recipientName', label: '收件人姓名', width: 110 },
  { key: 'recipientPhone', label: '收件人電話', width: 130 },
  { key: 'recipientAddress', label: '收件人地址', width: 200 },
  { key: 'recipientMobile', label: '收件人手機', width: 150 },
  { key: 'pickupStartTime', label: '預計取貨開始時間', width: 170 },
  { key: 'pickupEndTime', label: '預計取貨結束時間', width: 170 },
  { key: 'deliveryStartTime', label: '預計配達開始時間', width: 170 },
  { key: 'deliveryEndTime', label: '預計配達結束時間', width: 170 },
  { key: 'geofence', label: '電子圍籬', width: 100 },
  { key: 'note', label: '訂單備註', width: 150 },
];

// 系統 mock 客戶清單 — Select 下拉時呈現
const SYSTEM_CUSTOMERS = [
  '客戶A',
  '客戶B',
  '客戶C',
  '家具店',
  '永豐物流',
  '立信實業',
];

type Props = {
  orders: OrderDraft[];
  onUpdateOrderNo: (orderId: string, orderNo: string) => void;
  onUpdateField: (orderId: string, key: FieldKey, value: string) => void;
  onResolveAmbiguity?: (
    orderId: string,
    key: FieldKey,
    chosen: string | null,
  ) => void;
  onRemove?: (orderId: string) => void;
  /** 緊湊模式(inline,只顯示 6 個關鍵欄位);否則展示所有欄位 */
  compact?: boolean;
  /**
   * 「展開明細」模式 — 由 OrderArtifact 控制:
   * - 切換到完整欄位集(FULL_COLUMNS),允許橫向 scroll
   * - 全部 row 的貨品明細子表都展開(忽略個別 row 的 toggle 狀態)
   */
  expandAll?: boolean;
  /** 對話批改後等待用戶確認的批量更動 — 對應欄位以綠色預覽值顯示 */
  pendingBatchUpdate?: PendingBatchUpdate;
};

/**
 * Inline-editable 訂單列表 — 「Excel-like」直接編輯樣式:
 * - cell 預設為純文字,hover 時出現淺邊框,點擊進入編輯
 * - 必填且為空 → 顯示紅色 ▲ icon(置中)
 * - 歧義/不存在於系統的客戶 → 顯示「▲ value」紅字
 * - 整列有錯誤時上下出現紅色分隔線
 * - 第一欄紅色刪除 icon、最後一欄藍色「+」(新增貨品)
 */
export default function OrderTable({
  orders,
  onUpdateOrderNo,
  onUpdateField,
  onResolveAmbiguity,
  onRemove,
  compact = true,
  expandAll = false,
  pendingBatchUpdate,
}: Props) {
  const theme = useTheme();
  // 模式判斷:
  //   expandAll = true → 完整欄位集(FULL_COLUMNS,~27 欄,橫向 scroll;優先於 compact)
  //   compact = true   → inline 對話泡的精簡 6 欄
  //   else             → panel 預設(EXPANDED_COLUMNS,10 欄)
  const columns = expandAll
    ? FULL_COLUMNS
    : compact
      ? COMPACT_COLUMNS
      : EXPANDED_COLUMNS;

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<{ row: number; at: number } | null>(
    null,
  );

  const toggleExpand = (id: string) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const isExpanded = (id: string) => expandAll || expandedRows.has(id);

  // 監聽 AlertBox 發出的「點擊列號 → 高亮對應 row」事件
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<HighlightRowEventDetail>).detail;
      if (!detail) return;
      setHighlight({ row: detail.row, at: Date.now() });
    };
    window.addEventListener(HIGHLIGHT_EVENT, handler);
    return () => window.removeEventListener(HIGHLIGHT_EVENT, handler);
  }, []);

  // 計算表格總寬度 — 展開的子表要對齊整列(包含左側 action / index 欄位的縮排)
  const totalWidth = columns.reduce((sum, c) => sum + (c.width ?? 140), 0);
  const leadingOffset =
    (columns.find((c) => c.key === 'action')?.width ?? 0) +
    (columns.find((c) => c.key === 'index')?.width ?? 0);

  // pendingBatchUpdate → orderIndex → (field → previewValue)
  const pendingByRow = new Map<number, Map<FieldKey, string>>();
  if (pendingBatchUpdate) {
    for (const t of pendingBatchUpdate.targets) {
      let row = pendingByRow.get(t.orderIndex);
      if (!row) {
        row = new Map<FieldKey, string>();
        pendingByRow.set(t.orderIndex, row);
      }
      row.set(t.field, t.value);
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ overflowX: 'auto' }}>
        <HeaderRow columns={columns} theme={theme} />
        {orders.map((order, idx) => {
          const expanded = isExpanded(order.id);
          const highlightAt =
            highlight && highlight.row === idx + 1 ? highlight.at : undefined;
          // 已 committed 的訂單不參與批量預覽;否則查找此 row 的 pending 欄位
          const pendingForRow = order.committed
            ? undefined
            : pendingByRow.get(idx);
          return (
            <Fragment key={order.id}>
              <Row
                columns={columns}
                order={order}
                highlightAt={highlightAt}
                index={idx}
                theme={theme}
                expanded={expanded}
                pendingByField={pendingForRow}
                onToggleExpand={() => toggleExpand(order.id)}
                onUpdateOrderNo={(no) => onUpdateOrderNo(order.id, no)}
                onUpdateField={(k, v) => onUpdateField(order.id, k, v)}
                onResolveAmbiguity={
                  onResolveAmbiguity
                    ? (k, chosen) => onResolveAmbiguity(order.id, k, chosen)
                    : undefined
                }
                onRemove={onRemove ? () => onRemove(order.id) : undefined}
              />
              {expanded && (
                <GoodsDetailRow
                  order={order}
                  width={totalWidth}
                  leadingOffset={leadingOffset}
                  theme={theme}
                  onUpdateField={(k, v) => onUpdateField(order.id, k, v)}
                />
              )}
            </Fragment>
          );
        })}
      </Box>
    </Box>
  );
}

// ─── Header row ────────────────────────────────────────────────
function HeaderRow({ columns, theme }: { columns: Column[]; theme: Theme }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        bgcolor: '#FFFFFF',
        borderBottom: `1px solid ${theme.palette.dasGrey.grey04}`,
        height: 40,
        position: 'sticky',
        top: 0,
        zIndex: 2,
        minWidth: 'fit-content',
      }}
    >
      {columns.map((c) => {
        const required =
          c.key !== 'action' &&
          c.key !== 'index' &&
          c.key !== 'orderNo' &&
          c.key !== 'addItem' &&
          REQUIRED_FIELDS.includes(c.key as FieldKey);
        const isRequiredHeader = required || c.key === 'orderNo';
        return (
          <Box
            key={c.key}
            sx={{
              ...sizingSx(c),
              px: 1.25,
              fontSize: 13,
              fontWeight: 600,
              color: theme.palette.dasDark.dark02,
            }}
          >
            {c.label}
            {isRequiredHeader && (
              <Box
                component="span"
                sx={{ color: theme.palette.dasPrimary.primary, ml: 0.25 }}
              >
                *
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// ─── Row ───────────────────────────────────────────────────────
type RowProps = {
  columns: Column[];
  order: OrderDraft;
  index: number;
  theme: Theme;
  expanded: boolean;
  /** AlertBox 點擊列號時觸發 — 帶 timestamp 確保每次都重新播放動畫 */
  highlightAt?: number;
  /** field → 預覽值的查找表(套用於此 row);委由 cell 顯示綠色 */
  pendingByField?: Map<FieldKey, string>;
  onToggleExpand: () => void;
  onUpdateOrderNo: (no: string) => void;
  onUpdateField: (k: FieldKey, v: string) => void;
  onResolveAmbiguity?: (k: FieldKey, chosen: string | null) => void;
  onRemove?: () => void;
};

function Row({
  columns,
  order,
  index,
  theme,
  expanded,
  highlightAt,
  pendingByField,
  onToggleExpand,
  onUpdateOrderNo,
  onUpdateField,
  onResolveAmbiguity,
  onRemove,
}: RowProps) {
  const committed = !!order.committed;
  const missingSet = new Set<FieldKey>(order.missingFields ?? []);
  const ambiguous = order.ambiguousFields ?? {};
  const correctedSet = new Set<FieldKey>(order.recentlyCorrected?.fields ?? []);

  const flashKey = order.recentlyCorrected?.at;
  const flashColor = theme.palette.dasPrimary.lite04;
  const highlightColor = theme.palette.dasPrimary.primary;

  // 兩種動畫:highlightAt(點 alert 列號)優先,否則 flashKey(對話批改)
  // 用組合 key 強制 re-mount,讓 CSS animation 重新播放
  const animKey = highlightAt ?? flashKey;
  const animation = highlightAt
    ? `${rowHighlightKeyframes(highlightColor)} 1.4s ease-out`
    : flashKey
      ? `${rowFlashKeyframes(flashColor)} 1.4s ease-out`
      : undefined;

  return (
    <Box
      key={animKey}
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        position: 'relative',
        minHeight: 48,
        opacity: committed ? 0.55 : 1,
        ...(animation && { animation }),
        borderBottom: `1px solid ${theme.palette.dasGrey.grey05}`,
        '&:hover': {
          bgcolor: committed ? 'transparent' : theme.palette.dasGrey.grey06,
        },
      }}
    >
      {columns.map((c) => {
        const colSx = {
          ...sizingSx(c),
          display: 'flex',
          alignItems: 'center',
          px: c.key === 'action' || c.key === 'index' || c.key === 'addItem' ? 0 : 0.5,
          minHeight: 48,
        } as const;

        if (c.key === 'action') {
          return (
            <Box key={c.key} sx={{ ...colSx, justifyContent: 'center' }}>
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
                      borderRadius: 1,
                      cursor: 'pointer',
                      color: theme.palette.dasRed.dark01,
                      '&:hover': {
                        bgcolor: theme.palette.dasRed.lite01,
                      },
                    }}
                  >
                    <DeleteOutlineRoundedIcon sx={{ fontSize: 20 }} />
                  </Box>
                </Tooltip>
              )}
            </Box>
          );
        }
        if (c.key === 'index') {
          return (
            <Box key={c.key} sx={{ ...colSx, justifyContent: 'center' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  fontSize: 13,
                  color: theme.palette.dasDark.dark02,
                }}
              >
                {index + 1}
                {committed && (
                  <CheckCircleIcon
                    sx={{
                      fontSize: 14,
                      color: theme.palette.dasGreen.dark03,
                    }}
                  />
                )}
              </Box>
            </Box>
          );
        }
        if (c.key === 'addItem') {
          return (
            <Box key={c.key} sx={{ ...colSx, justifyContent: 'center' }}>
              {!committed && (
                <Tooltip title={expanded ? '收合貨品明細' : '展開貨品明細'} arrow>
                  <Box
                    role="button"
                    onClick={onToggleExpand}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      borderRadius: 1,
                      cursor: 'pointer',
                      color: theme.palette.dasPrimary.primary,
                      '&:hover': {
                        bgcolor: theme.palette.dasPrimary.lite04,
                      },
                    }}
                  >
                    {expanded ? (
                      <RemoveRoundedIcon sx={{ fontSize: 20 }} />
                    ) : (
                      <AddRoundedIcon sx={{ fontSize: 20 }} />
                    )}
                  </Box>
                </Tooltip>
              )}
            </Box>
          );
        }
        if (c.key === 'orderNo') {
          return (
            <Box key={c.key} sx={colSx}>
              {committed ? (
                <Box
                  sx={{
                    px: 1,
                    fontSize: 13,
                    fontFamily: 'monospace',
                    color: theme.palette.dasPrimary.primary,
                    fontWeight: 600,
                  }}
                >
                  {order.orderNo}
                </Box>
              ) : (
                <EditableCell
                  value={order.orderNo}
                  onCommit={onUpdateOrderNo}
                  theme={theme}
                  fontFamily="monospace"
                />
              )}
            </Box>
          );
        }

        const k = c.key as FieldKey;
        const value = order.fields[k] ?? '';
        const missing = missingSet.has(k);
        const candidates = ambiguous[k];
        const corrected = correctedSet.has(k);
        const pendingValue = pendingByField?.get(k);

        // Pending preview — 對話批改尚待確認的值,以深綠色顯示且不可編輯
        if (pendingValue !== undefined) {
          return (
            <Box key={c.key} sx={colSx}>
              <PendingPreviewCell value={pendingValue} theme={theme} />
            </Box>
          );
        }

        return (
          <Box key={c.key} sx={colSx}>
            <FieldCell
              fieldKey={k}
              value={value}
              missing={missing}
              candidates={candidates}
              corrected={corrected}
              disabled={committed}
              onCommit={(v) => onUpdateField(k, v)}
              onPickCandidate={
                onResolveAmbiguity
                  ? (chosen) => onResolveAmbiguity(k, chosen)
                  : undefined
              }
              onEscapeAmbiguity={
                onResolveAmbiguity
                  ? () => onResolveAmbiguity(k, null)
                  : undefined
              }
              theme={theme}
            />
          </Box>
        );
      })}
    </Box>
  );
}

// ─── Field cell(欄位渲染分派)─────────────────────────────────
type FieldCellProps = {
  fieldKey: FieldKey;
  value: string;
  missing: boolean;
  candidates?: string[];
  corrected: boolean;
  disabled: boolean;
  onCommit: (v: string) => void;
  onPickCandidate?: (chosen: string) => void;
  onEscapeAmbiguity?: () => void;
  theme: Theme;
};

function FieldCell(props: FieldCellProps) {
  const { fieldKey, candidates, disabled, missing } = props;
  const label = FIELD_META[fieldKey]?.label ?? fieldKey;
  // 為缺漏 / 歧義 cell 預先組好 tooltip 文字,後面各 cell 變體直接拿來顯示
  const missingMessage = missing ? `「${label}」為必填` : undefined;
  const ambiguousMessage =
    candidates && candidates.length > 0
      ? `「${label}」不存在於系統中`
      : undefined;

  if (fieldKey === 'businessType') return <BusinessTypeCell {...props} />;
  if (fieldKey === 'temperatureLayer') return <TemperatureLayerCell {...props} />;
  if (fieldKey === 'customerName') {
    return (
      <CustomerCell
        {...props}
        candidates={candidates}
        missingMessage={missingMessage}
        ambiguousMessage={ambiguousMessage}
      />
    );
  }
  if (candidates && candidates.length > 0 && !disabled) {
    return (
      <AmbiguousCell
        {...props}
        candidates={candidates}
        ambiguousMessage={ambiguousMessage ?? `「${label}」不存在於系統中`}
      />
    );
  }
  return (
    <EditableCell
      value={props.value}
      onCommit={props.onCommit}
      theme={props.theme}
      missing={props.missing}
      corrected={props.corrected}
      disabled={disabled}
      errorMessage={missingMessage}
    />
  );
}

// ─── Pending preview cell(批改預覽,深綠色 #21825E、不可編輯)─────
function PendingPreviewCell({
  value,
  theme,
}: {
  value: string;
  theme: Theme;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        px: 1,
        fontSize: 13,
        fontWeight: 600,
        color: theme.palette.dasGreen.dark02,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </Box>
  );
}

// ─── Editable cell(預設純文字、點擊進入編輯)─────────────────
type EditableCellProps = {
  value: string;
  onCommit: (v: string) => void;
  theme: Theme;
  missing?: boolean;
  corrected?: boolean;
  disabled?: boolean;
  fontFamily?: string;
  /** 缺漏 ▲ icon hover 時顯示的 tooltip 文字 — 由 FieldCell 組好傳入 */
  errorMessage?: string;
};

function EditableCell({
  value,
  onCommit,
  theme,
  missing,
  corrected,
  disabled,
  fontFamily,
  errorMessage,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    if (draft !== value) onCommit(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const isMissingEmpty = missing && !value;
  // 沒有錯誤就不需要 tooltip;編輯中也暫時不顯示,避免擋住 input
  const tooltipMessage = isMissingEmpty && !editing ? errorMessage : undefined;

  const cell = (
    <Box
      onClick={() => !disabled && !editing && setEditing(true)}
      sx={{
        flex: 1,
        minWidth: 0,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        border: '1px solid transparent',
        borderRadius: 1,
        px: 1,
        cursor: disabled ? 'default' : editing ? 'text' : 'pointer',
        transition: 'border-color 0.12s, background-color 0.12s',
        bgcolor: editing ? '#FFFFFF' : 'transparent',
        ...(editing && {
          borderColor: theme.palette.dasPrimary.primary,
        }),
        '& .edit-pencil': { opacity: 0, transition: 'opacity 0.12s' },
        '&:hover': disabled || editing
          ? undefined
          : {
              '& .edit-pencil': { opacity: 1 },
            },
      }}
    >
      {editing ? (
        <InputBase
          inputRef={inputRef}
          fullWidth
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit();
            }
            if (e.key === 'Escape') {
              cancel();
            }
          }}
          sx={{
            fontSize: 13,
            fontFamily,
            color: theme.palette.dasDark.dark01,
          }}
        />
      ) : isMissingEmpty ? (
        <WarningAmberRoundedIcon
          sx={{
            fontSize: 18,
            color: theme.palette.dasRed.dark01,
          }}
        />
      ) : (
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: 13,
            fontFamily,
            color: value
              ? theme.palette.dasDark.dark01
              : theme.palette.dasGrey.grey02,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {value}
        </Box>
      )}
      {!disabled && !editing && (
        <EditOutlinedIcon
          className="edit-pencil"
          sx={{
            fontSize: 14,
            color: theme.palette.dasGrey.grey02,
            flexShrink: 0,
          }}
        />
      )}
    </Box>
  );

  return tooltipMessage ? (
    <Tooltip title={tooltipMessage} arrow placement="top">
      {cell}
    </Tooltip>
  ) : (
    cell
  );
}

// ─── Business type cell(送/取)— 預設純文字,點擊開 Select ─────
function BusinessTypeCell({
  value,
  onCommit,
  disabled,
  corrected,
  theme,
}: FieldCellProps) {
  return (
    <DropdownCell
      value={value || '送'}
      options={['送', '取']}
      onCommit={onCommit}
      disabled={disabled}
      corrected={corrected}
      theme={theme}
    />
  );
}

// ─── Temperature layer cell(常溫/冷藏/冷凍)──────────────────
function TemperatureLayerCell({
  value,
  onCommit,
  disabled,
  corrected,
  theme,
}: FieldCellProps) {
  return (
    <DropdownCell
      value={value || '常溫'}
      options={['常溫', '冷藏', '冷凍']}
      onCommit={onCommit}
      disabled={disabled}
      corrected={corrected}
      theme={theme}
    />
  );
}

// ─── Dropdown cell(共用)───────────────────────────────────
function DropdownCell({
  value,
  options,
  onCommit,
  disabled,
  corrected,
  theme,
}: {
  value: string;
  options: string[];
  onCommit: (v: string) => void;
  disabled?: boolean;
  corrected?: boolean;
  theme: Theme;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        border: '1px solid transparent',
        borderRadius: 1,
        px: 1,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'border-color 0.12s, background-color 0.12s',
        ...(open && {
          borderColor: theme.palette.dasPrimary.primary,
          bgcolor: '#FFFFFF',
        }),
        '& .edit-pencil': { opacity: 0, transition: 'opacity 0.12s' },
        '&:hover': disabled
          ? undefined
          : {
              '& .edit-pencil': { opacity: 1 },
            },
      }}
    >
      <Select
        value={value}
        onChange={(e) => onCommit(e.target.value as string)}
        disabled={disabled}
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        variant="standard"
        disableUnderline
        IconComponent={() => null}
        sx={{
          flex: 1,
          fontSize: 13,
          color: theme.palette.dasDark.dark01,
          '& .MuiSelect-select': {
            p: 0,
            pr: '0 !important',
            display: 'flex',
            alignItems: 'center',
          },
        }}
      >
        {options.map((opt) => (
          <MenuItem key={opt} value={opt} sx={{ fontSize: 13 }}>
            {opt}
          </MenuItem>
        ))}
      </Select>
      {!disabled && (
        <EditOutlinedIcon
          className="edit-pencil"
          sx={{
            fontSize: 14,
            color: theme.palette.dasGrey.grey02,
            flexShrink: 0,
          }}
        />
      )}
    </Box>
  );
}

// ─── Customer cell(必填 + 系統客戶查找 + 歧義候選)──────────
function CustomerCell({
  value,
  missing,
  candidates,
  corrected,
  disabled,
  onCommit,
  onPickCandidate,
  onEscapeAmbiguity,
  theme,
  missingMessage,
  ambiguousMessage,
}: FieldCellProps & {
  candidates?: string[];
  missingMessage?: string;
  ambiguousMessage?: string;
}) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const isMissingEmpty = missing && !value;
  const hasAmbiguity = candidates && candidates.length > 0;
  // Cell-level tooltip:Popover 開啟時暫不顯示,避免重疊
  const tooltipMessage = open
    ? undefined
    : isMissingEmpty
      ? (missingMessage ?? '「客戶」為必填')
      : hasAmbiguity
        ? (ambiguousMessage ?? '「客戶」不存在於系統中')
        : undefined;

  const cell = (
    <Box
      ref={anchorRef}
      onClick={() => !disabled && setOpen(true)}
        sx={{
          flex: 1,
          minWidth: 0,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          border: '1px solid transparent',
          borderRadius: 1,
          px: 1,
          cursor: disabled ? 'default' : 'pointer',
          transition: 'border-color 0.12s, background-color 0.12s',
          ...(open && {
            borderColor: theme.palette.dasPrimary.primary,
            bgcolor: '#FFFFFF',
          }),
          '& .edit-pencil': { opacity: 0, transition: 'opacity 0.12s' },
          '&:hover': disabled
            ? undefined
            : {
                '& .edit-pencil': { opacity: 1 },
              },
        }}
      >
        {isMissingEmpty ? (
          <WarningAmberRoundedIcon
            sx={{
              fontSize: 18,
              color: theme.palette.dasRed.dark01,
            }}
          />
        ) : hasAmbiguity ? (
          <>
            <WarningAmberRoundedIcon
              sx={{
                fontSize: 16,
                color: theme.palette.dasRed.dark01,
                flexShrink: 0,
              }}
            />
            <Box
              component="span"
              sx={{
                flex: 1,
                minWidth: 0,
                fontSize: 13,
                color: theme.palette.dasRed.dark01,
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {value}
            </Box>
          </>
        ) : (
          <Box
            component="span"
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: 13,
              color: theme.palette.dasDark.dark01,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {value}
          </Box>
        )}
        {!disabled && (
          <EditOutlinedIcon
            className="edit-pencil"
            sx={{
              fontSize: 14,
              color: theme.palette.dasGrey.grey02,
              flexShrink: 0,
            }}
          />
        )}
      </Box>
  );

  return (
    <>
      {/* 永遠用 Tooltip 包住,以維持 DOM tree 穩定;空 title 時 MUI 不顯示 tooltip,
          避免條件式包裝導致 anchorRef 在開啟 popover 時 reset 到 null */}
      <Tooltip title={tooltipMessage ?? ''} arrow placement="top">
        {cell}
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              p: 1.25,
              borderRadius: 2,
              boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
              minWidth: 260,
              maxWidth: 320,
            },
          },
        }}
      >
        {hasAmbiguity && (
          <>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: theme.palette.dasRed.dark01,
                fontSize: 11,
                fontWeight: 600,
                mb: 0.75,
              }}
            >
              <HelpOutlineRoundedIcon sx={{ fontSize: 13 }} />
              客戶不存在於系統,請選一個相近的
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
              {candidates!.map((c) => {
                const active = c === value;
                return (
                  <Box
                    key={c}
                    role="button"
                    onClick={() => {
                      onPickCandidate?.(c);
                      setOpen(false);
                    }}
                    sx={{
                      px: 1.25,
                      height: 28,
                      borderRadius: '999px',
                      border: `1px solid ${active ? theme.palette.dasPrimary.primary : theme.palette.dasGrey.grey03}`,
                      bgcolor: active
                        ? theme.palette.dasPrimary.lite04
                        : '#FFFFFF',
                      color: active
                        ? theme.palette.dasPrimary.dark01
                        : theme.palette.dasDark.dark01,
                      fontSize: 12.5,
                      fontWeight: active ? 600 : 500,
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: theme.palette.dasPrimary.primary,
                        bgcolor: theme.palette.dasPrimary.lite03,
                      },
                    }}
                  >
                    {c}
                  </Box>
                );
              })}
            </Box>
            <Box
              sx={{
                borderTop: `1px solid ${theme.palette.dasGrey.grey05}`,
                my: 0.5,
              }}
            />
          </>
        )}
        <Box
          sx={{
            fontSize: 11,
            fontWeight: 600,
            color: theme.palette.dasGrey.grey01,
            mb: 0.5,
            ml: 0.5,
          }}
        >
          系統客戶
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {SYSTEM_CUSTOMERS.map((c) => (
            <Box
              key={c}
              role="button"
              onClick={() => {
                onCommit(c);
                onEscapeAmbiguity?.();
                setOpen(false);
              }}
              sx={{
                px: 1,
                py: 0.75,
                fontSize: 13,
                borderRadius: 1,
                cursor: 'pointer',
                color: theme.palette.dasDark.dark01,
                '&:hover': {
                  bgcolor: theme.palette.dasPrimary.lite04,
                },
              }}
            >
              {c}
            </Box>
          ))}
        </Box>
        {hasAmbiguity && (
          <Box
            role="button"
            onClick={() => {
              onEscapeAmbiguity?.();
              setOpen(false);
            }}
            sx={{
              mt: 0.75,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.4,
              px: 1,
              py: 0.5,
              fontSize: 11.5,
              color: theme.palette.dasGrey.grey01,
              cursor: 'pointer',
              borderRadius: 1,
              '&:hover': {
                color: theme.palette.dasPrimary.primary,
                bgcolor: theme.palette.dasPrimary.lite04,
              },
            }}
          >
            <EditOutlinedIcon sx={{ fontSize: 13 }} />
            都不是,我來輸入
          </Box>
        )}
      </Popover>
    </>
  );
}

// ─── Ambiguous cell(其他欄位的歧義候選 popover)────────────
function AmbiguousCell({
  value,
  candidates,
  onPickCandidate,
  onEscapeAmbiguity,
  corrected,
  theme,
  ambiguousMessage,
}: FieldCellProps & {
  candidates: string[];
  ambiguousMessage?: string;
}) {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const tooltipMessage = open
    ? undefined
    : (ambiguousMessage ?? '此欄位不存在於系統中');

  const cell = (
    <Box
      ref={anchorRef}
      onClick={() => setOpen(true)}
      sx={{
        flex: 1,
        minWidth: 0,
        height: 32,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        borderRadius: 1,
        border: '1px solid transparent',
        cursor: 'pointer',
        transition: 'border-color 0.12s, background-color 0.12s',
        ...(open && {
          borderColor: theme.palette.dasPrimary.primary,
          bgcolor: '#FFFFFF',
        }),
        '& .edit-pencil': { opacity: 0, transition: 'opacity 0.12s' },
        '&:hover': {
          '& .edit-pencil': { opacity: 1 },
        },
      }}
    >
      <WarningAmberRoundedIcon
        sx={{
          fontSize: 16,
          color: theme.palette.dasRed.dark01,
          flexShrink: 0,
        }}
      />
      <Box
        component="span"
        sx={{
          flex: 1,
          minWidth: 0,
          fontSize: 13,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: theme.palette.dasRed.dark01,
          fontWeight: 500,
        }}
      >
        {value}
      </Box>
      <EditOutlinedIcon
        className="edit-pencil"
        sx={{
          fontSize: 14,
          color: theme.palette.dasGrey.grey02,
          flexShrink: 0,
        }}
      />
    </Box>
  );

  return (
    <>
      {/* 同 CustomerCell:永遠用 Tooltip 穩定 DOM,避免 anchorRef 在開 popover 時被 reset */}
      <Tooltip title={tooltipMessage ?? ''} arrow placement="top">
        {cell}
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              p: 1.5,
              borderRadius: 2,
              boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
              minWidth: 240,
            },
          },
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            color: theme.palette.dasRed.dark01,
            fontSize: 11,
            fontWeight: 600,
            mb: 1,
          }}
        >
          <HelpOutlineRoundedIcon sx={{ fontSize: 13 }} />
          不存在於系統,請選一個
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {candidates.map((c) => {
            const active = c === value;
            return (
              <Box
                key={c}
                role="button"
                onClick={() => {
                  onPickCandidate?.(c);
                  setOpen(false);
                }}
                sx={{
                  px: 1.25,
                  height: 28,
                  borderRadius: '999px',
                  border: `1px solid ${active ? theme.palette.dasPrimary.primary : theme.palette.dasGrey.grey03}`,
                  bgcolor: active
                    ? theme.palette.dasPrimary.lite04
                    : '#FFFFFF',
                  color: active
                    ? theme.palette.dasPrimary.dark01
                    : theme.palette.dasDark.dark01,
                  fontSize: 12.5,
                  fontWeight: active ? 600 : 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: theme.palette.dasPrimary.primary,
                    bgcolor: theme.palette.dasPrimary.lite03,
                  },
                }}
              >
                {c}
              </Box>
            );
          })}
        </Box>
        <Box
          role="button"
          onClick={() => {
            onEscapeAmbiguity?.();
            setOpen(false);
          }}
          sx={{
            mt: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.4,
            color: theme.palette.dasGrey.grey01,
            fontSize: 11.5,
            cursor: 'pointer',
            '&:hover': { color: theme.palette.dasPrimary.primary },
          }}
        >
          <EditOutlinedIcon sx={{ fontSize: 13 }} />
          都不是,我來輸入
        </Box>
      </Popover>
    </>
  );
}

// ─── Goods detail editable cell ────────────────────────────────
// 貨品明細第一筆的 inline edit:點擊進入編輯;有 error 時 ▲ + 紅字 + cell tooltip
function GoodsEditableCell({
  value,
  onCommit,
  theme,
  showError,
  errorMessage,
}: {
  value: string;
  onCommit: (v: string) => void;
  theme: Theme;
  showError: boolean;
  errorMessage?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    if (draft !== value) onCommit(draft);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <Tooltip
      title={showError && !editing ? errorMessage ?? '' : ''}
      arrow
      placement="top"
    >
      <Box
        onClick={() => !editing && setEditing(true)}
        sx={{
          minWidth: 0,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.75,
          borderRadius: 1,
          border: '1px solid transparent',
          cursor: editing ? 'text' : 'pointer',
          transition: 'border-color 0.12s, background-color 0.12s',
          ...(editing && {
            borderColor: theme.palette.dasPrimary.primary,
            bgcolor: '#FFFFFF',
          }),
          '& .edit-pencil': { opacity: 0, transition: 'opacity 0.12s' },
          '&:hover': editing
            ? undefined
            : {
                '& .edit-pencil': { opacity: 1 },
              },
        }}
      >
        {editing ? (
          <InputBase
            inputRef={inputRef}
            fullWidth
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') cancel();
            }}
            sx={{
              fontSize: 13,
              color: theme.palette.dasDark.dark01,
            }}
          />
        ) : (
          <>
            {showError && (
              <WarningAmberRoundedIcon
                sx={{
                  fontSize: 16,
                  color: theme.palette.dasRed.dark01,
                  flexShrink: 0,
                }}
              />
            )}
            <Box
              component="span"
              sx={{
                flex: 1,
                minWidth: 0,
                fontSize: 13,
                color: showError
                  ? theme.palette.dasRed.dark01
                  : value
                    ? theme.palette.dasDark.dark01
                    : theme.palette.dasGrey.grey02,
                fontWeight: showError ? 500 : 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {value || '-'}
            </Box>
            <EditOutlinedIcon
              className="edit-pencil"
              sx={{
                fontSize: 14,
                color: theme.palette.dasGrey.grey02,
                flexShrink: 0,
              }}
            />
          </>
        )}
      </Box>
    </Tooltip>
  );
}

// ─── Goods detail row(row 展開後顯示的貨品明細子表)──────────
// 第一筆貨品對應到 order.fields(itemName / itemNo / itemAccessory / itemQuantity)
// 可點擊編輯;第二筆只是 mock UI,維持唯讀。
const GOODS_FIELD_MAP: Record<string, FieldKey> = {
  name: 'itemName',
  no: 'itemNo',
  accessory: 'itemAccessory',
  quantity: 'itemQuantity',
};

function GoodsDetailRow({
  order,
  width,
  leadingOffset,
  theme,
  onUpdateField,
}: {
  order: OrderDraft;
  width: number;
  leadingOffset: number;
  theme: Theme;
  onUpdateField: (k: FieldKey, v: string) => void;
}) {
  const items = buildGoodsItems(order);
  const cols = [
    { key: 'name', label: '貨品名稱', flex: 1.4 },
    { key: 'no', label: '貨品編號', flex: 1.1 },
    { key: 'accessory', label: '配件', flex: 1.1 },
    { key: 'quantity', label: '單位數', flex: 0.7 },
  ];

  // 訂單本身有 extraErrors 含「貨品名稱」→ 第一筆貨品標 ▲ 紅字 + tooltip
  const goodsNameError = order.extraErrors?.find((e) => e.includes('貨品名稱'));

  return (
    <Box
      sx={{
        // 跟主表 row 一樣的伸縮邏輯:container 比 totalWidth 寬時撐滿,反之以 totalWidth 觸發橫向 scroll
        minWidth: width,
        width: '100%',
        bgcolor: theme.palette.dasGrey.grey06,
        borderBottom: `1px solid ${theme.palette.dasGrey.grey05}`,
        py: 1.5,
        pl: `${leadingOffset}px`,
        pr: 2,
        boxSizing: 'border-box',
      }}
    >
      <Box
        sx={{
          border: `1px solid ${theme.palette.dasGrey.grey04}`,
          borderRadius: 1.5,
          bgcolor: '#FFFFFF',
          p: 1.5,
        }}
      >
        <Box
          sx={{
            fontSize: 13,
            fontWeight: 600,
            color: theme.palette.dasDark.dark01,
            mb: 1,
          }}
        >
          貨品明細
        </Box>

        {/* header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.palette.dasGrey.grey05}`,
            py: 0.75,
          }}
        >
          {cols.map((c) => (
            <Box
              key={c.key}
              sx={{
                flex: c.flex,
                px: 1,
                fontSize: 12,
                fontWeight: 500,
                color: theme.palette.dasGrey.grey01,
              }}
            >
              {c.label}
            </Box>
          ))}
        </Box>

        {/* rows */}
        {items.map((item, idx) => {
          const isFirstRow = idx === 0;
          return (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                alignItems: 'center',
                borderBottom:
                  idx < items.length - 1
                    ? `1px solid ${theme.palette.dasGrey.grey05}`
                    : 'none',
                py: 0.5,
              }}
            >
              {cols.map((c) => {
                const isNameCol = c.key === 'name';
                const showError = isFirstRow && isNameCol && !!goodsNameError;
                const value = item[c.key as keyof typeof item] || '';
                // 只有第一筆對應到 order.fields,允許編輯;第二筆是 mock UI,維持唯讀
                if (isFirstRow) {
                  const fieldKey = GOODS_FIELD_MAP[c.key];
                  return (
                    <Box key={c.key} sx={{ flex: c.flex, px: 1, overflow: 'hidden' }}>
                      <GoodsEditableCell
                        value={value}
                        onCommit={(v) => onUpdateField(fieldKey, v)}
                        theme={theme}
                        showError={showError}
                        errorMessage={goodsNameError}
                      />
                    </Box>
                  );
                }
                return (
                  <Box
                    key={c.key}
                    sx={{
                      flex: c.flex,
                      px: 1,
                      fontSize: 13,
                      color: theme.palette.dasDark.dark01,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      component="span"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {value || '-'}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// Mock 貨品明細 — prototype 階段每張訂單顯示兩個品項(取自 order.fields + 預設第二筆)
function buildGoodsItems(order: OrderDraft) {
  const f = order.fields;
  return [
    {
      name: f.itemName || '五尺雙人床墊',
      no: f.itemNo || 'TJS-12293',
      accessory: f.itemAccessory || '枕頭一顆',
      quantity: f.itemQuantity || '1',
    },
    {
      name: '五尺雙人床墊',
      no: '',
      accessory: '',
      quantity: '1',
    },
  ];
}
