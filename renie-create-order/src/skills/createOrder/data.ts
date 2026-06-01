import type { TemplateOrderBlock } from './parseInput';
import type { FieldKey, OrderDraft } from './types';

export const SAMPLE_INPUT_FULL = `今天訂單：
1. 家具店 台北市中正區思源街 18 號
2. 永豐物流 02-2345-6789 新北市板橋區文化路一段 5 號
3. 大同公司（取貨）台中市西屯區工業區一路 200 號 零件 3 箱 17:00 前
4. 立信實業 陳志強 0912-345-678 高雄市前鎮區成功二路 88 號
5. 信實貿易（取貨）桃園市中壢區中華路二段 99 號 文件 2 件 易碎品請小心`;

/** Demo:資料完整且無歧義 — 預設會直接進「表格」檢視 */
export const SAMPLE_INPUT_CLEAN = `今天訂單（全部資料完整）：
1. 家具王 王經理 0912-111-222 台北市中正區思源街 18 號 紙箱 5 件
2. 永豐物流 林先生 02-2345-6789 新北市板橋區文化路一段 5 號 棧板 5 個
3. 信實貿易 張小姐 0922-111-222 桃園市中壢區中華路二段 99 號 文件 2 件`;

/** Demo:必填欄位有缺漏 — 10 張訂單,其中 #1 缺客戶 + 貨品名稱超長、#3 訂單編號重複、#5 客戶歧義 + 預計配達日為過去 */
export const SAMPLE_INPUT_PARTIAL = `今天訂單（部分缺資料,請幫我填補）：
1. 家具店 台北市中正區思源街 18 號
2. 02-2345-6789 新北市板橋區文化路一段 5 號（客戶待補）
3. 大同公司（取貨）台中市西屯區工業區一路 200 號 零件 3 箱
4. 立信實業 陳志強 0912-345-678（地址待補）
5. 信實貿易（取貨）桃園市中壢區中華路二段 99 號 文件 2 件
6. 家具王 王經理 0912-111-222 台北市中正區思源街 18 號 紙箱 5 件
7. 永豐物流 林先生 02-2345-6789 新北市板橋區文化路一段 5 號 棧板 5 個
8. 信實貿易 張小姐 0922-111-222 桃園市中壢區中華路二段 99 號 文件 2 件
9. 立信實業 陳志強 0912-345-678 高雄市前鎮區成功二路 88 號
10. 大同公司 林先生 0918-555-888 台中市西屯區工業區一路 200 號 零件 3 箱`;

/** Demo:資訊極簡 — 不夠 parse 成單,Renie 會純文字追問 */
export const SAMPLE_INPUT_MINIMAL = `幫我建一張新訂單`;

/** Demo:ai 指令範本 — 送出短指令「幫我新增訂單」,Renie 用範本格式回覆 */
export const SAMPLE_INPUT_AI_TEMPLATE = `幫我新增訂單`;

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

/** 極大值欄位的 mock 預設 — 對應完整訂單形狀(寄件人 / 貨品 / 取貨配達時間…) */
const MOCK_FULL_DEFAULTS: Partial<Record<FieldKey, string>> = {
  totalVolume: '25.4',
  totalWeight: '23',
  deliveryFee: '1,300',
  additionalFee: '搬運費',
  cashOnDelivery: '3,000',
  itemNo: 'TJS-12293',
  itemName: '五尺雙人床墊',
  itemQuantity: '1',
  itemAccessory: '枕頭一顆',
  senderCompany: '寄件人公司',
  senderName: '陳初一',
  senderPhone: '0222562345',
  senderMobile: '(+886)929814776',
  senderAddress: '台北市中正區思源街 18 號',
  recipientCompany: '大同公司',
  recipientName: '陳花椒',
  recipientPhone: '0222562345',
  recipientMobile: '(+886)929814776',
  pickupDate: '2024/04/12',
  pickupStartTime: '2024/04/12 15:00',
  pickupEndTime: '2024/04/12 15:00',
  deliveryDate: '2024/04/12',
  deliveryStartTime: '2024/04/12 15:00',
  deliveryEndTime: '2024/04/12 15:00',
  geofence: '-',
};

