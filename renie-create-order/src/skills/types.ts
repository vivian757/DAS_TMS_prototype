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
  /** Renie 對話泡會顯示的摘要文字 */
  summary: string;
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
  ) => Promise<{ summary: string; promotedArtifact?: SkillExecutionResult['artifact'] }>;

  /** Artifact 渲染元件 — 若 skill 會產出 artifact,必須提供 */
  ArtifactRenderer?: ComponentType<ArtifactRendererProps>;

  /**
   * 是否在訊息流中渲染此 artifact(預設 true)。
   * 用於隱藏內部 session 狀態(例如純文字 gathering 期間 artifact 只是追蹤狀態,不需 UI)。
   */
  shouldRenderArtifact?: (data: unknown) => boolean;
};
