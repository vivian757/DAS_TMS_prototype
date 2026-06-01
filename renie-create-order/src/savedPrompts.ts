/**
 * 「我的常用指令」mock 資料 — OP 自訂的 prompt 收藏。
 * 跟 RenieSkill 不同:這些只是 prompt 文字、沒有 capability metadata,
 * 點擊後填入輸入框讓 OP 編輯後再送。
 *
 * 收藏的就是「一句指令」本身,沒有額外的標題抽象 — 直接顯示 payload。
 */

export type SavedPrompt = {
  id: string;
  /** 收藏的指令內容(顯示與帶入皆使用此欄位,過長會被 ellipsis 截斷) */
  payload: string;
  /** 點擊後是否自動送出(預設 false:讓 OP 編輯後再送) */
  autoSend?: boolean;
};

export const SAVED_PROMPTS: SavedPrompt[] = [
  {
    id: 'sp-1',
    payload: '幫我整理今日已完成的訂單與派車單統計',
  },
  {
    id: 'sp-2',
    payload: '統計本週各司機被指派的訂單量,並依數量排序',
  },
  {
    id: 'sp-3',
    payload:
      '列出本週所有異常待處理的訂單,並依司機分組顯示原因與目前處理進度,協助我安排今天的處理優先順序',
  },
];
