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
  recipientName: { label: '收件人' },
  recipientPhone: { label: '收件人電話' },
  recipientAddress: { label: '收件人地址', fullWidth: true },
  itemDescription: { label: '品項', fullWidth: true },
  deliveryTime: { label: '預計配達日與時間', fullWidth: true },
  note: { label: '備註', fullWidth: true },
};

/** 卡片上欄位的固定渲染順序(出現的才會顯示) */
export const FIELD_ORDER: FieldKey[] = [
  'businessType',
  'customerName',
  'recipientName',
  'recipientPhone',
  'recipientAddress',
  'itemDescription',
  'deliveryTime',
  'note',
];
