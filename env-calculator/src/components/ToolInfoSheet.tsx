'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Dismiss24Regular } from '@fluentui/react-icons';
import {
  calculatorSceneLabels,
  type CalculatorNavItem,
} from '@/constants/navigation';

// 按需加载 Formula(含 KaTeX + 字体 CSS);ssr:false 避免服务端 katex 初始化
const Formula = dynamic(() => import('./Formula'), {
  ssr: false,
  loading: () => (
    <span className="text-sm font-medium text-[var(--app-ink-tertiary)]">
      公式加载中…
    </span>
  ),
});

interface ToolInfoSheetProps {
  item: CalculatorNavItem;
  open: boolean;
  onClose: () => void;
}

/**
 * 工具说明 / 公式 / 标准 / 场景的弹层。
 *
 * - 移动端:从下滑入的底部抽屉,85vh 最高
 * - 桌面端:从右滑入的侧边抽屉,宽 420px
 * - ESC 关闭;打开时禁止背景滚动
 */
export default function ToolInfoSheet({ item, open, onClose }: ToolInfoSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  const hasFormula = Boolean(item.formulaTex || item.formula);
  const hasStandards = Boolean(item.standards && item.standards.length > 0);
  const hasScenes = Boolean(item.scene && item.scene.length > 0);

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title} 工具说明`}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="关闭工具说明"
      />
      <div className="app-info-sheet">
        <div className="app-info-sheet-grip" aria-hidden="true" />
        <header className="app-info-sheet-head">
          <div className="min-w-0">
            <div className="text-xs font-black text-[var(--app-ink-tertiary)]">
              {item.domain} · {item.category}
            </div>
            <h3>{item.title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭" className="app-info-sheet-close">
            <Dismiss24Regular className="h-5 w-5" />
          </button>
        </header>

        <div className="app-info-sheet-body">
          {item.tip && (
            <section className="app-info-sheet-tip">
              <span aria-hidden="true">💡</span>
              <span>{item.tip}</span>
            </section>
          )}

          {item.description && (
            <section>
              <h4>工具说明</h4>
              <p>{item.description}</p>
            </section>
          )}

          {hasFormula && (
            <section>
              <h4>核心公式</h4>
              {item.formulaTex && (
                <div className="app-info-sheet-formula">
                  <Formula tex={item.formulaTex} />
                </div>
              )}
              {item.formula && (
                <pre className="app-info-sheet-code">
                  <code>{item.formula}</code>
                </pre>
              )}
            </section>
          )}

          {hasStandards && (
            <section>
              <h4>标准依据</h4>
              <div className="app-info-sheet-chips">
                {item.standards!.map((s) => (
                  <span key={s} className="app-chip">{s}</span>
                ))}
              </div>
            </section>
          )}

          {hasScenes && (
            <section>
              <h4>适用场景</h4>
              <div className="app-info-sheet-chips">
                {item.scene!.map((s) => (
                  <span key={s} className="app-chip">{calculatorSceneLabels[s]}</span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
