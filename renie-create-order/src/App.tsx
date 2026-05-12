import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, useTheme } from '@mui/material';
import TopBar from './components/TopBar';
import PageHeader from './components/PageHeader';
import InitialScreen from './components/InitialScreen';
import InputBar from './components/InputBar';
import MessageBubble from './components/MessageBubble';
import ThinkingIndicator from './components/ThinkingIndicator';
import type { ConversationMessage } from './types';
import type { ArtifactStore } from './skills/types';
import { findSkillById, routeIntent } from './skills/registry';

let msgId = 0;
const nextMsgId = () => `m-${++msgId}`;

export default function App() {
  const theme = useTheme();
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [artifactData, setArtifactData] = useState<Record<string, unknown>>({});
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState('解讀指令內容');
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasConversation = messages.length > 0;

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
    async (skillId: string, input: string) => {
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
          setArtifactData((prev) => ({
            ...prev,
            [result.artifact!.artifactId]: result.artifact!.data,
          }));
          pushMessage({
            id: nextMsgId(),
            role: 'renie',
            kind: 'artifact',
            skillId,
            artifactId: result.artifact.artifactId,
          });
        }
      } finally {
        setIsThinking(false);
      }
    },
    [pushMessage],
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
          setArtifactData((prev) => ({
            ...prev,
            [result.promotedArtifact!.artifactId]: result.promotedArtifact!.data,
          }));
          pushMessage({
            id: nextMsgId(),
            role: 'renie',
            kind: 'artifact',
            skillId,
            artifactId: result.promotedArtifact.artifactId,
          });
        }
      } finally {
        setIsThinking(false);
      }
    },
    [pushMessage, store],
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

  const handleClear = () => {
    setMessages([]);
    setArtifactData({});
    setDraft('');
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
          />
        </MessageBubble>
      );
    });
  }, [messages, store, pushMessage]);

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.background.default,
      }}
    >
      <TopBar />
      <PageHeader onClear={handleClear} canClear={hasConversation} />

      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {!hasConversation ? (
          <InitialScreen
            userName="Vivian"
            onPickSuggestion={handlePickSuggestion}
          />
        ) : (
          <Box
            sx={{
              maxWidth: 880,
              mx: 'auto',
              width: '100%',
              px: 5,
              py: 3,
              flex: 1,
            }}
          >
            {renderedMessages}
            {isThinking && <ThinkingIndicator status={thinkingStatus} />}
          </Box>
        )}
      </Box>

      <InputBar
        draft={draft}
        onChangeDraft={setDraft}
        onSend={handleSend}
        onPickCommand={handlePickSuggestion}
      />
    </Box>
  );
}
