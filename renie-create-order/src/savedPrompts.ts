/**
 * 「我的常用指令」mock 資料 — OP 自訂的 prompt 收藏。
 * 跟 RenieSkill 不同:這些只是 prompt 文字、沒有 capability metadata,
 * 點擊後填入輸入框讓 OP 編輯後再送。
 */

export type SavedPrompt = {
  id: string;
  /** 顯示在 list 上的標題 */
  text: string;
  /** 點擊後填入輸入框的內容 */
  payload: string;
  /** 點擊後是否自動送出(預設 false:讓 OP 編輯後再送) */
  autoSend?: boolean;
};

export const SAVED_PROMPTS: SavedPrompt[] = [
  {
    id: 'sp-1',
    text: '每日下班報表',
    payload: '幫我整理今日已完成的訂單與派車單統計,並列出未完成的項目',
  },
  {
    id: 'sp-2',
    text: '客戶 A 緊急訂單模板',
    payload: `幫我建立訂單
訂單#1
- 業務類型: 送
- 客戶: 大同公司
- 收件人地址:
- 備註: 急件,2 小時內送達`,
  },
  {
    id: 'sp-3',
    text: '本週司機派車統計',
    payload: '統計本週各司機被指派的訂單量,並依數量排序',
  },
  {
    id: 'sp-4',
    text: '異常訂單查詢',
    payload: '列出本週所有異常待處理的訂單,並顯示原因',
  },
];
