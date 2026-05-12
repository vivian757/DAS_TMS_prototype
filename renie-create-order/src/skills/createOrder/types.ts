export type FieldKey =
  | 'businessType'
  | 'customerName'
  | 'recipientName'
  | 'recipientPhone'
  | 'recipientAddress'
  | 'itemDescription'
  | 'deliveryTime'
  | 'note';

export type OrderDraft = {
  id: string;
  /** 訂單編號(OP 認知中的真實訂單號,可編輯) */
  orderNo: string;
  /** 動態欄位:解析到什麼欄位就有什麼欄位 */
  fields: Partial<Record<FieldKey, string>>;
  /** Renie 認為應該補但目前缺漏的欄位(顯示橘框) */
  missingFields?: FieldKey[];
  committed?: boolean;
};

/**
 * 統一狀態機 — 兩個 mode、三個邏輯狀態:
 *   1. mode='gathering'                    純文字累積中,不渲染 UI
 *   2. mode='orders' + 有 missing           卡片 + 橘框,對話也可補(混合派)
 *   3. mode='orders' + 全齊                卡片乾淨,等 commit
 */
export type CreateOrderArtifactData =
  | { mode: 'gathering'; collected: Partial<Record<FieldKey, string>> }
  | { mode: 'orders'; orders: OrderDraft[] };
