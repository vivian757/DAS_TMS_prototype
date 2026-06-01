import {
  Box,
  Button,
  Link,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded';
import PlaylistAddOutlinedIcon from '@mui/icons-material/PlaylistAddOutlined';
import { useEffect, useRef, useState } from 'react';
import type { ArtifactRendererProps } from '../types';
import LoadingOverlay from '../../components/LoadingOverlay';
import ArtifactPill from '../../components/ArtifactPill';
import type {
  CreateOrderArtifactData,
  FieldKey,
  OrderDraft,
} from './types';
import OrderTable from './OrderTable';
import {
  APPLY_BATCH_EVENT,
  DISCARD_BATCH_EVENT,
  type BatchUpdateEventDetail,
} from './BatchUpdateConfirmCard';

/**
 * createOrder skill 的訂單列表 artifact(對齊設計稿):
 * - 標題「建立訂單」+ 右側「↪ 並排檢視」 / ✕ 關閉
 * - 內容只有單一 OrderTable(inline-editable)
 * - 底部「建立 N 張訂單」CTA
 * - 錯誤分類提示由 skill.run() 放進對話泡的 AlertBox 處理,這裡不再顯示
 */
export default function OrderArtifact({
  artifactId,
  store,
  onFollowUp,
  displayMode = 'inline',
  isPinned = false,
  isActive = false,
  isLoading = false,
  onTogglePin,
  onExitSideMode,
}: ArtifactRendererProps) {
  const theme = useTheme();
  const [expandAll, setExpandAll] = useState(false);
  const [committing, setCommitting] = useState(false);
  // 顯示 loading 覆蓋層的條件:
  //   - 本地 commit 進行中(點「新增」後的延遲)
  //   - 由 App 傳入的 isLoading(批改 / continueSession 進行中)
  const showLoading = committing || isLoading;
  const data = store.get<CreateOrderArtifactData>(artifactId);

  // onFollowUp 放進 ref,避免 useEffect 每次 parent re-render 都要重掛 listener
  const onFollowUpRef = useRef(onFollowUp);
  onFollowUpRef.current = onFollowUp;

  // 監聽 chat 確認卡發出的 apply / discard 事件 — 寫入或撤銷 pendingBatchUpdate
  useEffect(() => {
    const matchBatch = (e: Event): string | null => {
      const detail = (e as CustomEvent<BatchUpdateEventDetail>).detail;
      return detail?.batchId ?? null;
    };

    const handleApply = (e: Event) => {
      const batchId = matchBatch(e);
      if (!batchId) return;
      // 先確認 batchId 還對得上(避免歷史卡重複觸發),再進行寫入
      const current = store.get<CreateOrderArtifactData>(artifactId);
      if (
        !current ||
        current.mode !== 'orders' ||
        current.pendingBatchUpdate?.batchId !== batchId
      ) {
        return;
      }
      store.update<CreateOrderArtifactData>(artifactId, (prev) => {
        if (prev.mode !== 'orders') return prev;
        const pending = prev.pendingBatchUpdate;
        if (!pending || pending.batchId !== batchId) return prev;
        const correctedAt = Date.now();
        // 用 orderIndex 分組 — 一張訂單可能有多個欄位被改
        const targetsByOrder = new Map<
          number,
          Array<{ field: FieldKey; value: string }>
        >();
        for (const t of pending.targets) {
          const arr = targetsByOrder.get(t.orderIndex) ?? [];
          arr.push({ field: t.field, value: t.value });
          targetsByOrder.set(t.orderIndex, arr);
        }
        return {
          ...prev,
          pendingBatchUpdate: undefined,
          orders: prev.orders.map((o, idx) => {
            const targets = targetsByOrder.get(idx);
            if (!targets || o.committed) return o;
            const newFields = { ...o.fields };
            let newMissing = o.missingFields ?? [];
            const newAmbiguous = { ...(o.ambiguousFields ?? {}) };
            const correctedFields: FieldKey[] = [];
            for (const { field, value } of targets) {
              newFields[field] = value;
              newMissing = newMissing.filter((f) => f !== field);
              delete newAmbiguous[field];
              correctedFields.push(field);
            }
            return {
              ...o,
              fields: newFields,
              missingFields: newMissing,
              ambiguousFields:
                Object.keys(newAmbiguous).length > 0
                  ? newAmbiguous
                  : undefined,
              recentlyCorrected: { fields: correctedFields, at: correctedAt },
            };
          }),
        };
      });
      // 修正套用成功後 — AI 在 chat 補一句確認文字
      onFollowUpRef.current?.(
        '修正完成!請確認以下資訊,再點擊「新增」送出訂單資料',
      );
    };

    const handleDiscard = (e: Event) => {
      const batchId = matchBatch(e);
      if (!batchId) return;
      store.update<CreateOrderArtifactData>(artifactId, (prev) => {
        if (prev.mode !== 'orders') return prev;
        if (prev.pendingBatchUpdate?.batchId !== batchId) return prev;
        return { ...prev, pendingBatchUpdate: undefined };
      });
    };

    window.addEventListener(APPLY_BATCH_EVENT, handleApply);
    window.addEventListener(DISCARD_BATCH_EVENT, handleDiscard);
    return () => {
      window.removeEventListener(APPLY_BATCH_EVENT, handleApply);
      window.removeEventListener(DISCARD_BATCH_EVENT, handleDiscard);
    };
  }, [store, artifactId]);

  if (!data || data.mode !== 'orders') return null;
  const { orders, pendingBatchUpdate } = data;
  // 「取消」會清空 orders;空陣列時不渲染 artifact
  if (orders.length === 0) return null;
  const pending = orders.filter((o) => !o.committed);
  const allCommitted = pending.length === 0;
  // 仍有錯誤(必填缺漏 / 客戶歧義 / 其他 validation)未解決時,禁用「新增」按鈕
  const hasUnresolvedErrors = pending.some(
    (o) =>
      (o.missingFields?.length ?? 0) > 0 ||
      Object.keys(o.ambiguousFields ?? {}).length > 0 ||
      (o.extraErrors?.length ?? 0) > 0,
  );

  const updateOrderNo = (orderId: string, orderNo: string) => {
    store.update<CreateOrderArtifactData>(artifactId, (prev) => {
      if (prev.mode !== 'orders') return prev;
      return {
        mode: 'orders',
        orders: prev.orders.map((o) =>
          o.id === orderId ? { ...o, orderNo } : o,
        ),
      };
    });
  };

  const updateField = (orderId: string, key: FieldKey, value: string) => {
    store.update<CreateOrderArtifactData>(artifactId, (prev) => {
      if (prev.mode !== 'orders') return prev;
      return {
        mode: 'orders',
        orders: prev.orders.map((o) =>
          o.id === orderId ? applyFieldUpdate(o, key, value) : o,
        ),
      };
    });
  };

  const resolveAmbiguity = (
    orderId: string,
    key: FieldKey,
    chosen: string | null,
  ) => {
    store.update<CreateOrderArtifactData>(artifactId, (prev) => {
      if (prev.mode !== 'orders') return prev;
      return {
        mode: 'orders',
        orders: prev.orders.map((o) => {
          if (o.id !== orderId) return o;
          const nextAmbiguous = { ...(o.ambiguousFields ?? {}) };
          delete nextAmbiguous[key];
          const next: OrderDraft = {
            ...o,
            fields: chosen ? { ...o.fields, [key]: chosen } : o.fields,
            ambiguousFields:
              Object.keys(nextAmbiguous).length > 0 ? nextAmbiguous : undefined,
          };
          return next;
        }),
      };
    });
  };

  const removeOrder = (orderId: string) => {
    let removedIdx = -1;
    let removedOrderNo = '';
    store.update<CreateOrderArtifactData>(artifactId, (prev) => {
      if (prev.mode !== 'orders') return prev;
      removedIdx = prev.orders.findIndex((o) => o.id === orderId);
      removedOrderNo = prev.orders[removedIdx]?.orderNo ?? '';
      return {
        mode: 'orders',
        orders: prev.orders.filter((o) => o.id !== orderId),
      };
    });
    if (removedIdx >= 0) {
      onFollowUp?.(
        `好的,已從這批移除 #${removedIdx + 1} 訂單${removedOrderNo ? `(${removedOrderNo})` : ''}`,
      );
    }
  };

  const commitAll = () => {
    setCommitting(true);
    // 顯示 loading 覆蓋層約 3 秒,模擬 ai 後端寫入
    setTimeout(() => {
      const newlyCommitted: string[] = [];
      store.update<CreateOrderArtifactData>(artifactId, (prev) => {
        if (prev.mode !== 'orders') return prev;
        return {
          mode: 'orders',
          orders: prev.orders.map((o) => {
            if (o.committed) return o;
            newlyCommitted.push(o.orderNo);
            return { ...o, committed: true };
          }),
        };
      });
      setCommitting(false);
      if (isPinned && onTogglePin) onTogglePin();
      setTimeout(() => {
        onFollowUp?.(buildSuccessMessage(newlyCommitted, theme));
      }, 200);
    }, 3000);
  };

  const cancelAll = () => {
    const cancelledCount = pending.length;
    store.update<CreateOrderArtifactData>(artifactId, () => ({
      mode: 'orders',
      orders: [],
    }));
    if (isPinned && onTogglePin) onTogglePin();
    setTimeout(() => {
      onFollowUp?.(`已取消本次新增 ${cancelledCount} 張訂單的操作`);
    }, 200);
  };

  const isPanel = displayMode === 'panel';

  // Inline + 並排模式 → 替換成 pill(active = 預覽中、其他 = 可切換)
  if (displayMode === 'inline' && isPinned) {
    return (
      <ArtifactPill
        icon={PlaylistAddOutlinedIcon}
        label={`新增訂單 (${orders.length})`}
        isActive={isActive}
        onClick={onTogglePin}
      />
    );
  }

  return (
    <Box
      sx={{
        bgcolor: '#FFFFFF',
        border: `1px solid ${theme.palette.dasGrey.grey04}`,
        borderRadius: 2.5,
        boxShadow: '0px 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        display: isPanel ? 'flex' : 'block',
        flexDirection: isPanel ? 'column' : undefined,
        flex: isPanel ? 1 : undefined,
        position: 'relative',
      }}
    >
      <LoadingOverlay show={showLoading} />
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          borderBottom: `1px solid ${theme.palette.dasGrey.grey04}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography
          variant="h5Bold"
          sx={{ color: theme.palette.dasDark.dark01 }}
        >
          新增訂單 ({orders.length})
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Link
            component="button"
            onClick={() => setExpandAll((v) => !v)}
            underline="hover"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              color: theme.palette.dasPrimary.primary,
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <UnfoldMoreRoundedIcon sx={{ fontSize: 18 }} />
            {expandAll ? '收合明細' : '展開明細'}
          </Link>

          {displayMode === 'inline' && onTogglePin && orders.length >= 2 && (
            <Link
              component="button"
              onClick={onTogglePin}
              underline="hover"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: theme.palette.dasPrimary.primary,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <ArrowOutwardRoundedIcon sx={{ fontSize: 16 }} />
              並排檢視
            </Link>
          )}

          {isPanel && (onExitSideMode || onTogglePin) && (
            <Tooltip title="退出並排檢視" arrow>
              <Box
                role="button"
                onClick={onExitSideMode ?? onTogglePin}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: theme.palette.dasPrimary.primary,
                  '&:hover': {
                    bgcolor: theme.palette.dasPrimary.lite04,
                  },
                }}
              >
                <CloseRoundedIcon sx={{ fontSize: 20 }} />
              </Box>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Box
        sx={
          isPanel
            ? { flex: 1, minHeight: 0, overflow: 'auto' }
            : { maxHeight: 480, overflow: 'auto' }
        }
      >
        <OrderTable
          orders={orders}
          onUpdateOrderNo={updateOrderNo}
          onUpdateField={updateField}
          onResolveAmbiguity={resolveAmbiguity}
          onRemove={removeOrder}
          compact={!isPanel}
          expandAll={expandAll}
          pendingBatchUpdate={pendingBatchUpdate}
        />
      </Box>

      {!allCommitted && (
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            borderTop: `1px solid ${theme.palette.dasGrey.grey04}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1,
          }}
        >
          <Button
            variant="outlined"
            onClick={cancelAll}
            sx={{
              minWidth: 120,
              color: theme.palette.dasDark.dark02,
              borderColor: theme.palette.dasGrey.grey03,
              '&:hover': {
                borderColor: theme.palette.dasGrey.grey02,
                bgcolor: theme.palette.dasGrey.grey06,
              },
            }}
          >
            取消
          </Button>
          <Tooltip
            title={hasUnresolvedErrors ? '請先修正所有錯誤後再送出' : ''}
            arrow
            placement="top"
            disableHoverListener={!hasUnresolvedErrors}
          >
            <span>
              <Button
                variant="contained"
                onClick={commitAll}
                disabled={hasUnresolvedErrors}
                sx={{ minWidth: 120 }}
              >
                新增
              </Button>
            </span>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}

