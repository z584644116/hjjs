'use client';

import React, { useMemo, useState } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import ResultDisplay from '@/components/ResultDisplay';
import { calculateRsd, parseNumberList } from '@/lib/calculators';

export default function RsdPage() {
  const [values, setValues] = useState('1.02, 1.01, 1.04, 1.03');
  const parsedValues = useMemo(() => parseNumberList(values), [values]);
  const result = useMemo(() => calculateRsd(parsedValues), [parsedValues]);

  const handleReset = () => {
    setValues('');
  };

  return (
    <CalculatorShell
      title="相对标准偏差 RSD"
      actions={
        <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
          重置
        </button>
      }
    >
      <section className="app-panel p-4 md:p-5">
        <div className="app-number-field">
          <label className="app-number-label" htmlFor="rsd-values">测定值</label>
          <textarea
            id="rsd-values"
            value={values}
            onChange={(event) => setValues(event.target.value)}
            placeholder="至少 2 个有效值，可用空格、逗号、分号或换行分隔"
            className="min-h-28 w-full resize-y rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-transparent px-3 py-2 text-base text-[var(--app-ink)] outline-none transition-colors focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-primary-light)]"
          />
          <span className="app-number-helper">已识别 {parsedValues.length} 个有效值。</span>
        </div>
      </section>

      {'error' in result ? (
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
          {result.error}
        </div>
      ) : (
        <ResultDisplay
          title="精密度计算"
          standard="RSD = 样本标准偏差 / |平均值| × 100%"
          items={[
            { label: '有效数据个数', value: result.count },
            { label: '平均值', value: result.average.toFixed(6) },
            { label: '样本标准偏差 s', value: result.standardDeviation.toFixed(6) },
            { label: 'RSD', value: result.rsdPercent.toFixed(2), unit: '%', status: result.rsdPercent <= 10 ? 'success' : 'warning' },
          ]}
          details={`原始有效值：${parsedValues.join('，')}`}
        />
      )}
    </CalculatorShell>
  );
}
