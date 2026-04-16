'use client';

import React, { useMemo } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
import { useUrlState } from '@/hooks/useUrlState';
import { useRecordHistory } from '@/hooks/useRecordHistory';
import {
  AirConcentrationMode,
  calculateAirConcentration,
  parseDecimalInput,
} from '@/lib/calculators';

const modeLabels: Record<AirConcentrationMode, string> = {
  'ambient-pm': '环境空气 PM',
  'stack-pm': '固定源颗粒物',
};

export default function AirConcentrationPage() {
  const [inputs, setInputs] = useUrlState({
    mode: 'ambient-pm',
    Q: '16.7',
    t: '60',
    P: '101.3',
    T: '25',
    w1: '150.20',
    w2: '152.34',
  });

  const mode: AirConcentrationMode =
    inputs.mode === 'stack-pm' ? 'stack-pm' : 'ambient-pm';

  const result = useMemo(() => calculateAirConcentration({
    mode,
    flowRateLMin: parseDecimalInput(inputs.Q),
    samplingMinutes: parseDecimalInput(inputs.t),
    pressureKPa: parseDecimalInput(inputs.P),
    temperatureC: parseDecimalInput(inputs.T),
    weightBeforeMg: parseDecimalInput(inputs.w1),
    weightAfterMg: parseDecimalInput(inputs.w2),
  }), [mode, inputs.Q, inputs.t, inputs.P, inputs.T, inputs.w1, inputs.w2]);

  const summary = useMemo(() => {
    if ('error' in result) return '';
    return `${modeLabels[mode]} · 浓度 ${result.concentrationMgM3.toFixed(4)} mg/m³`;
  }, [result, mode]);

  useRecordHistory(summary);

  const handleReset = () =>
    setInputs({ mode: 'ambient-pm', Q: '', t: '', P: '', T: '', w1: '', w2: '' });

  return (
    <CalculatorShell
      title="空气采样浓度计算"
      actions={
        <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
          重置
        </button>
      }
    >
      <section className="app-panel p-4 md:p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(modeLabels) as AirConcentrationMode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setInputs({ mode: item })}
              data-active={mode === item}
              className="app-segment"
            >
              {modeLabels[item]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NumberInput label="采样流量 Q" unit="L/min" value={inputs.Q} step="0.1" onChange={(v) => setInputs({ Q: v })} required />
          <NumberInput label="采样时间 t" unit="min" value={inputs.t} onChange={(v) => setInputs({ t: v })} required />
          <NumberInput label="采样压力 P" unit="kPa" value={inputs.P} step="0.1" onChange={(v) => setInputs({ P: v })} required />
          <NumberInput label="采样温度 T" unit="℃" value={inputs.T} step="0.1" onChange={(v) => setInputs({ T: v })} required />
          <NumberInput label="采样前重量 w1" unit="mg" value={inputs.w1} step="0.01" onChange={(v) => setInputs({ w1: v })} required />
          <NumberInput label="采样后重量 w2" unit="mg" value={inputs.w2} step="0.01" onChange={(v) => setInputs({ w2: v })} required />
        </div>
      </section>

      {'error' in result ? (
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
          {result.error}
        </div>
      ) : (
        <ResultDisplay
          title={modeLabels[mode]}
          standard="标准体积按 101.325 kPa、273.15 K 换算"
          items={[
            { label: '实际采样体积', value: result.actualVolumeL.toFixed(3), unit: 'L' },
            { label: '标准采样体积', value: result.standardVolumeL.toFixed(3), unit: 'L' },
            { label: '标准采样体积', value: result.standardVolumeM3.toFixed(6), unit: 'm³' },
            { label: '颗粒物质量', value: result.particleMassMg.toFixed(4), unit: 'mg' },
            { label: '颗粒物浓度', value: result.concentrationMgM3.toFixed(4), unit: 'mg/m³', status: 'success' },
          ]}
          details="C = (w2 - w1) / Vn,其中 Vn 使用采样流量、时间、压力和温度换算。"
        />
      )}
    </CalculatorShell>
  );
}
