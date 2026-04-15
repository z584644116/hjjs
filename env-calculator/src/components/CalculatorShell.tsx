'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft24Regular, MoreHorizontal24Regular } from '@fluentui/react-icons';

interface CalculatorShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function CalculatorShell({ title, children, actions }: CalculatorShellProps) {
  return (
    <div className="page-container space-y-4">
      <header className="grid min-h-[44px] grid-cols-[44px_minmax(0,1fr)_44px] items-center">
        <Link
          href="/"
          className="grid h-11 w-11 place-items-center rounded-2xl text-[var(--app-ink-secondary)] transition-colors hover:bg-[var(--app-surface-secondary)] hover:text-[var(--app-ink)]"
          aria-label="返回"
        >
          <ArrowLeft24Regular className="h-5 w-5" />
        </Link>
        <h1 className="truncate text-center text-base font-black text-[var(--app-ink)]">{title}</h1>
        <span className="grid h-11 w-11 place-items-center rounded-2xl text-[var(--app-ink-secondary)]" aria-hidden="true">
          <MoreHorizontal24Regular className="h-5 w-5" />
        </span>
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
    </div>
  );
}
