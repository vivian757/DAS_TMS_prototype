import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import type { RenieSkill } from '../types';
import {
  MUST_COLLECT_FIELDS,
  SAMPLE_INPUT_FULL,
  SAMPLE_INPUT_MINIMAL,
  SAMPLE_INPUT_PARTIAL,
  generateArtifactId,
  ordersFromCollected,
  ordersFromTemplateBlocks,
  parseOrdersFromTextFull,
  parseOrdersFromTextPartial,
} from './data';
import { FIELD_META } from './fieldMeta';
import {
  extractFields,
  extractOrderRefs,
  isMultiOrderInput,
  isTemplateInput,
  parseTemplateInput,
} from './parseInput';
import OrderArtifact from './OrderArtifact';
import type { CreateOrderArtifactData, FieldKey, OrderDraft } from './types';

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
};

export const CREATE_ORDER_DEMO_SHORTCUTS: CreateOrderDemoShortcut[] = [
  {
    id: 'demo-full',
    label: '完整資料',
    description: '貼上 5 張完整訂單,直接展卡',
    payload: SAMPLE_INPUT_FULL,
  },
  {
    id: 'demo-partial',
    label: '部分缺漏',
    description: '5 張單其中必填欄位缺漏,卡片標橘框、對話也可補',
    payload: SAMPLE_INPUT_PARTIAL,
  },
  {
    id: 'demo-minimal',
    label: '資訊極簡',
    description: '一句話起步,純文字追問三項必填,收齊後展卡',
    payload: SAMPLE_INPUT_MINIMAL,
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
  return parseOrdersFromTextFull(input);
}

// ─── State machine 核心 ────────────────────────────────────────
function buildConfirmSummary(count: number): string {
  return `已為您整理出 ${count} 張訂單,請確認後點擊「建立」送出,如需調整請直接點擊欄位或告訴我需要更改的內容`;
}

function buildOrdersSummary(orders: OrderDraft[]): string {
  const missingByOrder = orders
    .map((o, idx) => ({ idx: idx + 1, missing: o.missingFields ?? [] }))
    .filter((x) => x.missing.length > 0);
  if (missingByOrder.length === 0) {
    return buildConfirmSummary(orders.length);
  }
  const missingPart = missingByOrder
    .map((x) => `#${x.idx} 缺${listLabels(x.missing)}`)
    .join('、');
  return `已為您解析出 ${orders.length} 張訂單,${missingPart},您可在卡片內補,或直接告訴我(例如:「2 號客戶大同公司」)`;
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
        return {
          summary: buildOrdersSummary(orders),
          artifact: {
            artifactId: generateArtifactId(),
            data: { mode: 'orders', orders } satisfies CreateOrderArtifactData,
          },
        };
      }
      // 沒抽出任何 block(極端 case) → fallthrough 到 gathering
    }

    // 2. 多筆格式 → 直接展卡(可能含 missingFields)
    if (isMultiOrderInput(input)) {
      const orders = parseMultiOrderInput(input);
      return {
        summary: buildOrdersSummary(orders),
        artifact: {
          artifactId: generateArtifactId(),
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

    // 進 gathering:純文字 + 格式範本
    const template = buildFormatTemplate(
      ['businessType', 'customerName', 'recipientAddress'],
      { includeOrderNo: true },
    );
    return {
      summary: `建立訂單至少需要以下資訊,您可參考下方的格式回覆,或直接補充/貼上您所需的訂單資料\n\n${template}`,
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
    // orders mode: 有任何未 commit 的訂單還缺必填 → active(對話可補)
    return d.orders.some(
      (o) => !o.committed && (o.missingFields?.length ?? 0) > 0,
    );
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
    await step('解讀指令內容', 280);
    await step('整理回覆', 240);
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

    // ── Orders mode + 有缺漏: 對話補欄位(混合派 B) ───────
    const orders = data.orders;
    const extracted = extractFields(input);
    const refs = extractOrderRefs(input);

    // 哪幾張未 commit
    const pendingIndices = orders
      .map((o, idx) => (!o.committed ? idx : -1))
      .filter((i) => i >= 0);

    // 對每個 extracted 欄位,決定要套用到哪幾張
    const applyTargets: Array<{
      orderIdx: number;
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
            applyTargets.push({ orderIdx: idx, field: k, value });
          }
        }
      } else {
        // 沒指定 → 套用到「所有缺這個欄位」的卡片
        pendingIndices.forEach((idx) => {
          if (orders[idx].missingFields?.includes(k)) {
            applyTargets.push({ orderIdx: idx, field: k, value });
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

    // 套用
    store.update<CreateOrderArtifactData>(artifactId, (prev) => {
      if (prev.mode !== 'orders') return prev;
      return {
        mode: 'orders',
        orders: prev.orders.map((o, idx) => {
          const applies = applyTargets.filter((t) => t.orderIdx === idx);
          if (applies.length === 0) return o;
          const newFields = { ...o.fields };
          let newMissing = o.missingFields ?? [];
          for (const { field, value } of applies) {
            newFields[field] = value;
            newMissing = newMissing.filter((f) => f !== field);
          }
          return { ...o, fields: newFields, missingFields: newMissing };
        }),
      };
    });

    // 訊息:按訂單分組
    const byOrder = new Map<number, FieldKey[]>();
    applyTargets.forEach((t) => {
      const arr = byOrder.get(t.orderIdx) ?? [];
      arr.push(t.field);
      byOrder.set(t.orderIdx, arr);
    });
    const parts: string[] = [];
    Array.from(byOrder.entries())
      .sort(([a], [b]) => a - b)
      .forEach(([idx, fields]) => {
        parts.push(`#${idx + 1} 已補上${listLabels(fields)}`);
      });
    return { summary: `好的,${parts.join('、')}` };
  },

  ArtifactRenderer: OrderArtifact,
};

export type { OrderDraft };
