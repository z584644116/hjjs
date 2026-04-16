'use client';

import React, { useMemo } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
import { useUrlState } from '@/hooks/useUrlState';
import { useRecordHistory } from '@/hooks/useRecordHistory';
import { calculateSpikeRecovery, parseDecimalInput } from '@/lib/calculators';

export default function RecoveryPage() {
  const [inputs, setInputs] = useUrlState({
    c0: '1.00',
    c1: '1.45',
    sp: '0.50',
    u: 'mg/L',
  });

  const result = useMemo(() => calculateSpikeRecovery({
    originalConcentration: parseDecimalInput(inputs.c0),
    spikedConcentration: parseDecimalInput(inputs.c1),
    spikeAmount: parseDecimalInput(inputs.sp),
  }), [inputs.c0, inputs.c1, inputs.sp]);

  const summary = useMemo(() => {
    if ('error' in result) return '';
    return `回收率 ${result.recoveryPercent.toFixed(2)}% · 回收量 ${result.recoveredAmount.toFixed(4)} ${inputs.u}`;
  }, [result, inputs.u]);

  useRecordHistory(summary);

  const handleReset = () =>
    setInputs({ c0: '', c1: '', sp: '', u: '' });

  return (
    <CalculatorShell
      title="加标回收率"
      actions={
        <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
          重置
        </button>
      }
    >
      <section className="app-panel p-4 md:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberInput label="原样测定值" unit={inputs.u} value={inputs.c0} onChange={(v) => setInputs({ c0: v })} required />
          <NumberInput label="加标样测定值" unit={inputs.u} value={inputs.c1} onChange={(v) => setInputs({ c1: v })} required />
          <NumberInput label="加标量" unit={inputs.u} value={inputs.sp} onChange={(v) => setInputs({ sp: v })} required />
          <div className="app-number-field">
            <label className="app-number-label" htmlFor="recovery-unit">单位</label>
            <div className="app-number-control">
              <input
                id="recovery-unit"
                type="text"
                value={inputs.u}
                onChange={(event) => setInputs({ u: event.target.value })}
                className="app-number-input text-left"
              />
            </div>
          </div>
        </div>
      </section>

      {'error' in result ? (
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
          {result.error}
        </div>
      ) : (
        <ResultDisplay
          title="回收率核查"
          standard="回收率 = (加标样测定值 - 原样测定值) / 加标量 × 100%"
          items={[
            { label: '回收量', value: result.recoveredAmount.toFixed(6), unit: inputs.u },
            { label: '加标回收率', value: result.recoveryPercent.toFixed(2), unit: '%', status: result.recoveryPercent >= 70 && result.recoveryPercent <= 130 ? 'success' : 'warning' },
          ]}
        />
      )}
    </CalculatorShell>
  );
}
