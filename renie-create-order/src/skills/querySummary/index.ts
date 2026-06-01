import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import type { RenieSkill } from '../types';
import SummaryArtifact, { type SummaryArtifactData } from './SummaryArtifact';

const TRIGGER_KEYWORDS = ['總結', '今天的訂單', '訂單執行', '執行狀況'];

let counter = 0;

export const querySummarySkill: RenieSkill = {
  id: 'query-today-summary',
  name: '今日訂單摘要',
  description: '總結今日訂單的執行狀況(派車、配送、送達、異常)。',
  category: 'query',
  icon: InsightsOutlinedIcon,
  triggerKeywords: TRIGGER_KEYWORDS,
  suggestedPrompts: [
    { text: '請幫我總結今天的訂單執行狀況', autoSend: true },
  ],
  requiredPermissions: ['order.read'],

  matchIntent(text) {
    return TRIGGER_KEYWORDS.some((k) => text.includes(k));
  },

  async run(_input, ctx) {
    const step = async (text: string, ms: number) => {
      ctx.setStatus?.(text);
      await new Promise((r) => setTimeout(r, ms));
    };
    await step('解讀指令內容', 600);
    await step('讀取今日訂單', 900);
    await step('整理摘要報表', 800);

    counter += 1;
    const data: SummaryArtifactData = {
      total: 56,
      delivered: 28,
      inTransit: 18,
      pending: 8,
      exception: 2,
    };
    return {
      summary:
        '今日共有 56 張訂單,28 張已送達、18 張配送中、8 張待派車、2 張異常待處理,詳細狀況如下',
      artifact: { artifactId: `summary-${counter}`, data },
    };
  },

  ArtifactRenderer: SummaryArtifact,
};
