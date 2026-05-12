import type { FieldKey, OrderDraft } from './types';

export const SAMPLE_INPUT_FULL = `今天訂單：
1. 家具店 台北市中正區思源街 18 號
2. 永豐物流 02-2345-6789 新北市板橋區文化路一段 5 號
3. 大同公司（取貨）台中市西屯區工業區一路 200 號 零件 3 箱 17:00 前
4. 立信實業 陳志強 0912-345-678 高雄市前鎮區成功二路 88 號
5. 信實貿易（取貨）桃園市中壢區中華路二段 99 號 文件 2 件 易碎品請小心`;

/** Demo:必填欄位有缺漏 — #2 缺客戶、#4 缺收件人地址 */
export const SAMPLE_INPUT_PARTIAL = `今天訂單（部分缺資料,請幫我填補）：
1. 家具店 台北市中正區思源街 18 號
2. 02-2345-6789 新北市板橋區文化路一段 5 號（客戶待補）
3. 大同公司（取貨）台中市西屯區工業區一路 200 號 零件 3 箱
4. 立信實業 陳志強 0912-345-678（地址待補）
5. 信實貿易（取貨）桃園市中壢區中華路二段 99 號 文件 2 件`;

/** Demo:資訊極簡 — 不夠 parse 成單,Renie 會純文字追問 */
export const SAMPLE_INPUT_MINIMAL = `幫我建一張新訂單`;

let batchCounter = 0;
let artifactCounter = 0;

export function generateArtifactId(): string {
  artifactCounter += 1;
  return `create-order-${artifactCounter}`;
}

function newBatchId(): string {
  batchCounter += 1;
  return `batch-${batchCounter}`;
}

/**
 * 訂單建立的最少必填欄位。
 * businessType 雖然列入但有 defaultValue,實際 gathering 收齊判斷只看 customer + address。
 */
export const MINIMAL_REQUIRED_FIELDS: FieldKey[] = [
  'businessType',
  'customerName',
  'recipientAddress',
];

/** Gathering 階段「必須由 OP 提供」的欄位(business type 不在內,因為有 default) */
export const MUST_COLLECT_FIELDS: FieldKey[] = [
  'customerName',
  'recipientAddress',
];

export function parseOrdersFromTextFull(_rawText: string): OrderDraft[] {
  const batchId = newBatchId();
  return [
    {
      id: `${batchId}-1`,
      orderNo: 'TJIE34981',
      fields: {
        businessType: '送',
        customerName: '家具店',
        recipientAddress: '台北市中正區思源街 18 號',
      },
    },
    {
      id: `${batchId}-2`,
      orderNo: 'TJIE34982',
      fields: {
        businessType: '送',
        customerName: '永豐物流',
        recipientPhone: '02-2345-6789',
        recipientAddress: '新北市板橋區文化路一段 5 號',
      },
    },
    {
      id: `${batchId}-3`,
      orderNo: 'TJIE34983',
      fields: {
        businessType: '取',
        customerName: '大同公司',
        recipientAddress: '台中市西屯區工業區一路 200 號',
        itemDescription: '零件 3 箱',
        deliveryTime: '今日 17:00 前',
      },
    },
    {
      id: `${batchId}-4`,
      orderNo: 'TJIE34984',
      fields: {
        businessType: '送',
        customerName: '立信實業',
        recipientName: '陳志強',
        recipientPhone: '0912-345-678',
        recipientAddress: '高雄市前鎮區成功二路 88 號',
      },
    },
    {
      id: `${batchId}-5`,
      orderNo: 'TJIE34985',
      fields: {
        businessType: '取',
        customerName: '信實貿易',
        recipientAddress: '桃園市中壢區中華路二段 99 號',
        itemDescription: '文件 2 件',
        note: '易碎品請小心',
      },
    },
  ];
}

/** Partial 樣本:#2 缺客戶、#4 缺收件人地址 — 屬於必填欄位缺漏的情境 */
export function parseOrdersFromTextPartial(_rawText: string): OrderDraft[] {
  const batchId = newBatchId();
  return [
    {
      id: `${batchId}-1`,
      orderNo: 'TJIE34981',
      fields: {
        businessType: '送',
        customerName: '家具店',
        recipientAddress: '台北市中正區思源街 18 號',
      },
    },
    {
      id: `${batchId}-2`,
      orderNo: 'TJIE34982',
      fields: {
        businessType: '送',
        recipientPhone: '02-2345-6789',
        recipientAddress: '新北市板橋區文化路一段 5 號',
      },
      missingFields: ['customerName'],
    },
    {
      id: `${batchId}-3`,
      orderNo: 'TJIE34983',
      fields: {
        businessType: '取',
        customerName: '大同公司',
        recipientAddress: '台中市西屯區工業區一路 200 號',
        itemDescription: '零件 3 箱',
      },
    },
    {
      id: `${batchId}-4`,
      orderNo: 'TJIE34984',
      fields: {
        businessType: '送',
        customerName: '立信實業',
        recipientName: '陳志強',
        recipientPhone: '0912-345-678',
      },
      missingFields: ['recipientAddress'],
    },
    {
      id: `${batchId}-5`,
      orderNo: 'TJIE34985',
      fields: {
        businessType: '取',
        customerName: '信實貿易',
        recipientAddress: '桃園市中壢區中華路二段 99 號',
        itemDescription: '文件 2 件',
      },
    },
  ];
}

/** Gathering 收齊後,把 collected 包成單張訂單 */
export function ordersFromCollected(
  collected: Partial<Record<FieldKey, string>>,
): OrderDraft[] {
  const batchId = newBatchId();
  return [
    {
      id: `${batchId}-1`,
      orderNo: `TJIE${34985 + batchCounter}`,
      fields: { ...collected },
    },
  ];
}
