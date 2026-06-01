import { createContext, useContext } from 'react';
import type { ArtifactStore } from '../types';

/**
 * 把 App 持有的 ArtifactStore 透過 Context 暴露給 chat 訊息泡內的元件,
 * 讓 buildOrdersSummary 回傳的 LiveOrderAlerts 能讀到當前的訂單狀態,
 * 並在 OrderArtifact 修正後即時同步(隱藏已解除的錯誤 / 提醒)。
 */
export const ArtifactStoreContext = createContext<ArtifactStore | null>(null);

export function useArtifactStore(): ArtifactStore {
  const ctx = useContext(ArtifactStoreContext);
  if (!ctx) throw new Error('ArtifactStoreContext not provided');
  return ctx;
}
