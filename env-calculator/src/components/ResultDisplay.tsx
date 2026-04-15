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
    <section className="app-result-list">
      {(title || standard) && (
        <header className="app-result-header">
          <div className="min-w-0">
            {title && <h3>{title}</h3>}
            {standard && <p>{standard}</p>}
          </div>
          <button type="button" onClick={handleCopy}>
            {copied ? '已复制' : '复制'}
          </button>
        </header>
      )}

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
        <div className="app-result-details">
          <button type="button" onClick={() => setShowDetails((prev) => !prev)}>
            {showDetails ? '收起' : '计算过程'}
          </button>
          {showDetails && <div className="app-result-detail-body">{details}</div>}
        </div>
      )}
    </section>
  );
}