/** 套用 mock 預設值,但 order 自己提供的欄位優先 */
function applyMockDefaults(orders: OrderDraft[]): OrderDraft[] {
  return orders.map((o) => ({
    ...o,
    fields: { ...MOCK_FULL_DEFAULTS, ...o.fields },
  }));
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
  return applyMockDefaults([
    {
      id: `${batchId}-1`,
      orderNo: 'TJIE34981',
      fields: {
        businessType: '送',
        customerName: '家具店',
        temperatureLayer: '常溫',
        recipientAddress: '台北市中正區思源街 18 號',
        senderAddress: '台北市信義區松仁路 100 號',
      },
    },
    {
      id: `${batchId}-2`,
      orderNo: 'TJIE34982',
      fields: {
        businessType: '送',
        customerName: '永豐物流',
        temperatureLayer: '常溫',
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
        temperatureLayer: '常溫',
        recipientAddress: '台中市西屯區工業區一路 200 號',
        itemDescription: '零件 3 箱',
        deliveryTime: '2026/05/11 17:00',
      },
      ambiguousFields: {
        customerName: ['大同公司', '大同電器', '大同物流'],
      },
    },
    {
      id: `${batchId}-4`,
      orderNo: 'TJIE34984',
      fields: {
        businessType: '送',
        customerName: '立信實業',
        temperatureLayer: '常溫',
        recipientName: '陳志強',
        recipientPhone: '0912-345-678',
        recipientAddress: '高雄市前鎮區成功二路 88 號',
        senderAddress: '台中市西區公益路 50 號',
      },
      ambiguousFields: {
        customerName: ['立信實業', '立信貿易', '立信物流'],
      },
    },
    {
      id: `${batchId}-5`,
      orderNo: 'TJIE34985',
      fields: {
        businessType: '取',
        customerName: '信實貿易',
        temperatureLayer: '常溫',
        recipientAddress: '桃園市中壢區中華路二段 99 號',
        itemDescription: '文件 2 件',
        note: '易碎品請小心',
      },
    },
  ]);
}

/** Clean 樣本:全部欄位齊全、無歧義 — 一進來就適合直接掃視表格 */
export function parseOrdersFromTextClean(_rawText: string): OrderDraft[] {
  const batchId = newBatchId();
  return applyMockDefaults([
    {
      id: `${batchId}-1`,
      orderNo: 'TJIE34991',
      fields: {
        businessType: '送',
        customerName: '家具王',
        temperatureLayer: '常溫',
        recipientName: '王經理',
        recipientPhone: '0912-111-222',
        recipientAddress: '台北市中正區思源街 18 號',
        itemDescription: '紙箱 5 件',
        senderAddress: '台北市信義區松仁路 100 號',
      },
    },
    {
      id: `${batchId}-2`,
      orderNo: 'TJIE34992',
      fields: {
        businessType: '送',
        customerName: '永豐物流',
        temperatureLayer: '常溫',
        recipientName: '林先生',
        recipientPhone: '02-2345-6789',
        recipientAddress: '新北市板橋區文化路一段 5 號',
        itemDescription: '棧板 5 個',
        senderAddress: '新北市三重區重新路 200 號',
      },
    },
    {
      id: `${batchId}-3`,
      orderNo: 'TJIE34993',
      fields: {
        businessType: '送',
        customerName: '信實貿易',
        temperatureLayer: '常溫',
        recipientName: '張小姐',
        recipientPhone: '0922-111-222',
        recipientAddress: '桃園市中壢區中華路二段 99 號',
        itemDescription: '文件 2 件',
        senderAddress: '桃園市桃園區成功路 88 號',
      },
    },
  ]);
}

/**
 * Partial 樣本(對應設計稿的「待修正 + 提醒」內容):10 張訂單
 *   #1 缺客戶(必填)+ 貨品名稱超過長度 + 缺寄件人地址(reminder)
 *   #3 跟過去 3 天內訂單重複編號(reminder)
 *   #5 客戶不存在於系統中(歧義)+ 預計配達日為過去時間(reminder)
 *   #2、#4、#6-#10 為乾淨訂單
 */
