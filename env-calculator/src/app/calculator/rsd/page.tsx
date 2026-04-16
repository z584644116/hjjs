'use client';

import React, { useMemo } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import PasteBulkInput from '@/components/PasteBulkInput';
import ResultDisplay from '@/components/ResultDisplay';
import { useUrlState } from '@/hooks/useUrlState';
import { useRecordHistory } from '@/hooks/useRecordHistory';
import { calculateRsd, parseNumberList } from '@/lib/calculators';

export default function RsdPage() {
  const [inputs, setInputs] = useUrlState({ v: '1.02, 1.01, 1.04, 1.03' });
  const parsedValues = useMemo(() => parseNumberList(inputs.v), [inputs.v]);
  const result = useMemo(() => calculateRsd(parsedValues), [parsedValues]);

  const summary = useMemo(() => {
    if ('error' in result) return '';
    return `RSD ${result.rsdPercent.toFixed(2)}% · 均值 ${result.average.toFixed(4)} · n=${result.count}`;
  }, [result]);

  useRecordHistory(summary);

  const handleReset = () => setInputs({ v: '' });

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
        <PasteBulkInput
          label="测定值"
          value={inputs.v}
          onChange={(v) => setInputs({ v })}
          placeholder="至少 2 个有效值,可用空格、逗号、分号或换行分隔"
          hint="支持科学计数法 1.2e-5"
          minValues={2}
          required
        />
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
          details={`原始有效值:${parsedValues.join(', ')}`}
        />
      )}
    </CalculatorShell>
  );
}
