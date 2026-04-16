'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft24Regular,
  Delete24Regular,
  History24Regular,
} from '@fluentui/react-icons';
import { useHistoryStore } from '@/stores/history';

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  try {
    return new Date(ts).toLocaleDateString('zh-CN');
  } catch {
    return '';
  }
}

export default function HistoryPage() {
  const history = useHistoryStore((s) => s.history);
  const removeEntry = useHistoryStore((s) => s.removeEntry);
  const clearHistory = useHistoryStore((s) => s.clearHistory);

  // 规避 zustand persist 在 SSR / hydration 期的闪烁
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const displayHistory = useMemo(() => (mounted ? history : []), [mounted, history]);

  const handleClear = () => {
    if (!displayHistory.length) return;
    if (window.confirm(`确定清空全部 ${displayHistory.length} 条历史记录吗?此操作不可恢复。`)) {
      clearHistory();
    }
  };

  return (
    <div className="page-container space-y-4">
      <header className="grid min-h-[44px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-1">
        <Link
          href="/"
          className="grid h-11 w-11 place-items-center rounded-2xl text-[var(--app-ink-secondary)] transition-colors hover:bg-[var(--app-surface-secondary)] hover:text-[var(--app-ink)]"
          aria-label="返回首页"
        >
          <ArrowLeft24Regular className="h-5 w-5" />
        </Link>
        <h1 className="truncate text-center text-base font-black text-[var(--app-ink)]">
          计算历史
        </h1>
        <button
          type="button"
          onClick={handleClear}
          disabled={!displayHistory.length}
          className="grid h-11 w-11 place-items-center rounded-2xl text-[var(--app-ink-secondary)] transition-colors enabled:hover:bg-[var(--app-surface-secondary)] enabled:hover:text-[var(--app-ink)] disabled:opacity-40"
          aria-label="清空全部历史"
          title="清空全部"
        >
          <Delete24Regular className="h-5 w-5" />
        </button>
      </header>

      {mounted && displayHistory.length > 0 && (
        <div className="px-1 text-xs font-medium text-[var(--app-ink-tertiary)]">
          共 {displayHistory.length} 条 · 最多保留最近 200 条 · 仅存储在本地浏览器
        </div>
      )}

      {!mounted ? (
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] p-6 text-center text-sm font-medium text-[var(--app-ink-tertiary)]">
          加载中…
        </div>
      ) : displayHistory.length === 0 ? (
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] px-4 py-10 text-center text-sm font-medium text-[var(--app-ink-tertiary)]">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-[var(--app-surface-secondary)] text-[var(--app-ink-tertiary)]">
            <History24Regular className="h-6 w-6" />
          </span>
          <div className="text-[var(--app-ink-secondary)]">暂无历史记录</div>
          <div className="mt-1 text-xs">完成任意计算后,结果会自动保存到这里</div>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {displayHistory.map((entry) => (
            <li key={entry.id}>
              <div className="flex items-stretch overflow-hidden rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] shadow-[var(--app-shadow-sm)] transition-colors hover:border-[var(--app-line-strong)]">
                <Link
                  href={entry.href || '/'}
                  className="min-w-0 flex-1 px-4 py-3"
                  aria-label={`重现 ${entry.title} 的历史计算`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-black text-[var(--app-ink)]">
                      {entry.title}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-[var(--app-ink-tertiary)]">
                      {relativeTime(entry.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--app-ink-secondary)]">
                    {entry.summary}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  className="grid w-12 shrink-0 place-items-center border-l border-[var(--app-line)] text-[var(--app-ink-tertiary)] transition-colors hover:bg-[var(--app-surface-secondary)] hover:text-[var(--app-danger)]"
                  aria-label={`删除 ${entry.title} 的历史记录`}
                  title="删除"
                >
                  <Delete24Regular className="h-5 w-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="h-20" aria-hidden="true" />
    </div>
  );
}
