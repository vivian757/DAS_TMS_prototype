import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import type { RenieSkill } from '../types';
import AlertBox, { type AlertItem } from './AlertBox';
import {
  MUST_COLLECT_FIELDS,
  SAMPLE_INPUT_AI_TEMPLATE,
  SAMPLE_INPUT_CLEAN,
  SAMPLE_INPUT_PARTIAL,
  generateArtifactId,
  ordersFromCollected,
  ordersFromTemplateBlocks,
  parseOrdersFromTextClean,
  parseOrdersFromTextFull,
  parseOrdersFromTextPartial,
} from './data';
import { FIELD_META } from './fieldMeta';
import {
  extractBatchUpdate,
  extractFields,
  extractOrderRefs,
  isMultiOrderInput,
  isTemplateInput,
  parseTemplateInput,
} from './parseInput';
import OrderArtifact from './OrderArtifact';
import BatchUpdateConfirmCard from './BatchUpdateConfirmCard';
import { useArtifactStore } from './storeContext';
import type {
  CreateOrderArtifactData,
  FieldKey,
  OrderDraft,
  PendingBatchUpdate,
} from './types';

const TRIGGER_KEYWORDS = [
  '建單',
  '建立訂單',
  '新增訂單',
  '幫我建',
  '建一張',
  '建幾張',
];

const DEFAULT_BUSINESS_TYPE = '送';

function matchIntent(text: string): boolean {
  if (TRIGGER_KEYWORDS.some((k) => text.includes(k))) return true;
  if (isMultiOrderInput(text)) return true;
  return false;
}

// ─── Demo shortcuts (對外暴露給 InitialScreen) ─────────────────
export type CreateOrderDemoShortcut = {
  id: string;
  label: string;
  description: string;
  payload: string;
  /** 由 demo 入口指定初始 view mode(覆蓋狀態驅動預設) */
  initialViewMode?: 'cards' | 'table';
};

export const CREATE_ORDER_DEMO_SHORTCUTS: CreateOrderDemoShortcut[] = [
  {
    id: 'demo-clean',
    label: '解析完整',
    description: '3 張資料完整、無歧義的訂單 — 預設進表格檢視',
    payload: SAMPLE_INPUT_CLEAN,
  },
  {
    id: 'demo-partial',
    label: '部分缺漏',
    description: '10 張訂單,1 張缺必填+貨品名超長、2 張提醒類問題、1 張客戶歧義',
    payload: SAMPLE_INPUT_PARTIAL,
  },
  {
    id: 'demo-ai-template',
    label: 'ai 指令範本',
    description: '送出「幫我新增訂單」短指令,Renie 用範本格式回覆',
    payload: SAMPLE_INPUT_AI_TEMPLATE,
  },
];

// ─── 文案 helpers ─────────────────────────────────────────────
function buildFormatTemplate(
  fieldsToAsk: FieldKey[],
  options: { includeOrderNo?: boolean } = {},
): string {
  const lines = ['訂單#1'];
  if (options.includeOrderNo) {
    lines.push('- 訂單編號:(若無提供則會自動編碼)');
  }
  for (const f of fieldsToAsk) {
    if (f === 'businessType')
      lines.push('- 業務類型:(送 / 取,預設為「送」)');
    else if (f === 'customerName') lines.push('- 客戶:');
    else if (f === 'recipientAddress') lines.push('- 收件人地址:');
    else lines.push(`- ${FIELD_META[f].label}:`);
  }
  return lines.join('\n');
}

function listLabels(fields: FieldKey[]): string {
  return fields.map((f) => `「${FIELD_META[f].label}」`).join('、');
}

function isAllCollected(
  collected: Partial<Record<FieldKey, string>>,
): boolean {
  return MUST_COLLECT_FIELDS.every((f) => collected[f]);
}

function withBusinessTypeDefault(
  collected: Partial<Record<FieldKey, string>>,
): Partial<Record<FieldKey, string>> {
  if (collected.businessType) return collected;
  return { ...collected, businessType: DEFAULT_BUSINESS_TYPE };
}

// ─── 多筆樣本路由 ──────────────────────────────────────────────
// Prototype-level:用關鍵字判斷 demo partial vs full。實際接 LLM 時,
// 由 LLM 解析後直接回傳 OrderDraft[] + missingFields,這個分流可以拆掉。
function parseMultiOrderInput(input: string): OrderDraft[] {
  if (input.includes('部分缺資料') || input.includes('待補')) {
    return parseOrdersFromTextPartial(input);
  }
  if (input.includes('全部資料完整')) {
    return parseOrdersFromTextClean(input);
  }
  return parseOrdersFromTextFull(input);
}

