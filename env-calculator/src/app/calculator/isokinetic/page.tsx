'use client';

import React, { useMemo } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
import { useUrlState } from '@/hooks/useUrlState';
import { useRecordHistory } from '@/hooks/useRecordHistory';
import { calculateIsokineticFlow, parseDecimalInput } from '@/lib/calculators';

export default function IsokineticPage() {
  const [inputs, setInputs] = useUrlState({
    dp: '60',
    ba: '101.3',
    ps: '-1.2',
    ts: '120',
    kp: '0.84',
    rho: '',
    d: '8',
    q: '12',
  });

  const result = useMemo(() => {
    const density = parseDecimalInput(inputs.rho);

    return calculateIsokineticFlow({
      dynamicPressurePa: parseDecimalInput(inputs.dp),
      atmosphericPressureKPa: parseDecimalInput(inputs.ba),
      staticPressureKPa: parseDecimalInput(inputs.ps),
      temperatureC: parseDecimalInput(inputs.ts),
      pitotCoefficient: parseDecimalInput(inputs.kp),
      gasDensityKgM3: Number.isFinite(density) ? density : undefined,
      nozzleDiameterMm: parseDecimalInput(inputs.d),
      actualFlowLMin: parseDecimalInput(inputs.q),
    });
  }, [inputs.dp, inputs.ba, inputs.ps, inputs.ts, inputs.kp, inputs.rho, inputs.d, inputs.q]);

  const summary = useMemo(() => {
    if ('error' in result) return '';
    return `等速跟踪率 ${result.trackingRatePercent.toFixed(2)}% · ${result.isWithinTolerance ? '符合' : '超出 ±10%'}`;
  }, [result]);

  useRecordHistory(summary);

  const handleReset = () =>
    setInputs({ dp: '', ba: '', ps: '', ts: '', kp: '', rho: '', d: '', q: '' });

  return (
    <CalculatorShell
      title="烟气等速跟踪率核查"
      actions={
        <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
          重置
        </button>
      }
    >
      <section className="app-panel p-4 md:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberInput label="动压 Pd" unit="Pa" value={inputs.dp} onChange={(v) => setInputs({ dp: v })} required />
          <NumberInput label="大气压 Ba" unit="kPa" value={inputs.ba} step="0.1" onChange={(v) => setInputs({ ba: v })} required />
          <NumberInput label="静压 Ps" unit="kPa" value={inputs.ps} step="0.1" onChange={(v) => setInputs({ ps: v })} required />
          <NumberInput label="烟气温度 ts" unit="℃" value={inputs.ts} step="0.1" onChange={(v) => setInputs({ ts: v })} required />
          <NumberInput label="皮托管系数 Kp" value={inputs.kp} step="0.01" onChange={(v) => setInputs({ kp: v })} required />
          <NumberInput label="烟气密度" unit="kg/m³" value={inputs.rho} placeholder="留空自动估算" onChange={(v) => setInputs({ rho: v })} />
          <NumberInput label="采样嘴直径" unit="mm" value={inputs.d} onChange={(v) => setInputs({ d: v })} required />
          <NumberInput label="实际采样流量" unit="L/min" value={inputs.q} onChange={(v) => setInputs({ q: v })} required />
        </div>
      </section>

      {'error' in result ? (
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
          {result.error}
        </div>
      ) : (
        <ResultDisplay
          title="等速核查结果"
          standard="跟踪率 90% ~ 110% 判定为符合"
          items={[
            { label: '绝对压力', value: result.absolutePressureKPa.toFixed(3), unit: 'kPa' },
            { label: '烟气密度', value: result.gasDensityKgM3.toFixed(4), unit: 'kg/m³' },
            { label: '烟气流速 Vs', value: result.velocityMS.toFixed(2), unit: 'm/s' },
            { label: '理论等速流量', value: result.theoreticalFlowLMin.toFixed(2), unit: 'L/min' },
            { label: '实际采样流量', value: result.actualFlowLMin.toFixed(2), unit: 'L/min' },
            { label: '等速跟踪率', value: result.trackingRatePercent.toFixed(2), unit: '%', status: result.isWithinTolerance ? 'success' : 'danger' },
            { label: '流量偏差', value: result.deviationPercent.toFixed(2), unit: '%' },
            { label: '判定', value: result.isWithinTolerance ? '符合' : '超出 ±10%', status: result.isWithinTolerance ? 'success' : 'danger' },
          ]}
        />
      )}
    </CalculatorShell>
  );
}
