import { Box, Button, Typography, useTheme } from '@mui/material';
import type { ArtifactRendererProps } from '../types';
import type {
  CreateOrderArtifactData,
  FieldKey,
  OrderDraft,
} from './types';
import OrderCard from './OrderCard';

/**
 * createOrder skill 的訂單卡列表 artifact。
 * Gathering mode 不在這裡渲染(走純文字對話),App 透過 shouldRenderArtifact 過濾掉。
 */
export default function OrderArtifact({
  artifactId,
  store,
  onFollowUp,
}: ArtifactRendererProps) {
  const theme = useTheme();
  const data = store.get<CreateOrderArtifactData>(artifactId);
  if (!data || data.mode !== 'orders') return null;
  const { orders } = data;
  const pending = orders.filter((o) => !o.committed);
  const committedCount = orders.length - pending.length;
  const allCommitted = pending.length === 0;

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

  const commitAll = () => {
    let committed = 0;
    store.update<CreateOrderArtifactData>(artifactId, (prev) => {
      if (prev.mode !== 'orders') return prev;
      return {
        mode: 'orders',
        orders: prev.orders.map((o) => {
          if (o.committed) return o;
          committed += 1;
          return { ...o, committed: true };
        }),
      };
    });
    setTimeout(() => {
      onFollowUp?.(
        `已成功建立 ${committed} 張訂單,可至訂單列表查閱。是否需要其他協助?`,
      );
    }, 200);
  };

  const cancelBatch = () => {
    store.update<CreateOrderArtifactData>(artifactId, (prev) => {
      if (prev.mode !== 'orders') return prev;
      return {
        mode: 'orders',
        orders: prev.orders.filter((o) => o.committed),
      };
    });
    onFollowUp?.('已取消這批訂單。是否需要其他協助?');
  };

  return (
    <Box
      sx={{
        bgcolor: '#FFFFFF',
        border: `1px solid ${theme.palette.dasGrey.grey04}`,
        borderRadius: 3,
        boxShadow: '0px 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          bgcolor: theme.palette.dasGrey.grey06,
          borderBottom: `1px solid ${theme.palette.dasGrey.grey04}`,
        }}
      >
        <Typography
          variant="h5Bold"
          sx={{ color: theme.palette.dasDark.dark01 }}
        >
          訂單預覽 ({orders.length} 張
          {committedCount > 0 && (
            <Typography
              component="span"
              sx={{
                fontSize: 14,
                color: theme.palette.dasGreen.dark03,
                ml: 0.5,
              }}
            >
              · 已建立 {committedCount}
            </Typography>
          )}
          )
        </Typography>
      </Box>

      <Box
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
          maxHeight: 560,
          overflowY: 'auto',
        }}
      >
        {orders.map((o, idx) => (
          <OrderCard
            key={o.id}
            order={o}
            index={idx}
            onUpdateOrderNo={(orderNo) => updateOrderNo(o.id, orderNo)}
            onUpdateField={(k, v) => updateField(o.id, k, v)}
          />
        ))}
      </Box>

      {!allCommitted && (
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            borderTop: `1px solid ${theme.palette.dasGrey.grey04}`,
            bgcolor: theme.palette.dasGrey.grey06,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 1,
          }}
        >
          <Button
            variant="outlined"
            color="inherit"
            onClick={cancelBatch}
            sx={{
              minWidth: 100,
              borderColor: theme.palette.dasGrey.grey03,
              color: theme.palette.dasDark.dark02,
            }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            onClick={commitAll}
            sx={{ minWidth: 168 }}
          >
            建立 {pending.length} 張訂單
          </Button>
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
  return { ...order, fields, missingFields };
}