// ─── 推導 alert items ──────────────────────────────────────────
/**
 * 從訂單清單推導出兩類提示:
 *   error    → 缺必填、客戶不存在系統(會擋送出)
 *   reminder → 缺寄件人地址(非強制但建議補)
 */
function deriveAlerts(orders: OrderDraft[]): {
  errors: AlertItem[];
  reminders: AlertItem[];
} {
  // 每張訂單收集自己的 errors / reminders,最後依列號合併成 AlertItem
  const errorsByRow = new Map<number, string[]>();
  const remindersByRow = new Map<number, string[]>();

  const pushError = (row: number, msg: string) => {
    const arr = errorsByRow.get(row) ?? [];
    arr.push(msg);
    errorsByRow.set(row, arr);
  };
  const pushReminder = (row: number, msg: string) => {
    const arr = remindersByRow.get(row) ?? [];
    arr.push(msg);
    remindersByRow.set(row, arr);
  };

  orders.forEach((o, idx) => {
    if (o.committed) return;
    const row = idx + 1;

    (o.missingFields ?? []).forEach((f) => {
      pushError(row, `「${FIELD_META[f].label}」為必填`);
    });
    Object.keys(o.ambiguousFields ?? {}).forEach((k) => {
      const f = k as FieldKey;
      pushError(row, `「${FIELD_META[f].label}」不存在於系統中`);
    });
    (o.extraErrors ?? []).forEach((msg) => pushError(row, msg));

    if (!o.fields.senderAddress) {
      pushReminder(
        row,
        '尚未填寫寄件人地址!建議填寫該地址以確保成功「取」與「送」。',
      );
    }
    (o.extraReminders ?? []).forEach((msg) => pushReminder(row, msg));
  });

  const toItems = (map: Map<number, string[]>): AlertItem[] =>
    Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([row, messages]) => ({ rows: [row], messages }));

  return {
    errors: toItems(errorsByRow),
    reminders: toItems(remindersByRow),
  };
}

// ─── State machine 核心 ────────────────────────────────────────
function buildConfirmSummary(count: number): string {
  return `已為您整理出 ${count} 張訂單,請確認後點擊「建立」送出,如需調整請直接點擊欄位或告訴我需要更改的內容`;
}

/**
 * 訂閱 artifact store 的 alerts 區塊 — 當用戶於 OrderArtifact 修正欄位後,
 * 對應的錯誤 / 提醒會即時消失;訂單全部 commit 後 alerts 整塊隱藏。
 */
function LiveOrderAlerts({ artifactId }: { artifactId: string }) {
  const store = useArtifactStore();
  const data = store.get<CreateOrderArtifactData>(artifactId);
  if (!data || data.mode !== 'orders') return null;
  const { errors, reminders } = deriveAlerts(data.orders);
  if (errors.length === 0 && reminders.length === 0) return null;
  return (
    <>
      {errors.length > 0 && <AlertBox type="error" items={errors} />}
      {reminders.length > 0 && <AlertBox type="reminder" items={reminders} />}
    </>
  );
}

function buildOrdersSummary(orders: OrderDraft[], artifactId: string): ReactNode {
  const { errors, reminders } = deriveAlerts(orders);
  const hasIssue = errors.length > 0 || reminders.length > 0;
  const intro = hasIssue
    ? `已為您整理出 ${orders.length} 張訂單，請協助確認以下資訊，您可以直接編輯欄位或告訴我要更改的內容，修正完畢後請點擊「新增」送出`
    : buildConfirmSummary(orders.length);
  return (
    <>
      <Box>{intro}</Box>
      <LiveOrderAlerts artifactId={artifactId} />
    </>
  );
}

