/**
 * Prototype-level fake LLM extractors:從 OP 自然語言抽取訂單欄位或訂單編號 ref。
 * 真實產品上會由後端 LLM 處理,這裡僅用 regex 模擬,讓 demo 跑得通就好。
 */

import type { FieldKey } from './types';

export function extractPhone(text: string): string | undefined {
  // 09xx-xxx-xxx / 09xxxxxxxx / 0x-xxxx-xxxx 等
  const m =
    text.match(/09\d{2}-?\d{3}-?\d{3}/) ||
    text.match(/0\d{1,2}-?\d{3,4}-?\d{3,4}/);
  return m ? m[0] : undefined;
}

export function extractAddress(text: string): string | undefined {
  // 簡單啟發式:從第一個出現「市/縣」開始,抓到結尾或下一個句號 / 逗號
  const m = text.match(/[一-龥]{2,4}[市縣][一-龥\d\s-]{4,40}[號樓樓室]/);
  return m ? m[0].trim() : undefined;
}

export function extractBusinessType(text: string): '送' | '取' | undefined {
  if (/取貨|取件|去取|要取/.test(text)) return '取';
  if (/送貨|送件|送去|要送|配送/.test(text)) return '送';
  // 單字精確匹配
  if (/(?<![一-龥])取(?![一-龥])/.test(text)) return '取';
  if (/(?<![一-龥])送(?![一-龥])/.test(text)) return '送';
  return undefined;
}

export function extractCustomerName(text: string): string | undefined {
  // 找「客戶 XX」「客戶是 XX」這種句法
  const explicit = text.match(/客戶(?:是|為|:|:)?\s*([一-龥A-Za-z0-9]{2,12})/);
  if (explicit) return explicit[1];
  // 找公司 / 行 / 商號等關鍵字的詞組
  const inferred = text.match(/([一-龥A-Za-z0-9]{2,8}(?:公司|物流|實業|貿易|商行|工廠|有限|股份|店))/);
  return inferred ? inferred[1] : undefined;
}

export function extractRecipientName(text: string): string | undefined {
  // 「收件人 XX」「給 XX」「找 XX」
  const m =
    text.match(/收件人(?:是|為|:|:)?\s*([一-龥]{2,4})/) ||
    text.match(/給\s*([一-龥]{2,4})/);
  return m ? m[1] : undefined;
}

/** 從 input 中找出「2 號」「2、4 號」「2 跟 4」這種訂單編號 ref */
export function extractOrderRefs(text: string): number[] {
  const refs = new Set<number>();
  // 中文 / 阿拉伯數字 + 「號」「張」前綴
  const m = text.matchAll(/(\d{1,2})\s*[號張]/g);
  for (const x of m) refs.add(Number(x[1]));
  // 「2、4」「2 跟 4」「2 和 4」
  const groupMatch = text.match(/(\d{1,2})[、,\s]+(?:跟|和|與|、|,)?\s*(\d{1,2})/);
  if (groupMatch) {
    refs.add(Number(groupMatch[1]));
    refs.add(Number(groupMatch[2]));
  }
  return Array.from(refs).sort((a, b) => a - b);
}

/** 對輸入做一次性掃描,回傳所有抽到的欄位 */
export function extractFields(text: string): Partial<Record<FieldKey, string>> {
  const out: Partial<Record<FieldKey, string>> = {};
  const businessType = extractBusinessType(text);
  if (businessType) out.businessType = businessType;
  const phone = extractPhone(text);
  if (phone) out.recipientPhone = phone;
  const address = extractAddress(text);
  if (address) out.recipientAddress = address;
  const customer = extractCustomerName(text);
  if (customer) out.customerName = customer;
  const recipient = extractRecipientName(text);
  if (recipient) out.recipientName = recipient;
  return out;
}

/**
 * 偵測輸入是否屬於「多筆」格式(多行或編號列表)。
 * 用於決定 input 該走「直接展卡」還是「進 gathering」。
 */
export function isMultiOrderInput(text: string): boolean {
  const lineCount = text.split('\n').filter((l) => l.trim()).length;
  if (lineCount >= 3) return true;
  if (/^\s*\d+[.、]/m.test(text)) return true;
  return false;
}
