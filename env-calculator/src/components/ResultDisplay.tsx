'use client';

import React, { useCallback, useRef, useState } from 'react';

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

export default function ResultDisplay({ title, standard, items, details }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const handleCopy = useCallback(async () => {
    try {
      const headerLine = title ? `${title}\n` : '';
      const body = items
        .map((item) => `${item.label}: ${item.value}${item.unit ? ` ${item.unit}` : ''}`)
        .join('\n');
      await navigator.clipboard.writeText(`${headerLine}${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // 非 secure context 下 clipboard API 可能不可用,静默失败
    }
  }, [items, title]);

  const handleExport = useCallback(async () => {
    const el = sectionRef.current;
    if (!el || exporting) return;
    setExporting(true);
    try {
      // 动态加载,避免 html-to-image 打入首屏 bundle
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(el, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        // 截图时隐藏导出按钮自身,避免"自拍"里一个醒目的"导出中"按钮
        filter: (node) => {
          if (node instanceof HTMLElement) {
            return !node.dataset.exportHide;
          }
          return true;
        },
      });
      const safeName = (title || '计算结果').replace(/[\\/:*?"<>|]/g, '_');
      const link = document.createElement('a');
      link.download = `${safeName}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // 截图失败静默,不打断现场计算
    } finally {
      setExporting(false);
    }
  }, [exporting, title]);

  const hasHeader = Boolean(title || standard);

  return (
    <section ref={sectionRef} className="app-result-list app-result-export-target">
      <header className="app-result-header">
        <div className="min-w-0">
          {title && <h3>{title}</h3>}
          {standard && <p>{standard}</p>}
          {!hasHeader && <h3 className="sr-only">计算结果</h3>}
        </div>
        <div className="app-result-actions" data-export-hide="true">
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? '已复制结果' : '复制结果'}
          >
            {copied ? '已复制' : '复制'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            aria-label="导出为 PNG"
          >
            {exporting ? '导出中' : '导出 PNG'}
          </button>
        </div>
      </header>

      <div>
        {items.map((item, idx) => (
          <div key={`${item.label}-${idx}`} className="app-result-row" data-status={item.status ?? 'neutral'}>
            <span className="app-result-label">{item.label}</span>
            <span className="app-result-value">
              <span>{item.value}</span>
              {item.unit && <small>{item.unit}</small>}
            </span>
          </div>
        ))}
      </div>

      {details && (
        <div className="app-result-details" data-export-hide="true">
          <button type="button" onClick={() => setShowDetails((prev) => !prev)}>
            {showDetails ? '收起' : '计算过程'}
          </button>
          {showDetails && <div className="app-result-detail-body">{details}</div>}
        </div>
      )}
    </section>
  );
}
