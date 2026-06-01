import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import type { RenieSkill } from '../types';
import DriverLoadArtifact, {
  type DriverLoadData,
} from './DriverLoadArtifact';

const TRIGGER_KEYWORDS = [
  '司機被指派',
  '司機派車',
  '司機載量',
  '司機訂單量',
];

let counter = 0;

export const analyzeDriverSkill: RenieSkill = {
  id: 'analyze-driver-load',
  name: '司機派車量',
  description: '統計本週各司機被指派的訂單量,協助掌握載量分配。',
  category: 'analyze',
  icon: LocalShippingOutlinedIcon,
  triggerKeywords: TRIGGER_KEYWORDS,
  suggestedPrompts: [
    { text: '統計這週內各司機被指派的訂單量', autoSend: true },
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
    await step('讀取本週派車紀錄', 900);
    await step('彙整司機載量', 800);

    counter += 1;
    const data: DriverLoadData = {
      totalOrders: 142,
      weekRange: '5/19 - 5/25',
      items: [
        { driver: '陳大華', count: 32 },
        { driver: '王志明', count: 28 },
        { driver: '林文雄', count: 24 },
        { driver: '張啟昌', count: 20 },
        { driver: '李俊宏', count: 18 },
        { driver: '其他 (3 位)', count: 20 },
      ],
    };
    return {
      summary:
        '本週(5/19-5/25)共指派 142 張訂單給 8 位司機,前 3 位平均 28 張、最少 18 張,載量分配尚屬均衡,詳細狀況如下',
      artifact: { artifactId: `driver-load-${counter}`, data },
    };
  },

  ArtifactRenderer: DriverLoadArtifact,
};
