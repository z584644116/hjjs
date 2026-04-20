'use client';

import React, { useState } from 'react';
import type { CalculationWarning } from '@/lib/calculators/types';

interface WarningListProps {
  warnings: CalculationWarning[];
  /** 默认展开条数，超出折叠。默认 2 */
  defaultVisible?: number;
}

const LEVEL_STYLE: Record<CalculationWarning['level'], { bg: string; text: string; border: string; label: string }> = {
  info: {
    bg: '#F3F4F6',
    text: '#4B5563',
    border: '#D1D5DB',
    label: '提示',
  },
  warning: {
    bg: '#FEF3C7',
    text: '#92400E',
    border: '#F59E0B',
    label: '警告',
  },
  danger: {
    bg: '#FEE2E2',
    text: '#991B1B',
    border: '#EF4444',
    label: '危险',
  },
};

export default function WarningList({ warnings, defaultVisible = 2 }: WarningListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!warnings || warnings.length === 0) return null;

  // 按严重程度排序：danger -> warning -> info
  const sorted = [...warnings].sort((a, b) => {
    const order = { danger: 0, warning: 1, info: 2 };
    return order[a.level] - order[b.level];
  });

  const visible = expanded ? sorted : sorted.slice(0, defaultVisible);
  const hiddenCount = sorted.length - visible.length;

  return (
    <div className="flex flex-col gap-2" role="region" aria-label="计算警告列表">
      {visible.map((w, idx) => {
        const style = LEVEL_STYLE[w.level];
        return (
          <div
            key={`${w.level}-${idx}`}
            className="rounded-md border-l-4 p-3 text-sm"
            style={{ backgroundColor: style.bg, color: style.text, borderLeftColor: style.border }}
          >
            <div className="flex items-start gap-2">
              <span
                className="inline-block shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium"
                style={{ backgroundColor: style.border, color: '#fff' }}
              >
                {style.label}
              </span>
              <div className="min-w-0">
                <p className="break-words font-medium leading-snug">{w.message}</p>
                {w.suggestion && (
                  <p className="mt-1 text-xs leading-snug opacity-80">建议：{w.suggestion}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="self-start text-xs text-[var(--app-accent)] underline underline-offset-2"
        >
          展开剩余 {hiddenCount} 条
        </button>
      )}
      {expanded && sorted.length > defaultVisible && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="self-start text-xs text-[var(--app-muted)] underline underline-offset-2"
        >
          收起
        </button>
      )}
    </div>
  );
}
