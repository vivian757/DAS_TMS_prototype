import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import type { RenieSkill } from '../types';

const TRIGGER_KEYWORDS = ['建派車單', '派車', '建立派車', '幫我派車'];

const TEMPLATE = `派車單#1
- 訂單編號:
- 司機:
- 車輛:
- 預定出發時間:`;

export const createDispatchSkill: RenieSkill = {
  id: 'create-dispatch',
  name: '建立派車單',
  description: '為訂單指派司機與車輛,建立派車任務',
  category: 'create',
  icon: LocalShippingOutlinedIcon,
  triggerKeywords: TRIGGER_KEYWORDS,
  suggestedPrompts: [
    {
      text: '建立派車單',
      payload: `幫我建立派車單
派車單#1
- 訂單編號:
- 司機:
- 車輛:
- 預定出發時間:`,
      autoSend: false,
    },
  ],
  requiredPermissions: ['dispatch.create'],

  matchIntent(text) {
    return TRIGGER_KEYWORDS.some((k) => text.includes(k));
  },

  async run() {
    await new Promise((r) => setTimeout(r, 800));
    return {
      summary: `好的,建立派車單需要以下資訊,您可參考下方的格式回覆,或直接貼上派車資料\n\n${TEMPLATE}\n\n(此功能為展示用 stub,實際派車邏輯待開發)`,
    };
  },
};
