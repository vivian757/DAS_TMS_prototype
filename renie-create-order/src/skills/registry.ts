import type { RenieSkill, SkillCategory, SuggestedPrompt } from './types';
import { createOrderSkill } from './createOrder';
import { createDispatchSkill } from './createDispatch';
import { createCustomerSkill } from './createCustomer';
import { querySummarySkill } from './querySummary';
import { analyzeCustomerSkill } from './analyzeCustomer';

/**
 * Renie.ai skill registry.
 * 新增 skill:把它加進這個 array(並從各自 folder 匯出),其餘無需改動。
 */
export const SKILLS: RenieSkill[] = [
  createOrderSkill,
  createDispatchSkill,
  createCustomerSkill,
  querySummarySkill,
  analyzeCustomerSkill,
];

/** Category 中文 label */
export const CATEGORY_LABEL: Record<SkillCategory, string> = {
  create: '建立',
  query: '查詢',
  analyze: '分析',
  edit: '編輯',
};

/** Category 顯示順序 */
export const CATEGORY_ORDER: SkillCategory[] = [
  'create',
  'edit',
  'query',
  'analyze',
];

export function findSkillById(id: string): RenieSkill | undefined {
  return SKILLS.find((s) => s.id === id);
}

/**
 * 隱式意圖路由 — 從自然語言訊息找出最匹配的 skill。
 * 目前用「第一個 matchIntent 回 true」的策略。實際產品上可換成
 * LLM-based intent classifier(以 description / triggerKeywords 為提示)。
 */
export function routeIntent(text: string): RenieSkill | undefined {
  return SKILLS.find((s) => s.matchIntent(text));
}

/**
 * 取得初始畫面要顯示的建議卡。
 * highlight skill 展開全部 suggestedPrompts,其他 skill 只取第一個。
 */
export type InitialSuggestion = {
  skillId: string;
  prompt: SuggestedPrompt;
  highlight?: boolean;
};

export function getInitialSuggestions(): InitialSuggestion[] {
  const out: InitialSuggestion[] = [];
  SKILLS.filter((s) => s.highlightInInitial).forEach((s) => {
    s.suggestedPrompts.forEach((p, i) => {
      out.push({ skillId: s.id, prompt: p, highlight: i === 0 });
    });
  });
  SKILLS.filter(
    (s) => !s.highlightInInitial && s.suggestedPrompts.length > 0,
  ).forEach((s) => {
    out.push({ skillId: s.id, prompt: s.suggestedPrompts[0] });
  });
  return out;
}

/** 把 SKILLS 按 category 分組,給 SkillPicker 用 */
export function getSkillsByCategory(): Array<{
  category: SkillCategory;
  label: string;
  skills: RenieSkill[];
}> {
  const groups: Array<{
    category: SkillCategory;
    label: string;
    skills: RenieSkill[];
  }> = [];
  for (const category of CATEGORY_ORDER) {
    const skills = SKILLS.filter((s) => s.category === category);
    if (skills.length === 0) continue;
    groups.push({ category, label: CATEGORY_LABEL[category], skills });
  }
  return groups;
}
