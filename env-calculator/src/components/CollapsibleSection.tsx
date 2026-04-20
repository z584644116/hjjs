'use client';

import React, { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  /** 默认是否展开，默认 false */
  defaultOpen?: boolean;
  /** 标题右侧的徽标，例如警告条数 */
  badge?: string | number;
  children: React.ReactNode;
}

/**
 * 通用可折叠区域：用于在手机端隐藏"计算过程 / 公式说明 / 适用条件"等次要信息。
 * 默认折叠；点击标题切换。
 */
export default function CollapsibleSection({
  title,
  defaultOpen = false,
  badge,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-md border border-[var(--app-border)] bg-[var(--app-surface)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-[var(--app-foreground)]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span>{title}</span>
          {badge !== undefined && badge !== '' && badge !== 0 && (
            <span className="inline-flex items-center rounded-full bg-[var(--app-accent)] px-2 py-0.5 text-[11px] font-medium text-white">
              {badge}
            </span>
          )}
        </span>
        <span aria-hidden className="text-xs text-[var(--app-muted)]">
          {open ? '收起' : '展开'}
        </span>
      </button>
      {open && (
        <div className="border-t border-[var(--app-border)] px-3 py-3 text-sm leading-relaxed text-[var(--app-muted)]">
          {children}
        </div>
      )}
    </section>
  );
}
