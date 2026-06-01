import type { ComponentType, ReactNode } from 'react';
import type { SvgIconComponent } from '@mui/icons-material';

export type SkillCategory = 'create' | 'query' | 'analyze' | 'edit';

export type SuggestedPrompt = {
  /** 顯示在建議卡 / picker 上的文字 */
  text: string;
  /** 點擊後實際填入輸入框的內容,預設等於 text */
  payload?: string;
  /** 點擊後是否自動送出 */
  autoSend?: boolean;
};

export type SkillRunContext = {
  /** 由 App 提供:Skill 處理時可呼叫,更新 ThinkingIndicator 顯示的子狀態文字 */
  setStatus?: (status: string) => void;
  /** 之後可擴:currentUser、permissions、locale… */
};

export type SkillExecutionResult = {
  /** Renie 對話泡會顯示的摘要 — 可純文字或結構化 ReactNode(例如分類錯誤/提醒區塊) */
  summary: ReactNode;
  /** Skill 產出的 artifact(如訂單卡片、統計卡、表格) */
  artifact?: {
    artifactId: string;
    data: unknown;
  };
};

export type ArtifactStore = {
  get<T = unknown>(artifactId: string): T | undefined;
  set<T = unknown>(artifactId: string, data: T): void;
  update<T = unknown>(artifactId: string, updater: (prev: T) => T): void;
};

export type ArtifactRendererProps = {
  artifactId: string;
  store: ArtifactStore;
  /** Skill 內部完成某個操作後想新增一則 Renie 訊息(例如部分 commit 完成的後續通知) */
  onFollowUp?: (text: ReactNode) => void;
  /** 渲染位置:inline 在對話流內、panel 在右側並排面板。預設 'inline'。 */
  displayMode?: 'inline' | 'panel';
  /**
   * 並排檢視模式是否已開啟。為 true 時,所有 inline artifact 應該渲染為 pill。
   * (原本「此 artifact 已被釘選」的單一語意已換成全域 mode)
   */
  isPinned?: boolean;
  /**
   * 在並排模式下,此 artifact 是否為「目前在右側面板顯示中」的那個。
   * Pill 渲染時用來區分 active(預覽中,primary 邊框)vs inactive(可切換)。
   */
  isActive?: boolean;
  /**
   * Pill 點擊行為:
   * - 未進入並排模式時 → 開啟並排模式,並把這個 artifact 設為 active
   * - 已在並排模式且 isActive=false → 切換 panel 顯示為此 artifact
   * - 已在並排模式且 isActive=true → 不做任何事(由 panel 的 ✕ 統一退出)
   */
  onTogglePin?: () => void;
  /** Panel 的 ✕ 按鈕:退出並排模式回到單欄 */
  onExitSideMode?: () => void;
  /**
   * AI 正在處理中(例如批改 / continueSession running)。
   * Renderer 可以據此顯示 loading 覆蓋層。由 App.tsx 從 isThinking 傳入。
   */
  isLoading?: boolean;
};

export type RenieSkill = {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  icon: SvgIconComponent;
  /** 觸發關鍵字,用於自然語言路由 */
  triggerKeywords: string[];
  /** 顯示在初始畫面 / picker 的建議 prompts */
  suggestedPrompts: SuggestedPrompt[];
  /** 是否在初始畫面以 highlight 樣式呈現 */
  highlightInInitial?: boolean;
  /** 此 skill 需要哪些後端權限(預留給未來權限控制) */
  requiredPermissions?: string[];

  /** 意圖識別 — 從使用者訊息判斷是否該由此 skill 處理 */
  matchIntent: (text: string) => boolean;

  /** 執行 skill — 回傳 summary + (可選) artifact */
  run: (input: string, ctx: SkillRunContext) => Promise<SkillExecutionResult>;

  /**
   * 判斷此 artifact 是否仍在 active session(等待後續輸入)。
   * 例如:gathering 還沒收齊欄位、訂單還沒全部 commit。
   * 回 true 時,後續使用者輸入會被路由到 continueSession 而非 routeIntent。
   */
  isArtifactActive?: (data: unknown) => boolean;

  /**
   * 處理 active artifact 的後續輸入(多輪對話)。
   * Skill 可從 store 讀取現況、解析輸入、更新 artifact、回傳 follow-up summary。
   */
  continueSession?: (
    input: string,
    artifactId: string,
    store: ArtifactStore,
    ctx: SkillRunContext,
  ) => Promise<{ summary: ReactNode; promotedArtifact?: SkillExecutionResult['artifact'] }>;

  /** Artifact 渲染元件 — 若 skill 會產出 artifact,必須提供 */
  ArtifactRenderer?: ComponentType<ArtifactRendererProps>;

  /**
   * 是否在訊息流中渲染此 artifact(預設 true)。
   * 用於隱藏內部 session 狀態(例如純文字 gathering 期間 artifact 只是追蹤狀態,不需 UI)。
   */
  shouldRenderArtifact?: (data: unknown) => boolean;
};