export function parseOrdersFromTextPartial(_rawText: string): OrderDraft[] {
  const batchId = newBatchId();
  const orders = applyMockDefaults([
    {
      id: `${batchId}-1`,
      orderNo: 'TJIE34981',
      fields: {
        businessType: '送',
        temperatureLayer: '常溫',
        recipientAddress: '台北市中正區思源街 18 號',
      },
      missingFields: ['customerName'],
      extraErrors: ['「貨品名稱」最多 512 個字元'],
    },
    {
      id: `${batchId}-2`,
      orderNo: 'TJIE34982',
      fields: {
        businessType: '送',
        customerName: '永豐物流',
        temperatureLayer: '常溫',
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
        temperatureLayer: '常溫',
        recipientAddress: '台中市西屯區工業區一路 200 號',
        itemDescription: '零件 3 箱',
      },
      extraReminders: ['過去 3 天內已建立相同的訂單編號'],
    },
    {
      id: `${batchId}-4`,
      orderNo: 'TJIE34984',
      fields: {
        businessType: '送',
        customerName: '立信實業',
        temperatureLayer: '常溫',
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
        temperatureLayer: '常溫',
        recipientAddress: '桃園市中壢區中華路二段 99 號',
        itemDescription: '文件 2 件',
      },
      ambiguousFields: {
        customerName: ['信實貿易', '信實實業', '信實國際'],
      },
      extraReminders: ['「預計配達日」為過去的時間'],
    },
    {
      id: `${batchId}-6`,
      orderNo: 'TJIE34986',
      fields: {
        businessType: '送',
        customerName: '家具王',
        temperatureLayer: '常溫',
        recipientName: '王經理',
        recipientPhone: '0912-111-222',
        recipientAddress: '台北市中正區思源街 18 號',
        itemDescription: '紙箱 5 件',
      },
    },
    {
      id: `${batchId}-7`,
      orderNo: 'TJIE34987',
      fields: {
        businessType: '送',
        customerName: '永豐物流',
        temperatureLayer: '常溫',
        recipientName: '林先生',
        recipientPhone: '02-2345-6789',
        recipientAddress: '新北市板橋區文化路一段 5 號',
        itemDescription: '棧板 5 個',
      },
    },
    {
      id: `${batchId}-8`,
      orderNo: 'TJIE34988',
      fields: {
        businessType: '送',
        customerName: '信實貿易',
        temperatureLayer: '常溫',
        recipientName: '張小姐',
        recipientPhone: '0922-111-222',
        recipientAddress: '桃園市中壢區中華路二段 99 號',
        itemDescription: '文件 2 件',
      },
    },
    {
      id: `${batchId}-9`,
      orderNo: 'TJIE34989',
      fields: {
        businessType: '送',
        customerName: '立信實業',
        temperatureLayer: '常溫',
        recipientName: '陳志強',
        recipientPhone: '0912-345-678',
        recipientAddress: '高雄市前鎮區成功二路 88 號',
      },
    },
    {
      id: `${batchId}-10`,
      orderNo: 'TJIE34990',
      fields: {
        businessType: '取',
        customerName: '大同公司',
        temperatureLayer: '常溫',
        recipientName: '林先生',
        recipientPhone: '0918-555-888',
        recipientAddress: '台中市西屯區工業區一路 200 號',
        itemDescription: '零件 3 箱',
      },
    },
  ]);
  // 只有 #1 需要顯示「未填寄件人地址」reminder — 把 default 套上的 senderAddress 移除
  delete orders[0].fields.senderAddress;
  return orders;
}

/** Gathering 收齊後,把 collected 包成單張訂單。orderNoOverride 由 OP 在範本中提供時使用,否則自動編碼。 */
export function ordersFromCollected(
  collected: Partial<Record<FieldKey, string>>,
  orderNoOverride?: string,
): OrderDraft[] {
  const batchId = newBatchId();
  return [
    {
      id: `${batchId}-1`,
      orderNo: orderNoOverride ?? `TJIE${34985 + batchCounter}`,
      fields: { temperatureLayer: '常溫', ...collected },
    },
  ];
}

const MUST_COLLECT_FIELDS_FROM_TEMPLATE: FieldKey[] = [
  'customerName',
  'recipientAddress',
];

/**
 * 把 OP 填的 template blocks 轉成 OrderDraft[]:
 * - businessType 沒填就 fallback 「送」
 * - 必填欄位(客戶 / 收件人地址)沒填會進 missingFields
 * - orderNo 沒填會自動編碼
 */
export function ordersFromTemplateBlocks(
  blocks: TemplateOrderBlock[],
): OrderDraft[] {
  const batchId = newBatchId();
  const batchNo = batchCounter;
  return blocks.map((block, idx) => {
    const fields: Partial<Record<FieldKey, string>> = { ...block.fields };
    if (!fields.businessType) fields.businessType = '送';
    if (!fields.temperatureLayer) fields.temperatureLayer = '常溫';
    const missingFields = MUST_COLLECT_FIELDS_FROM_TEMPLATE.filter(
      (f) => !fields[f],
    );
    const autoNo = `TJIE${34990 + batchNo}${String(idx + 1).padStart(2, '0')}`;
    const order: OrderDraft = {
      id: `${batchId}-${idx + 1}`,
      orderNo: block.orderNo ?? autoNo,
      fields,
    };
    if (missingFields.length > 0) {
      order.missingFields = missingFields;
    }
    return order;
  });
}
