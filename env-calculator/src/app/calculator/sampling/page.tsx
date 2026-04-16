'use client';

import React, { useState } from 'react';
import { calculateSamplingMouth } from '@/lib/calculator';
import { CalculationInput, CalculationResult } from '@/types';
import CalculatorShell from '@/components/CalculatorShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';

export default function SamplingCalculatorPage() {
  const [samplingType, setSamplingType] = useState<'normal' | 'low-concentration'>('normal');
  const [maxFlowRate, setMaxFlowRate] = useState('');
  const [smokeVelocity, setSmokeVelocity] = useState('');
  const [moistureContent, setMoistureContent] = useState('');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState('');

  const handleCalculate = () => {
    setError('');
    setResult(null);

    const maxFlow = parseFloat(maxFlowRate.replace(',', '.'));
    if (Number.isNaN(maxFlow) || maxFlow <= 0) {
      setError('请输入有效的最高采样流量');
      return;
    }

    const velocity = parseFloat(smokeVelocity.replace(',', '.'));
    if (Number.isNaN(velocity) || velocity <= 0) {
      setError('请输入有效的烟气流速');
      return;
    }

    const moisture = parseFloat(moistureContent.replace(',', '.'));
    if (Number.isNaN(moisture) || moisture < 0 || moisture > 100) {
      setError('请输入有效的含湿量（0-100%）');
      return;
    }

    const input: CalculationInput = {
      samplingType,
      smokeVelocity: velocity,
      moistureContent: moisture,
    };

    try {
      setResult(calculateSamplingMouth(input, maxFlow));
    } catch {
      setError('计算过程中发生错误，请检查输入参数');
    }
  };

  const handleReset = () => {
    setSamplingType('normal');
    setMaxFlowRate('');
    setSmokeVelocity('');
    setMoistureContent('');
    setResult(null);
    setError('');
  };

  const actions = (
    <>
      <button type="button" onClick={handleCalculate} className="app-action-primary flex-1 md:flex-none">
        开始计算
      </button>
      <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
        重置
      </button>
    </>
  );

  return (
    <CalculatorShell
      title="采样嘴计算"
      description="烟气参数与最高采样流量匹配推荐嘴径"
      actions={actions}
    >
      <section className="app-panel space-y-5 p-4 md:p-5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSamplingType('normal')}
            data-active={samplingType === 'normal'}
            className="app-segment"
          >
            普通颗粒物
          </button>
          <button
            type="button"
            onClick={() => setSamplingType('low-concentration')}
            data-active={samplingType === 'low-concentration'}
            className="app-segment"
          >
            低浓度颗粒物
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <NumberInput
            label="最高采样流量"
            unit="L/min"
            value={maxFlowRate}
            onChange={setMaxFlowRate}
            placeholder="例如 50"
            required
            onSubmit={handleCalculate}
          />
          <NumberInput
            label="烟气流速"
            unit="m/s"
            value={smokeVelocity}
            onChange={setSmokeVelocity}
            placeholder="例如 12.5"
            required
            onSubmit={handleCalculate}
          />
          <NumberInput
            label="含湿量"
            unit="%"
            value={moistureContent}
            onChange={setMoistureContent}
            placeholder="例如 8"
            required
            onSubmit={handleCalculate}
          />
        </div>
      </section>

      {error && (
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
          {error}
        </div>
      )}

      {result && (
        <>
          <ResultDisplay
            title="计算结果"
            items={[
              {
                label: '干烟气流速',
                value: result.dryGasVelocity.toFixed(2),
                unit: 'm/s',
                status: 'success',
              },
              {
                label: '满功率推荐嘴径',
                value: result.fullPowerRecommendedDiameter,
                unit: 'mm',
                status: 'success',
              },
              {
                label: '保护功率推荐嘴径',
                value: result.protectionPowerRecommendedDiameter,
                unit: 'mm',
                status: 'warning',
              },
            ]}
          />

          <section className="app-panel-subtle p-4">
            <div className="mb-2 text-sm font-bold text-[var(--app-ink-secondary)]">系统库嘴径规格</div>
            <div className="flex flex-wrap gap-2">
              {result.availableDiameters.map((diameter) => (
                <span key={diameter} className="app-chip">
                  {diameter} mm
                </span>
              ))}
            </div>
          </section>
        </>
      )}
    </CalculatorShell>
  );
}
