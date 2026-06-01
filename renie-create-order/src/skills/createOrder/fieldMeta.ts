import type { FieldKey } from './types';

export type FieldMeta = {
  label: string;
  /** 是否獨佔一行(地址、品項、備註等較長的內容) */
  fullWidth?: boolean;
  /** 解析不到時的預設值(會由 Renie 主動填入) */
  defaultValue?: string;
};

export const FIELD_META: Record<FieldKey, FieldMeta> = {
  businessType: { label: '業務類型', defaultValue: '送' },
  customerName: { label: '客戶' },
  temperatureLayer: { label: '溫層', defaultValue: '常溫' },
  totalVolume: { label: '總材積(cuft)' },
  totalWeight: { label: '總重量' },
  itemNo: { label: '貨品編號' },
  itemName: { label: '貨品名稱' },
  itemQuantity: { label: '貨品數量' },
  itemAccessory: { label: '配件' },
  itemDescription: { label: '品項', fullWidth: true },
  senderCompany: { label: '寄件人公司' },
  senderName: { label: '寄件人姓名' },
  senderAddress: { label: '寄件人地址', fullWidth: true },
  senderPhone: { label: '寄件人電話' },
  senderMobile: { label: '寄件人手機號碼' },
  recipientCompany: { label: '收件人公司' },
  recipientName: { label: '收件人姓名' },
  recipientAddress: { label: '收件人地址', fullWidth: true },
  recipientPhone: { label: '收件人電話' },
  recipientMobile: { label: '收件人手機號碼' },
  pickupDate: { label: '預計取貨日' },
  pickupStartTime: { label: '預計取貨開始時間' },
  pickupEndTime: { label: '預計取貨結束時間' },
  deliveryDate: { label: '預計配達日' },
  deliveryStartTime: { label: '預計配達開始時間' },
  deliveryEndTime: { label: '預計配達結束時間' },
  deliveryTime: { label: '預計配達日與時間', fullWidth: true },
  geofence: { label: '電子圍籬' },
  deliveryFee: { label: '運費' },
  additionalFee: { label: '附加費' },
  cashOnDelivery: { label: '代收款' },
  note: { label: '訂單備註', fullWidth: true },
};

/** 卡片上欄位的固定渲染順序(出現的才會顯示) */
export const FIELD_ORDER: FieldKey[] = [
  'businessType',
  'customerName',
  'temperatureLayer',
  'senderAddress',
  'recipientName',
  'recipientPhone',
  'recipientAddress',
  'itemDescription',
  'deliveryTime',
  'note',
];

/** 表格展開時的完整欄位順序 — 對應極大值情境 */
export const TABLE_FULL_COLUMNS: FieldKey[] = [
  'businessType',
  'customerName',
  'temperatureLayer',
  'totalVolume',
  'totalWeight',
  'itemNo',
  'itemName',
  'itemQuantity',
  'itemAccessory',
  'senderCompany',
  'senderName',
  'senderAddress',
  'senderPhone',
  'senderMobile',
  'recipientCompany',
  'recipientName',
  'recipientAddress',
  'recipientPhone',
  'recipientMobile',
  'pickupDate',
  'pickupStartTime',
  'pickupEndTime',
  'deliveryDate',
  'deliveryStartTime',
  'deliveryEndTime',
  'geofence',
  'note',
];

/** 必填欄位(欄位 label 旁顯示紅色 *) */
export const REQUIRED_FIELDS: FieldKey[] = [
  'businessType',
  'customerName',
  'recipientAddress',
];
