'use client';

import React, { useMemo, useState } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
import { calculateIsokineticFlow, parseDecimalInput } from '@/lib/calculators';

export default function IsokineticPage() {
  const [dynamicPressure, setDynamicPressure] = useState('60');
  const [atmosphericPressure, setAtmosphericPressure] = useState('101.3');
  const [staticPressure, setStaticPressure] = useState('-1.2');
  const [temperature, setTemperature] = useState('120');
  const [pitotCoefficient, setPitotCoefficient] = useState('0.84');
  const [gasDensity, setGasDensity] = useState('');
  const [nozzleDiameter, setNozzleDiameter] = useState('8');
  const [actualFlow, setActualFlow] = useState('12');

  const result = useMemo(() => {
    const density = parseDecimalInput(gasDensity);

    return calculateIsokineticFlow({
      dynamicPressurePa: parseDecimalInput(dynamicPressure),
      atmosphericPressureKPa: parseDecimalInput(atmosphericPressure),
      staticPressureKPa: parseDecimalInput(staticPressure),
      temperatureC: parseDecimalInput(temperature),
      pitotCoefficient: parseDecimalInput(pitotCoefficient),
      gasDensityKgM3: Number.isFinite(density) ? density : undefined,
      nozzleDiameterMm: parseDecimalInput(nozzleDiameter),
      actualFlowLMin: parseDecimalInput(actualFlow),
    });
  }, [actualFlow, atmosphericPressure, dynamicPressure, gasDensity, nozzleDiameter, pitotCoefficient, staticPressure, temperature]);

  const handleReset = () => {
    setDynamicPressure('');
    setAtmosphericPressure('');
    setStaticPressure('');
    setTemperature('');
    setPitotCoefficient('');
    setGasDensity('');
    setNozzleDiameter('');
    setActualFlow('');
  };

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
          <NumberInput label="动压 Pd" unit="Pa" value={dynamicPressure} onChange={setDynamicPressure} required />
          <NumberInput label="大气压 Ba" unit="kPa" value={atmosphericPressure} step="0.1" onChange={setAtmosphericPressure} required />
          <NumberInput label="静压 Ps" unit="kPa" value={staticPressure} step="0.1" onChange={setStaticPressure} required />
          <NumberInput label="烟气温度 ts" unit="℃" value={temperature} step="0.1" onChange={setTemperature} required />
          <NumberInput label="皮托管系数 Kp" value={pitotCoefficient} step="0.01" onChange={setPitotCoefficient} required />
          <NumberInput label="烟气密度" unit="kg/m³" value={gasDensity} placeholder="留空自动估算" onChange={setGasDensity} />
          <NumberInput label="采样嘴直径" unit="mm" value={nozzleDiameter} onChange={setNozzleDiameter} required />
          <NumberInput label="实际采样流量" unit="L/min" value={actualFlow} onChange={setActualFlow} required />
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