export const createOrderSkill: RenieSkill = {
  id: 'create-order',
  name: '新增訂單',
  description:
    '從自然語言或貼上的文字建立一至多筆訂單。資訊充足時直接展卡,不足時純文字追問,缺漏時卡片 + 對話都能補。',
  category: 'create',
  icon: AddBoxOutlinedIcon,
  triggerKeywords: TRIGGER_KEYWORDS,
  suggestedPrompts: [
    {
      text: '建立訂單',
      payload: `幫我建立訂單
訂單#1
- 訂單編號:(若無提供則會自動編碼)
- 業務類型:(送 / 取,預設為「送」)
- 客戶:
- 收件人地址:`,
      autoSend: false,
    },
  ],
  highlightInInitial: true,
  requiredPermissions: ['order.create'],

  matchIntent,

  async run(input, ctx) {
    const step = async (text: string, ms: number) => {
      ctx.setStatus?.(text);
      await new Promise((r) => setTimeout(r, ms));
    };
    await step('解讀指令內容', 280);
    await step('解析訂單資料', 320);
    await step('比對客戶資料', 260);
    await step('整理訂單預覽', 200);

    // 1. 模板格式 → 解析多個訂單 block,每張獨立展卡(missing 用橘框 + 對話可補)
    if (isTemplateInput(input)) {
      const blocks = parseTemplateInput(input);
      if (blocks.length > 0) {
        const orders = ordersFromTemplateBlocks(blocks);
        const artifactId = generateArtifactId();
        return {
          summary: buildOrdersSummary(orders, artifactId),
          artifact: {
            artifactId,
            data: { mode: 'orders', orders } satisfies CreateOrderArtifactData,
          },
        };
      }
      // 沒抽出任何 block(極端 case) → fallthrough 到 gathering
    }

    // 2. 多筆格式 → 直接展卡(可能含 missingFields)
    if (isMultiOrderInput(input)) {
      const orders = parseMultiOrderInput(input);
      const artifactId = generateArtifactId();
      return {
        summary: buildOrdersSummary(orders, artifactId),
        artifact: {
          artifactId,
          data: { mode: 'orders', orders } satisfies CreateOrderArtifactData,
        },
      };
    }

    // 3. 單筆/極簡:抽欄位看完整度
    const extracted = extractFields(input);

    if (isAllCollected(extracted)) {
      // 一句話齊全 → 跳過 gathering,直接展卡
      const orders = ordersFromCollected(withBusinessTypeDefault(extracted));
      return {
        summary: buildConfirmSummary(orders.length),
        artifact: {
          artifactId: generateArtifactId(),
          data: { mode: 'orders', orders } satisfies CreateOrderArtifactData,
        },
      };
    }

    // 進 gathering:純文字回覆,提供範本格式給 OP 參考
    return {
      summary: `新增訂單至少需要以下資訊,你可以直接貼上手邊的資料,或參考下方的格式回覆:

- 訂單編號:(若沒有提供則會自動編碼)
- 業務類型:(送 / 取 / 取送,若沒有提供則預設為「送」)
- 客戶:
- 收件人地址:

此外,你也可補充貨品、費用、寄件人/收件人、日期等資訊。`,
      artifact: {
        artifactId: generateArtifactId(),
        data: { mode: 'gathering', collected: extracted },
      },
    };
  },

  isArtifactActive(data) {
    const d = data as CreateOrderArtifactData | undefined;
    if (!d) return false;
    if (d.mode === 'gathering') return !isAllCollected(d.collected);
    // orders mode: 只要還有未 commit 的訂單 → 對話持續可用
    //   - 缺欄位 / 歧義 → 補資料
    //   - 完整訂單  → 批量修改(例如「全部改成明天 14:00 前送達」)
    return d.orders.some((o) => !o.committed);
  },

  shouldRenderArtifact(data) {
    const d = data as CreateOrderArtifactData | undefined;
    if (!d) return false;
    return d.mode === 'orders';
  },

  async continueSession(input, artifactId, store, ctx) {
    const step = async (text: string, ms: number) => {
      ctx.setStatus?.(text);
      await new Promise((r) => setTimeout(r, ms));
    };
    await step('解讀指令內容', 900);
    await step('比對訂單資料', 1100);
    await step('整理回覆', 1000);
    const data = store.get<CreateOrderArtifactData>(artifactId);
    if (!data) {
      return { summary: '找不到對應的訂單,請重新開始' };
    }

    // ── Gathering mode: 純文字累積中 ────────────────────────
    if (data.mode === 'gathering') {
      const extracted = extractFields(input);
      const merged = { ...data.collected, ...extracted };

      if (isAllCollected(merged)) {
        // Promote 成 orders mode
        const orders = ordersFromCollected(withBusinessTypeDefault(merged));
        const newArtifactId = generateArtifactId();
        store.set<CreateOrderArtifactData>(newArtifactId, {
          mode: 'orders',
          orders,
        });
        store.update<CreateOrderArtifactData>(artifactId, () => ({
          mode: 'gathering',
          collected: merged,
        }));
        return {
          summary: buildConfirmSummary(orders.length),
          promotedArtifact: {
            artifactId: newArtifactId,
            data: { mode: 'orders', orders },
          },
        };
      }

      // 還沒齊 — 更新 session、回追問
      store.update<CreateOrderArtifactData>(artifactId, () => ({
        mode: 'gathering',
        collected: merged,
      }));
      const stillMissing = MUST_COLLECT_FIELDS.filter((f) => !merged[f]);
      const template = buildFormatTemplate(stillMissing);
      const justGot = (Object.keys(extracted) as FieldKey[]).filter(
        (f) => MUST_COLLECT_FIELDS.includes(f) || f === 'businessType',
      );

      if (justGot.length === 0) {
        return {
          summary: `未能從您的訊息中辨識出關鍵資訊,還需要${listLabels(stillMissing)},請依下方的格式回覆\n\n${template}`,
        };
      }
      return {
        summary: `已收到${listLabels(justGot)},還需要${listLabels(stillMissing)},請繼續補充\n\n${template}`,
      };
    }

    // ── Orders mode: 共用的 pending 寫入 + 確認卡 ──────────
    // 所有透過對話下達的異動指令(批量 / 個別欄位修正)都先暫存到 pendingBatchUpdate
    // 而非直接寫入訂單,讓用戶在 chat 端點「套用 / 不套用」決定。
    const stagePending = (
      targets: Array<{ orderIndex: number; field: FieldKey; value: string }>,
      summaryHead: ReactNode,
    ) => {
      const batchId = `batch-${Date.now()}`;
      const pending: PendingBatchUpdate = {
        batchId,
        targets,
      };
      store.update<CreateOrderArtifactData>(artifactId, (prev) => {
        if (prev.mode !== 'orders') return prev;
        return { ...prev, pendingBatchUpdate: pending };
      });
      return {
        summary: (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box>{summaryHead}</Box>
            <BatchUpdateConfirmCard batchId={batchId} />
          </Box>
        ),
      };
    };

    // (A) 批量修改:「全部改成明天 14:00 前送達」/「全部訂單的客戶改成客戶B」
    const batchUpdate = extractBatchUpdate(input, new Date());
    if (batchUpdate) {
      const pendingIndices = data.orders
        .map((o, idx) => (!o.committed ? idx : -1))
        .filter((i) => i >= 0);
      if (pendingIndices.length === 0) {
        return { summary: '目前沒有可修改的訂單' };
      }
      const targets = pendingIndices.flatMap((orderIndex) =>
        batchUpdate.targets.map((t) => ({
          orderIndex,
          field: t.field,
          value: t.value,
        })),
      );
      return stagePending(
        targets,
        `已把所有訂單的${batchUpdate.phrase},若確認無誤請點擊「套用」,如果需要調整請直接編輯欄位或告訴我要更改的內容`,
      );
    }

    // (B) 個別欄位修正:「2 號客戶大同公司」/「客戶B」(套用到所有缺該欄的訂單)
    const orders = data.orders;
    const extracted = extractFields(input);
    const refs = extractOrderRefs(input);

    const pendingIndices = orders
      .map((o, idx) => (!o.committed ? idx : -1))
      .filter((i) => i >= 0);

    const applyTargets: Array<{
      orderIndex: number;
      field: FieldKey;
      value: string;
    }> = [];
    for (const [field, value] of Object.entries(extracted)) {
      if (!value) continue;
      const k = field as FieldKey;
      if (refs.length > 0) {
        // 有指定 ref(例如「2 號」「3、4 號」)
        for (const ref of refs) {
          const idx = ref - 1;
          if (pendingIndices.includes(idx)) {
            applyTargets.push({ orderIndex: idx, field: k, value });
          }
        }
      } else {
        // 沒指定 → 套用到「所有缺這個欄位 / 該欄歧義」的卡片
        pendingIndices.forEach((idx) => {
          const o = orders[idx];
          const isMissing = o.missingFields?.includes(k) ?? false;
          const isAmbiguous = !!o.ambiguousFields?.[k];
          if (isMissing || isAmbiguous) {
            applyTargets.push({ orderIndex: idx, field: k, value });
          }
        });
      }
    }

    if (applyTargets.length === 0) {
      return {
        summary:
          '未能從您的訊息中辨識出可套用的欄位資訊。您可以說「2 號客戶大同公司」這樣的格式,或直接在卡片內編輯',
      };
    }

    // 訊息:具體說明要改哪些欄位、改成什麼值(每張卡分組)
    type ApplyTarget = (typeof applyTargets)[number];
    const byOrder = new Map<number, ApplyTarget[]>();
    applyTargets.forEach((t) => {
      const arr = byOrder.get(t.orderIndex) ?? [];
      arr.push(t);
      byOrder.set(t.orderIndex, arr);
    });
    const parts: string[] = [];
    Array.from(byOrder.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([idx, targets]) => {
        const fragments = targets.map(
          (t) => `「${FIELD_META[t.field].label}」改為「${t.value}」`,
        );
        parts.push(`#${idx + 1} 的${fragments.join('、')}`);
      });
    const summaryHead = `已準備將 ${parts.join(';')},若確認無誤請點擊「套用」`;

    return stagePending(applyTargets, summaryHead);
  },

  ArtifactRenderer: OrderArtifact,
};

export type { OrderDraft };
