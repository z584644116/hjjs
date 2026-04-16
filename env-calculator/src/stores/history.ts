import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/constants';

export interface HistoryEntry {
  id: string;
  toolId: string;
  title: string;
  summary: string;
  /** 相对路径,含 query / hash,可直接用于 next/link。 */
  href: string;
  /** 毫秒时间戳。 */
  createdAt: number;
}

interface HistoryState {
  history: HistoryEntry[];
  addEntry: (entry: Omit<HistoryEntry, 'id' | 'createdAt'>) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
}

const MAX_HISTORY = 200;

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `h-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 计算历史 store — 环形缓冲 200 条,同工具同 summary 去重(保留最新)。
 * 完全 localStorage 持久化,不与任何外部服务同步。
 */
export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      history: [],
      addEntry: (entry) =>
        set((state) => {
          const dedupeKey = `${entry.toolId}::${entry.summary}`;
          const filtered = state.history.filter(
            (h) => `${h.toolId}::${h.summary}` !== dedupeKey,
          );
          const newEntry: HistoryEntry = {
            id: makeId(),
            createdAt: Date.now(),
            ...entry,
          };
          return { history: [newEntry, ...filtered].slice(0, MAX_HISTORY) };
        }),
      removeEntry: (id) =>
        set((state) => ({ history: state.history.filter((h) => h.id !== id) })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: STORAGE_KEYS.HISTORY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
