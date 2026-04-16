'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft24Regular,
  CheckmarkCircle24Filled,
  Info24Regular,
  MoreHorizontal24Regular,
  Share24Regular,
  Star24Filled,
  Star24Regular,
} from '@fluentui/react-icons';
import { calculatorNavItems } from '@/constants/navigation';
import { useFavoritesStore } from '@/stores/favorites';
import ToolInfoSheet from './ToolInfoSheet';

interface CalculatorShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function CalculatorShell({ title, children, actions }: CalculatorShellProps) {
  const pathname = usePathname();
  const currentItem = calculatorNavItems.find((item) => item.href === pathname);

  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  // 规避 zustand persist 在 SSR / hydration 期的星标闪烁
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isFavorite = mounted && currentItem ? favorites.includes(currentItem.id) : false;

  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
  const [infoOpen, setInfoOpen] = useState(false);

  const handleToggleFavorite = useCallback(() => {
    if (currentItem) toggleFavorite(currentItem.id);
  }, [currentItem, toggleFavorite]);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 1800);
    } catch {
      // 剪贴板 API 在非 HTTPS 且非 localhost 下可能不可用,静默失败
    }
  }, []);

  const handleOpenInfo = useCallback(() => setInfoOpen(true), []);
  const handleCloseInfo = useCallback(() => setInfoOpen(false), []);

  return (
    <div className="page-container space-y-4">
      <header className="grid min-h-[44px] grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-1">
        <Link
          href="/"
          className="grid h-11 w-11 place-items-center rounded-2xl text-[var(--app-ink-secondary)] transition-colors hover:bg-[var(--app-surface-secondary)] hover:text-[var(--app-ink)]"
          aria-label="返回"
        >
          <ArrowLeft24Regular className="h-5 w-5" />
        </Link>
        <h1 className="truncate text-center text-base font-black text-[var(--app-ink)]">{title}</h1>
        <div className="flex items-center justify-end">
          {currentItem ? (
            <>
              <button
                type="button"
                onClick={handleOpenInfo}
                className="grid h-11 w-11 place-items-center rounded-2xl text-[var(--app-ink-secondary)] transition-colors hover:bg-[var(--app-surface-secondary)] hover:text-[var(--app-ink)]"
                aria-label="工具说明与公式"
                title="工具说明"
              >
                <Info24Regular className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleToggleFavorite}
                className="grid h-11 w-11 place-items-center rounded-2xl text-[var(--app-ink-secondary)] transition-colors hover:bg-[var(--app-surface-secondary)] hover:text-[var(--app-ink)]"
                aria-label={isFavorite ? '取消收藏' : '加入收藏'}
                aria-pressed={isFavorite}
                title={isFavorite ? '已收藏' : '收藏'}
              >
                {isFavorite ? (
                  <Star24Filled className="h-5 w-5 text-[var(--app-primary)]" />
                ) : (
                  <Star24Regular className="h-5 w-5" />
                )}
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="grid h-11 w-11 place-items-center rounded-2xl text-[var(--app-ink-secondary)] transition-colors hover:bg-[var(--app-surface-secondary)] hover:text-[var(--app-ink)]"
                aria-label={shareStatus === 'copied' ? '已复制分享链接' : '复制分享链接'}
                title={shareStatus === 'copied' ? '已复制' : '复制链接'}
              >
                {shareStatus === 'copied' ? (
                  <CheckmarkCircle24Filled className="h-5 w-5 text-[var(--app-primary)]" />
                ) : (
                  <Share24Regular className="h-5 w-5" />
                )}
              </button>
            </>
          ) : (
            <span
              className="grid h-11 w-11 place-items-center rounded-2xl text-[var(--app-ink-secondary)]"
              aria-hidden="true"
            >
              <MoreHorizontal24Regular className="h-5 w-5" />
            </span>
          )}
        </div>
      </header>

      <div className="space-y-4">{children}</div>

      {actions && (
        <>
          <div className="hidden items-center gap-3 pt-1 md:flex">{actions}</div>
          <div
            className="fixed left-4 right-4 z-40 flex items-center justify-center gap-2 rounded-[26px] border border-[var(--app-line)] bg-[color-mix(in_srgb,var(--app-surface)_94%,transparent)] p-2 shadow-[0_-8px_32px_rgba(22,32,29,0.10)] backdrop-blur-xl md:hidden"
            style={{ bottom: 'calc(88px + env(safe-area-inset-bottom))' }}
          >
            {actions}
          </div>
          <div className="h-28 md:hidden" />
        </>
      )}

      {currentItem && (
        <ToolInfoSheet item={currentItem} open={infoOpen} onClose={handleCloseInfo} />
      )}
    </div>
  );
}
