'use client';

import React, { useMemo, useState } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
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
  const [mode, setMode] = useState<AirConcentrationMode>('ambient-pm');
  const [flowRate, setFlowRate] = useState('16.7');
  const [samplingMinutes, setSamplingMinutes] = useState('60');
  const [pressure, setPressure] = useState('101.3');
  const [temperature, setTemperature] = useState('25');
  const [weightBefore, setWeightBefore] = useState('150.20');
  const [weightAfter, setWeightAfter] = useState('152.34');

  const result = useMemo(() => calculateAirConcentration({
    mode,
    flowRateLMin: parseDecimalInput(flowRate),
    samplingMinutes: parseDecimalInput(samplingMinutes),
    pressureKPa: parseDecimalInput(pressure),
    temperatureC: parseDecimalInput(temperature),
    weightBeforeMg: parseDecimalInput(weightBefore),
    weightAfterMg: parseDecimalInput(weightAfter),
  }), [flowRate, mode, pressure, samplingMinutes, temperature, weightAfter, weightBefore]);

  const handleReset = () => {
    setMode('ambient-pm');
    setFlowRate('');
    setSamplingMinutes('');
    setPressure('');
    setTemperature('');
    setWeightBefore('');
    setWeightAfter('');
  };

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
              onClick={() => setMode(item)}
              data-active={mode === item}
              className="app-segment"
            >
              {modeLabels[item]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <NumberInput label="采样流量 Q" unit="L/min" value={flowRate} step="0.1" onChange={setFlowRate} required />
          <NumberInput label="采样时间 t" unit="min" value={samplingMinutes} onChange={setSamplingMinutes} required />
          <NumberInput label="采样压力 P" unit="kPa" value={pressure} step="0.1" onChange={setPressure} required />
          <NumberInput label="采样温度 T" unit="℃" value={temperature} step="0.1" onChange={setTemperature} required />
          <NumberInput label="采样前重量 w1" unit="mg" value={weightBefore} step="0.01" onChange={setWeightBefore} required />
          <NumberInput label="采样后重量 w2" unit="mg" value={weightAfter} step="0.01" onChange={setWeightAfter} required />
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
          details="C = (w2 - w1) / Vn，其中 Vn 使用采样流量、时间、压力和温度换算。"
        />
      )}
    </CalculatorShell>
  );
}
