'use client';

import React, { useMemo, useState } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
import { calculateSpikeRecovery, parseDecimalInput } from '@/lib/calculators';

export default function RecoveryPage() {
  const [original, setOriginal] = useState('1.00');
  const [spiked, setSpiked] = useState('1.45');
  const [spike, setSpike] = useState('0.50');
  const [unit, setUnit] = useState('mg/L');

  const result = useMemo(() => calculateSpikeRecovery({
    originalConcentration: parseDecimalInput(original),
    spikedConcentration: parseDecimalInput(spiked),
    spikeAmount: parseDecimalInput(spike),
  }), [original, spike, spiked]);

  const handleReset = () => {
    setOriginal('');
    setSpiked('');
    setSpike('');
    setUnit('');
  };

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
          <NumberInput label="原样测定值" unit={unit} value={original} onChange={setOriginal} required />
          <NumberInput label="加标样测定值" unit={unit} value={spiked} onChange={setSpiked} required />
          <NumberInput label="加标量" unit={unit} value={spike} onChange={setSpike} required />
          <div className="app-number-field">
            <label className="app-number-label" htmlFor="recovery-unit">单位</label>
            <div className="app-number-control">
              <input
                id="recovery-unit"
                type="text"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
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
            { label: '回收量', value: result.recoveredAmount.toFixed(6), unit },
            { label: '加标回收率', value: result.recoveryPercent.toFixed(2), unit: '%', status: result.recoveryPercent >= 70 && result.recoveryPercent <= 130 ? 'success' : 'warning' },
          ]}
        />
      )}
    </CalculatorShell>
  );
}
