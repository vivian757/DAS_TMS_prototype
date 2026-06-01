import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TopBar from './components/TopBar';
import InitialScreen from './components/InitialScreen';
import InputBar from './components/InputBar';
import MessageBubble from './components/MessageBubble';
import ThinkingIndicator from './components/ThinkingIndicator';
import type { ConversationMessage } from './types';
import type { ArtifactStore } from './skills/types';
import { findSkillById, routeIntent } from './skills/registry';
import { ArtifactStoreContext } from './skills/createOrder/storeContext';

let msgId = 0;
const nextMsgId = () => `m-${++msgId}`;

export default function App() {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [artifactData, setArtifactData] = useState<Record<string, unknown>>({});
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState('解讀指令內容');
  // 「並排檢視」全域 mode + 目前 active 的 artifact id(右側 panel 顯示用)
  const [sideMode, setSideMode] = useState(false);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  // showPanel:控制右側 panel 是否掛在 DOM 上 — 退出時保留 280ms 讓滑出動畫播完
  const [showPanel, setShowPanel] = useState(false);
  // landingState:landing → conversation 過場狀態,exit 時 InitialScreen 保留 320ms 跑淡出動畫
  const [landingState, setLandingState] = useState<'visible' | 'exiting' | 'hidden'>('visible');
  // transitioning:sideMode 剛切換的瞬間為 true,讓左欄 width 套 transition;
  // drag handle 在拖曳時 width 隨指標改變,此時不該動畫,所以 dragging 時關掉。
  const [transitioning, setTransitioning] = useState(false);
  // Side mode split:左欄(對話)寬度百分比,預設 30%(剩下 70% 給右側面板)
  const [leftPercent, setLeftPercent] = useState(30);
  const scrollRef = useRef<HTMLDivElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // 進入並排 → 立刻掛 panel + 啟用 transition 漸變;
  // 退出並排 → 保留 panel 280ms 讓滑出動畫播完才 unmount
  useEffect(() => {
    setTransitioning(true);
    if (sideMode) {
      setShowPanel(true);
    }
    const t = window.setTimeout(() => {
      setTransitioning(false);
      if (!sideMode) setShowPanel(false);
    }, 320);
    return () => window.clearTimeout(t);
  }, [sideMode]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const container = splitContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const ratio = ((e.clientX - rect.left) / rect.width) * 100;
      // 對話區範圍:25% ~ 50%(預設 30%)
      setLeftPercent(Math.max(25, Math.min(50, ratio)));
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  const startSplitDrag = useCallback(() => {
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const hasConversation = messages.length > 0;

  // hasConversation 切換時驅動 landingState:
  //   false → true:landing 進入 exiting,320ms 後 hidden(從 DOM 移除)
  //   true → false:重置(用於 clear chat 回到初始畫面)
  useEffect(() => {
    if (hasConversation) {
      if (landingState === 'visible') {
        setLandingState('exiting');
        const t = window.setTimeout(() => setLandingState('hidden'), 320);
        return () => window.clearTimeout(t);
      }
    } else if (landingState !== 'visible') {
      setLandingState('visible');
    }
  }, [hasConversation, landingState]);

  // ArtifactStore facade — each skill's renderer reads/writes its own slice.
  const store: ArtifactStore = useMemo(
    () => ({
      get: <T,>(artifactId: string) => artifactData[artifactId] as T | undefined,
      set: <T,>(artifactId: string, data: T) =>
        setArtifactData((prev) => ({ ...prev, [artifactId]: data })),
      update: <T,>(artifactId: string, updater: (prev: T) => T) =>
        setArtifactData((prev) => ({
          ...prev,
          [artifactId]: updater(prev[artifactId] as T),
        })),
    }),
    [artifactData],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, artifactData, isThinking]);

  const pushMessage = useCallback((m: ConversationMessage) => {
    setMessages((prev) => [...prev, m]);
  }, []);

  /** 從最近的訊息往前找,看有沒有「仍 active」的 artifact session */
  const findActiveSession = useCallback((): {
    skillId: string;
    artifactId: string;
  } | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === 'renie' && m.kind === 'artifact') {
        const skill = findSkillById(m.skillId);
        if (!skill?.isArtifactActive) continue;
        if (skill.isArtifactActive(artifactData[m.artifactId])) {
          return { skillId: m.skillId, artifactId: m.artifactId };
        }
      }
    }
    return null;
  }, [messages, artifactData]);

  const runSkill = useCallback(
    async (
      skillId: string,
      input: string,
      options: { initialViewMode?: 'cards' | 'table' } = {},
    ) => {
      const skill = findSkillById(skillId);
      if (!skill) return;
      setThinkingStatus('解讀指令內容');
      setIsThinking(true);
      try {
        const result = await skill.run(input, {
          setStatus: setThinkingStatus,
        });
        pushMessage({
          id: nextMsgId(),
          role: 'renie',
          kind: 'text',
          text: result.summary,
        });
        if (result.artifact) {
          const newArtifactId = result.artifact.artifactId;
          // Demo 入口可指定 initialViewMode — 注入 artifact 資料,OrderArtifact 初始化時會讀
          const dataWithView =
            options.initialViewMode &&
            typeof result.artifact.data === 'object' &&
            result.artifact.data !== null &&
            (result.artifact.data as { mode?: string }).mode === 'orders'
              ? {
                  ...(result.artifact.data as object),
                  initialViewMode: options.initialViewMode,
                }
              : result.artifact.data;
          setArtifactData((prev) => ({
            ...prev,
            [newArtifactId]: dataWithView,
          }));
          pushMessage({
            id: nextMsgId(),
            role: 'renie',
            kind: 'artifact',
            skillId,
            artifactId: newArtifactId,
          });
          // 在並排模式下,新生成的 artifact 自動成為 active(舊的繼續以 pill 留在對話)
          if (sideMode) setActiveArtifactId(newArtifactId);
        }
      } finally {
        setIsThinking(false);
      }
    },
    [pushMessage, sideMode],
  );

  const continueSkillSession = useCallback(
    async (skillId: string, artifactId: string, input: string) => {
      const skill = findSkillById(skillId);
      if (!skill?.continueSession) return;
      setThinkingStatus('解讀指令內容');
      setIsThinking(true);
      try {
        const result = await skill.continueSession(input, artifactId, store, {
          setStatus: setThinkingStatus,
        });
        pushMessage({
          id: nextMsgId(),
          role: 'renie',
          kind: 'text',
          text: result.summary,
        });
        if (result.promotedArtifact) {
          const promotedId = result.promotedArtifact.artifactId;
          setArtifactData((prev) => ({
            ...prev,
            [promotedId]: result.promotedArtifact!.data,
          }));
          pushMessage({
            id: nextMsgId(),
            role: 'renie',
            kind: 'artifact',
            skillId,
            artifactId: promotedId,
          });
          // 並排模式下:promoted 出來的最新 artifact 自動成為 active
          if (sideMode) setActiveArtifactId(promotedId);
        }
      } finally {
        setIsThinking(false);
      }
    },
    [pushMessage, store, sideMode],
  );

  const handleSend = useCallback(
    (text: string) => {
      pushMessage({ id: nextMsgId(), role: 'user', kind: 'text', text });
      setDraft('');

      // 1. 先檢查有沒有 active artifact session,有的話優先路由給該 skill
      const active = findActiveSession();
      if (active) {
        const skill = findSkillById(active.skillId);
        if (skill?.continueSession) {
          continueSkillSession(active.skillId, active.artifactId, text);
          return;
        }
      }

      // 2. 否則走意圖路由
      const skill = routeIntent(text);
      if (skill) {
        runSkill(skill.id, text);
        return;
      }

      // 3. fallback
      setIsThinking(true);
      setTimeout(() => {
        pushMessage({
          id: nextMsgId(),
          role: 'renie',
          kind: 'text',
          text: '抱歉,目前沒有對應的技能能處理您的請求。建議您試試:「建立訂單」、「總結今日訂單」或「客戶佔比分析」',
        });
        setIsThinking(false);
      }, 500);
    },
    [pushMessage, runSkill, continueSkillSession, findActiveSession],
  );

  const handlePickSuggestion = useCallback(
    (skillId: string, promptText: string, autoSend: boolean) => {
      if (autoSend) {
        pushMessage({
          id: nextMsgId(),
          role: 'user',
          kind: 'text',
          text: promptText,
        });
        runSkill(skillId, promptText);
      } else {
        setDraft(promptText);
      }
    },
    [pushMessage, runSkill],
  );

  /** Demo 入口:auto-send + 可選 initialViewMode */
  const handlePickDemo = useCallback(
    (
      skillId: string,
      promptText: string,
      options?: { initialViewMode?: 'cards' | 'table' },
    ) => {
      pushMessage({
        id: nextMsgId(),
        role: 'user',
        kind: 'text',
        text: promptText,
      });
      runSkill(skillId, promptText, options);
    },
    [pushMessage, runSkill],
  );

  /**
   * Pill / 「並排檢視」按鈕的統一處理:
   * - 未進入並排模式 → 進入,並把這個 artifact 設為 active
   * - 已在並排模式且為 active → no-op(由 panel 的 ✕ 退出)
   * - 已在並排模式且非 active → 切換 active 到這個 artifact
   */
  const togglePin = useCallback(
    (_skillId: string, artifactId: string) => {
      setSideMode((on) => {
        if (!on) {
          setActiveArtifactId(artifactId);
          return true;
        }
        setActiveArtifactId((curr) => (curr === artifactId ? curr : artifactId));
        return on;
      });
    },
    [],
  );

  /** Panel ✕ — 退出並排模式;activeArtifactId 延後清,讓滑出動畫期間 panel 還能 render */
  const exitSideMode = useCallback(() => {
    setSideMode(false);
    window.setTimeout(() => setActiveArtifactId(null), 320);
  }, []);

  const handleClear = () => {
    setMessages([]);
    setArtifactData({});
    setDraft('');
    setSideMode(false);
    setActiveArtifactId(null);
    msgId = 0;
  };

  const renderedMessages = useMemo(() => {
    return messages.map((m) => {
      if (m.role === 'user') {
        return (
          <MessageBubble key={m.id} role="user">
            {m.text}
          </MessageBubble>
        );
      }
      if (m.kind === 'text') {
        return (
          <MessageBubble key={m.id} role="renie">
            {m.text}
          </MessageBubble>
        );
      }
      const skill = findSkillById(m.skillId);
      const Renderer = skill?.ArtifactRenderer;
      if (!Renderer) return null;
      // Skill 可選擇不渲染此 artifact(例如純文字 gathering 階段,artifact 只追蹤狀態)
      if (
        skill?.shouldRenderArtifact &&
        !skill.shouldRenderArtifact(artifactData[m.artifactId])
      ) {
        return null;
      }
      // 並排模式開啟時,所有 artifact 都以 pill 呈現;active 的那個有 primary 邊框
      const isPinned = sideMode;
      const isActive = sideMode && activeArtifactId === m.artifactId;
      return (
        <MessageBubble key={m.id} role="renie" fullWidth>
          <Renderer
            artifactId={m.artifactId}
            store={store}
            onFollowUp={(text) =>
              pushMessage({
                id: nextMsgId(),
                role: 'renie',
                kind: 'text',
                text,
              })
            }
            displayMode="inline"
            isPinned={isPinned}
            isActive={isActive}
            onTogglePin={() => togglePin(m.skillId, m.artifactId)}
          />
        </MessageBubble>
      );
    });
  }, [
    messages,
    store,
    pushMessage,
    artifactData,
    sideMode,
    activeArtifactId,
    togglePin,
  ]);

  const activeArtifactInfo = useMemo(() => {
    if (!sideMode || !activeArtifactId) return null;
    const msg = messages.find(
      (m) =>
        m.role === 'renie' &&
        m.kind === 'artifact' &&
        m.artifactId === activeArtifactId,
    );
    if (!msg || msg.role !== 'renie' || msg.kind !== 'artifact') return null;
    return { skillId: msg.skillId, artifactId: msg.artifactId };
  }, [sideMode, activeArtifactId, messages]);

  const pinnedRenderer = useMemo(() => {
    if (!activeArtifactInfo) return null;
    const skill = findSkillById(activeArtifactInfo.skillId);
    const Renderer = skill?.ArtifactRenderer;
    if (!Renderer) return null;
    return (
      <Renderer
        artifactId={activeArtifactInfo.artifactId}
        store={store}
        onFollowUp={(text) =>
          pushMessage({
            id: nextMsgId(),
            role: 'renie',
            kind: 'text',
            text,
          })
        }
        displayMode="panel"
        isPinned
        isActive
        isLoading={isThinking}
        onTogglePin={exitSideMode}
        onExitSideMode={exitSideMode}
      />
    );
  }, [activeArtifactInfo, store, pushMessage, exitSideMode, isThinking]);

  return (
    <ArtifactStoreContext.Provider value={store}>
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.background.default,
      }}
    >
      <TopBar />

      <Box
        ref={splitContainerRef}
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            width: sideMode ? `${leftPercent}%` : '100%',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            // 進入 / 退出並排時動畫過渡;拖曳分隔線時不開,避免跟手感衝突
            transition: transitioning
              ? 'width 280ms cubic-bezier(0.4, 0, 0.2, 1), padding 280ms cubic-bezier(0.4, 0, 0.2, 1)'
              : 'none',
            // 並排模式時左側對話區也保留上方 24px,與右側面板的 pt: 3 對稱
            pt: sideMode ? 3 : 0,
          }}
        >
          <Box
            ref={scrollRef}
            sx={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              // 並排模式時左側對話區隱藏 scroll bar(保留 scroll 功能)
              ...(sideMode && {
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }),
            }}
          >
            {landingState !== 'hidden' && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  // exiting 時改為 absolute,讓 conversation 同時 fade-in 從同個位置接手
                  ...(landingState === 'exiting' && {
                    position: 'absolute',
                    inset: 0,
                    zIndex: 2,
                    pointerEvents: 'none',
                  }),
                  animation:
                    landingState === 'exiting'
                      ? 'landingExit 320ms cubic-bezier(0.4, 0, 0.2, 1) both'
                      : 'landingEnter 320ms cubic-bezier(0.4, 0, 0.2, 1) both',
                  '@keyframes landingEnter': {
                    from: { opacity: 0, transform: 'translateY(8px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                  },
                  '@keyframes landingExit': {
                    from: { opacity: 1, transform: 'translateY(0)' },
                    to: { opacity: 0, transform: 'translateY(-12px)' },
                  },
                }}
              >
                <InitialScreen
                  userName="Vivian"
                  draft={draft}
                  onChangeDraft={setDraft}
                  onSend={handleSend}
                  onPickSuggestion={handlePickSuggestion}
                  onPickDemo={handlePickDemo}
                />
              </Box>
            )}

            {hasConversation && (
              <Box
                sx={{
                  maxWidth: sideMode ? '100%' : 880,
                  mx: 'auto',
                  width: '100%',
                  px: sideMode ? 3 : 5,
                  py: 3,
                  flex: 1,
                  // conversation 淡入 + 微微由下而上,與 landing 的淡出方向呼應
                  animation:
                    'conversationEnter 360ms cubic-bezier(0.4, 0, 0.2, 1) both',
                  '@keyframes conversationEnter': {
                    from: { opacity: 0, transform: 'translateY(12px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                  },
                }}
              >
                {renderedMessages}
                {isThinking && <ThinkingIndicator status={thinkingStatus} />}
              </Box>
            )}
          </Box>

          {hasConversation && (
            <Box
              sx={{
                animation:
                  'inputBarEnter 360ms 60ms cubic-bezier(0.4, 0, 0.2, 1) both',
                '@keyframes inputBarEnter': {
                  from: { opacity: 0, transform: 'translateY(16px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <InputBar
                draft={draft}
                onChangeDraft={setDraft}
                onSend={handleSend}
                onPickCommand={handlePickSuggestion}
                onClear={handleClear}
              />
            </Box>
          )}

          <Box
            sx={{
              px: 5,
              pb: 1.5,
              pt: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              fontSize: 12,
              color: theme.palette.dasGrey.grey01,
              flexShrink: 0,
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 14 }} />
            本服務產出的內容均由 AI 生成
          </Box>
        </Box>

        {showPanel && pinnedRenderer && (
          <>
            <Box
              onMouseDown={startSplitDrag}
              onDoubleClick={() => setLeftPercent(30)}
              title="拖曳調整寬度;雙擊回到 30 / 70 預設"
              sx={{
                width: 8,
                flexShrink: 0,
                cursor: 'col-resize',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'transparent',
                opacity: sideMode ? 1 : 0,
                transition: 'opacity 200ms ease',
                '&:hover .handle-line': {
                  bgcolor: theme.palette.dasPrimary.primary,
                  width: 3,
                },
              }}
            >
              <Box
                className="handle-line"
                sx={{
                  width: 1,
                  height: '100%',
                  bgcolor: 'transparent',
                  transition: 'background-color 0.15s, width 0.15s',
                }}
              />
            </Box>
            <Box
              sx={{
                flex: 1,
                bgcolor: '#FBFCFF',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                minWidth: 0,
                // 並排模式時,artifact 區塊四周各留 24px
                pt: 3,
                pr: 3,
                pb: 3,
                // 用 keyframe 動畫,enter / exit 都會跑(transition 在初次 mount 時不會觸發)
                animation: sideMode
                  ? 'panelEnter 280ms cubic-bezier(0.4, 0, 0.2, 1) both'
                  : 'panelExit 240ms cubic-bezier(0.4, 0, 0.2, 1) both',
                '@keyframes panelEnter': {
                  from: { opacity: 0, transform: 'translateX(24px)' },
                  to: { opacity: 1, transform: 'translateX(0)' },
                },
                '@keyframes panelExit': {
                  from: { opacity: 1, transform: 'translateX(0)' },
                  to: { opacity: 0, transform: 'translateX(24px)' },
                },
              }}
            >
              {pinnedRenderer}
            </Box>
          </>
        )}
      </Box>
    </Box>
    </ArtifactStoreContext.Provider>
  );
}
