export type FieldKey =
  | 'businessType'
  | 'customerName'
  | 'temperatureLayer'
  | 'totalVolume'
  | 'totalWeight'
  // 貨品(prototype 階段為單一品項;多品項可後續擴 OrderDraft.items)
  | 'itemNo'
  | 'itemName'
  | 'itemQuantity'
  | 'itemAccessory'
  | 'itemDescription'
  // 寄件人
  | 'senderCompany'
  | 'senderName'
  | 'senderAddress'
  | 'senderPhone'
  | 'senderMobile'
  // 收件人
  | 'recipientCompany'
  | 'recipientName'
  | 'recipientAddress'
  | 'recipientPhone'
  | 'recipientMobile'
  // 配達 / 取貨時間
  | 'pickupDate'
  | 'pickupStartTime'
  | 'pickupEndTime'
  | 'deliveryDate'
  | 'deliveryStartTime'
  | 'deliveryEndTime'
  | 'deliveryTime'
  // 其他
  | 'geofence'
  | 'deliveryFee'
  | 'additionalFee'
  | 'cashOnDelivery'
  | 'note';

export type OrderDraft = {
  id: string;
  /** 訂單編號(OP 認知中的真實訂單號,可編輯) */
  orderNo: string;
  /** 動態欄位:解析到什麼欄位就有什麼欄位 */
  fields: Partial<Record<FieldKey, string>>;
  /** Renie 認為應該補但目前缺漏的欄位(顯示紅框) */
  missingFields?: FieldKey[];
  /** 含歧義的欄位 + 候選清單(例如客戶名 fuzzy match 出多個) */
  ambiguousFields?: Partial<Record<FieldKey, string[]>>;
  /**
   * Prototype 自訂的 validation errors(非缺漏 / 歧義,如「長度超過上限」、
   * 「重複訂單編號」)— 會出現在「待修正」alert 內
   */
  extraErrors?: string[];
  /**
   * Prototype 自訂的提醒(非強制,如「配達日為過去」、「同地址今日已建單」)
   * — 會出現在「提醒」alert 內
   */
  extraReminders?: string[];
  /** 最近一次由對話修正的欄位 + timestamp,用於觸發卡片 flash + 欄位標記 */
  recentlyCorrected?: { fields: FieldKey[]; at: number };
  committed?: boolean;
};

export type OrderArtifactViewMode = 'cards' | 'table';

/**
 * Pending batch update — 對話批改尚待用戶確認的更動。
 * 設定後 OrderTable 對應欄位會顯示綠色預覽值,直到用戶於 chat 點「套用 / 不套用」。
 *
 * targets 以「逐筆」為單位:批量(全部訂單)時 targets 展開成所有 pending 訂單的 index;
 * 個別修正(如「2 號客戶 大同公司」)時 targets 只含指定 index。
 */
export type PendingBatchUpdate = {
  /** 唯一 id,讓 chat 端的確認卡能對到正確的 pending(避免歷史卡誤觸) */
  batchId: string;
  targets: Array<{ orderIndex: number; field: FieldKey; value: string }>;
};

/**
 * 統一狀態機 — 兩個 mode、三個邏輯狀態:
 *   1. mode='gathering'                    純文字累積中,不渲染 UI
 *   2. mode='orders' + 有 missing           卡片 + 紅框,對話也可補(混合派)
 *   3. mode='orders' + 全齊                卡片乾淨,等 commit
 *
 * orders mode 可選 initialViewMode — 由 demo 入口透過 runSkill options 帶入,
 * 提供給 OrderArtifact 初始化 viewMode 用。
 */
export type CreateOrderArtifactData =
  | { mode: 'gathering'; collected: Partial<Record<FieldKey, string>> }
  | {
      mode: 'orders';
      orders: OrderDraft[];
      initialViewMode?: OrderArtifactViewMode;
      /** 對話批改後等待用戶確認的批量更動(顯示為綠色預覽) */
      pendingBatchUpdate?: PendingBatchUpdate;
    };
