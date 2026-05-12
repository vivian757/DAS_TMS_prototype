import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import type { RenieSkill } from '../types';

const TRIGGER_KEYWORDS = ['建客戶', '建立客戶', '新增客戶', '加客戶', '建立顧客'];

const TEMPLATE = `客戶#1
- 客戶名稱:
- 聯絡人:
- 電話:
- 公司地址:
- 統一編號:(選填)`;

export const createCustomerSkill: RenieSkill = {
  id: 'create-customer',
  name: '建立客戶',
  description: '建立新客戶資料,包含聯絡人與地址',
  category: 'create',
  icon: PersonAddAltOutlinedIcon,
  triggerKeywords: TRIGGER_KEYWORDS,
  suggestedPrompts: [
    {
      text: '建立客戶',
      payload: `幫我建立客戶
客戶#1
- 客戶名稱:
- 聯絡人:
- 電話:
- 公司地址:
- 統一編號:(選填)`,
      autoSend: false,
    },
  ],
  requiredPermissions: ['customer.create'],

  matchIntent(text) {
    return TRIGGER_KEYWORDS.some((k) => text.includes(k));
  },

  async run() {
    await new Promise((r) => setTimeout(r, 800));
    return {
      summary: `好的,建立客戶需要以下資訊,您可參考下方的格式回覆,或直接貼上客戶資料\n\n${TEMPLATE}\n\n(此功能為展示用 stub,實際客戶建立邏輯待開發)`,
    };
  },
};
