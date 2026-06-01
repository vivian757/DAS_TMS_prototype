import PieChartOutlineIcon from '@mui/icons-material/PieChartOutline';
import type { RenieSkill } from '../types';
import CustomerShareArtifact, {
  type CustomerShareData,
} from './CustomerShareArtifact';

const TRIGGER_KEYWORDS = ['客戶佔比', '客戶分析', '上個月的訂單', '客戶的訂單量'];

let counter = 0;

export const analyzeCustomerSkill: RenieSkill = {
  id: 'analyze-customer-share',
  name: '客戶訂單佔比',
  description: '分析特定期間內各家客戶的訂單佔比與排序。',
  category: 'analyze',
  icon: PieChartOutlineIcon,
  triggerKeywords: TRIGGER_KEYWORDS,
  suggestedPrompts: [
    { text: '請找出上個月的訂單,並分析各家客戶的佔比', autoSend: true },
  ],
  requiredPermissions: ['order.read', 'analytics.view'],

  matchIntent(text) {
    return TRIGGER_KEYWORDS.some((k) => text.includes(k));
  },

  async run(_input, ctx) {
    const step = async (text: string, ms: number) => {
      ctx.setStatus?.(text);
      await new Promise((r) => setTimeout(r, ms));
    };
    await step('解讀指令內容', 600);
    await step('讀取上月訂單', 900);
    await step('彙整客戶佔比', 800);

    counter += 1;
    const data: CustomerShareData = {
      totalOrders: 482,
      items: [
        { customer: '大同公司', count: 152, share: 31.5 },
        { customer: '永豐物流', count: 98, share: 20.3 },
        { customer: '立信實業', count: 76, share: 15.8 },
        { customer: '信實貿易', count: 58, share: 12.0 },
        { customer: '其他 (12 家)', count: 98, share: 20.4 },
      ],
    };
    return {
      summary:
        '上個月共完成 482 張訂單,前 4 大客戶佔比約 79.6%,集中度偏高,建議關注長尾客戶開發,詳細佔比如下',
      artifact: { artifactId: `customer-share-${counter}`, data },
    };
  },

  ArtifactRenderer: CustomerShareArtifact,
};