/** 寫入欄位時,如果該欄位原本在 missingFields 裡,有值就移除標記 */
function applyFieldUpdate(
  order: OrderDraft,
  key: FieldKey,
  value: string,
): OrderDraft {
  const fields = { ...order.fields, [key]: value };
  let missingFields = order.missingFields;
  if (missingFields && missingFields.includes(key) && value.trim() !== '') {
    missingFields = missingFields.filter((f) => f !== key);
  }
  // Prototype:編輯 itemName 後若長度符合,清掉「貨品名稱」相關的 extraError
  let extraErrors = order.extraErrors;
  if (key === 'itemName' && extraErrors && value.trim().length <= 512) {
    const filtered = extraErrors.filter((e) => !e.includes('貨品名稱'));
    if (filtered.length !== extraErrors.length) {
      extraErrors = filtered.length > 0 ? filtered : undefined;
    }
  }
  return { ...order, fields, missingFields, extraErrors };
}

/** 建立完成後的明確反饋訊息:✓ + 訂單管理 link */
function buildSuccessMessage(orderNos: string[], theme: Theme) {
  const linkSx = {
    color: theme.palette.dasPrimary.primary,
    textDecoration: 'underline',
    fontWeight: 500,
    cursor: 'pointer',
  } as const;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.25,
        fontSize: 14,
        lineHeight: '22px',
        color: theme.palette.dasDark.dark01,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <CheckCircleRoundedIcon
          sx={{ fontSize: 18, color: theme.palette.dasGreen.dark03 }}
        />
        <Box component="span" sx={{ fontWeight: 500 }}>
          已成功建立 {orderNos.length} 張訂單
        </Box>
      </Box>

      <Box>
        您可至
        <Link
          href="#"
          onClick={(e) => e.preventDefault()}
          sx={{ ...linkSx, mx: 0.25 }}
        >
          訂單管理
        </Link>
        查閱完整資料。
      </Box>
    </Box>
  );
}
