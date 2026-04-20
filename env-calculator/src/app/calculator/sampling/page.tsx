'use client';

import React, { useState } from 'react';
import { calculateSamplingMouth, SamplingMouthResult } from '@/lib/calculator';
import { CalculationInput } from '@/types';
import CalculatorShell from '@/components/CalculatorShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';

export default function SamplingCalculatorPage() {
  const [samplingType, setSamplingType] = useState<'normal' | 'low-concentration'>('normal');
  const [maxFlowRate, setMaxFlowRate] = useState('');
  const [smokeVelocity, setSmokeVelocity] = useState('');
  const [moistureContent, setMoistureContent] = useState('');
  const [result, setResult] = useState<SamplingMouthResult | null>(null);
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
            title="推荐采样嘴径"
            items={[
              {
                label: '干烟气流速',
                value: result.dryGasVelocity.toFixed(2),
                unit: 'm/s',
                status: 'success',
              },
              {
                label: '推荐嘴径',
                value: result.recommendedDiameter.toString(),
                unit: 'mm',
                status: result.recommendedLevel === 'recommended' ? 'success' : 'warning',
              },
              {
                label: '所需流量',
                value: result.recommendedFlowLMin.toFixed(2),
                unit: 'L/min',
                status: 'neutral',
              },
            ]}
          />

          {result.warnings.length > 0 && (
            <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-warning)] bg-[var(--app-warning-light)] p-4">
              <div className="mb-2 text-sm font-bold text-[var(--app-warning)]">警告信息</div>
              {result.warnings.map((w, i) => (
                <div key={i} className="mb-2 text-sm">
                  <span className={
                    w.level === 'danger' ? 'text-[var(--app-danger)]' :
                    w.level === 'warning' ? 'text-[var(--app-warning)]' : 'text-[var(--app-info)]'
                  }>{w.message}</span>
                  {w.suggestion && <div className="mt-1 text-xs opacity-70">{w.suggestion}</div>}
                </div>
              ))}
            </div>
          )}

          <section className="app-panel-subtle p-4">
            <div className="mb-2 text-sm font-bold text-[var(--app-ink-secondary)]">全部候选嘴径对比</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--app-border)]">
                    <th className="px-2 py-1 text-left">嘴径(mm)</th>
                    <th className="px-2 py-1 text-left">所需流量(L/min)</th>
                    <th className="px-2 py-1 text-left">偏离目标</th>
                    <th className="px-2 py-1 text-left">推荐级别</th>
                  </tr>
                </thead>
                <tbody>
                  {result.candidates.map((c) => (
                    <tr key={c.diameterMm} className="border-b border-[var(--app-border-subtle)]">
                      <td className="px-2 py-1">{c.diameterMm}</td>
                      <td className="px-2 py-1">{c.requiredFlowLMin}</td>
                      <td className="px-2 py-1">{c.deviationFromTarget > 0 ? '+' : ''}{c.deviationFromTarget}%</td>
                      <td className="px-2 py-1">
                        <span className={
                          c.level === 'recommended' ? 'text-[var(--app-success)]' :
                          c.level === 'acceptable' ? 'text-[var(--app-warning)]' : 'text-[var(--app-danger)]'
                        }>
                          {c.level === 'recommended' ? '推荐' : c.level === 'acceptable' ? '可用' : '不推荐'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </CalculatorShell>
  );
}
