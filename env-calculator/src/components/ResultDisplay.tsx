'use client';

import React, { useCallback, useState } from 'react';

type ResultStatus = 'success' | 'warning' | 'danger' | 'neutral';

interface ResultItem {
  label: string;
  value: string | number;
  unit?: string;
  status?: ResultStatus;
}

interface ResultDisplayProps {
  title?: string;
  standard?: string;
  items: ResultItem[];
  details?: React.ReactNode;
}

const statusStyles: Record<ResultStatus, string> = {
  success: 'bg-[var(--app-success-light)] text-[var(--app-success)]',
  warning: 'bg-[var(--app-warning-light)] text-[var(--app-warning)]',
  danger: 'bg-[var(--app-danger-light)] text-[var(--app-danger)]',
  neutral: 'bg-[var(--app-primary-light)] text-[var(--app-primary)]',
};

export default function ResultDisplay({ title, standard, items, details }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleCopy = useCallback(() => {
    const text = items.map((item) => `${item.label}: ${item.value}${item.unit ? ` ${item.unit}` : ''}`).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [items]);

  return (
    <section className="overflow-hidden rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] shadow-[var(--app-shadow-sm)]">
      {(title || standard) && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--app-line)] bg-[var(--app-surface-secondary)] px-4 py-3 md:px-5">
          <div className="min-w-0">
            {title && <h3 className="truncate text-base font-black text-[var(--app-ink)]">{title}</h3>}
            {standard && <div className="mt-1 text-xs font-semibold text-[var(--app-ink-tertiary)]">{standard}</div>}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-full border border-[var(--app-line)] bg-[var(--app-surface)] px-3 py-2 text-xs font-black text-[var(--app-primary)] transition-colors hover:border-[var(--app-primary)] hover:bg-[var(--app-primary-light)]"
          >
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-px bg-[var(--app-line)] sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, idx) => {
          const status = item.status ?? 'neutral';
          return (
            <div key={`${item.label}-${idx}`} className="bg-[var(--app-surface)] p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-bold text-[var(--app-ink-tertiary)]">{item.label}</span>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusStyles[status]}`} aria-hidden="true" />
              </div>
              <div className="mt-3 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className={`break-all text-2xl font-black leading-none tracking-[-0.03em] md:text-3xl ${statusStyles[status]} rounded-xl px-2 py-1`}>
                  {item.value}
                </span>
                {item.unit && <span className="text-sm font-bold text-[var(--app-ink-secondary)]">{item.unit}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {details && (
        <div className="border-t border-[var(--app-line)]">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-black text-[var(--app-primary)] transition-colors hover:bg-[var(--app-surface-secondary)] md:px-5"
          >
            <span>{showDetails ? '收起计算过程' : '查看计算过程'}</span>
            <span aria-hidden="true">{showDetails ? '↑' : '↓'}</span>
          </button>
          {showDetails && <div className="px-4 pb-4 text-sm leading-7 text-[var(--app-ink-secondary)] md:px-5">{details}</div>}
        </div>
      )}
    </section>
  );
}
