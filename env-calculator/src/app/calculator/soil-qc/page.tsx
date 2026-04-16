'use client';

import React, { useMemo } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import FormulaModuleShell, { FormulaModuleOption } from '@/components/FormulaModuleShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
import { useUrlState } from '@/hooks/useUrlState';
import { useRecordHistory } from '@/hooks/useRecordHistory';
import {
  calculateSoilMoisture,
  calculateSoilPrepLoss,
  calculateSoilSieveRate,
  parseDecimalInput,
} from '@/lib/calculators';

type SoilTab = 'moisture' | 'prep';

const soilModules: FormulaModuleOption[] = [
  {
    key: 'moisture',
    title: '含水率',
    group: '土壤样品',
    description: '由湿重与干重计算水分质量和含水率。',
    formula: '含水率 = (湿重 - 干重) / 干重 × 100%',
  },
  {
    key: 'prep',
    title: '制备质控',
    group: '样品制备',
    description: '同步核查制备损失量、损失率和过筛率。',
    formula: '损失率 = 损失量 / 制备前重量 × 100%;过筛率 = 过筛重量 / 总重量 × 100%',
  },
];

export default function SoilQcPage() {
  const [inputs, setInputs] = useUrlState({
    tab: 'moisture',
    wet: '125.4',
    dry: '103.2',
    before: '500',
    after: '496',
    passed: '480',
    total: '500',
  });

  const activeTab: SoilTab = inputs.tab === 'prep' ? 'prep' : 'moisture';

  const moistureResult = useMemo(() => calculateSoilMoisture({
    wetWeightG: parseDecimalInput(inputs.wet),
    dryWeightG: parseDecimalInput(inputs.dry),
  }), [inputs.wet, inputs.dry]);

  const lossResult = useMemo(() => calculateSoilPrepLoss({
    beforeWeightG: parseDecimalInput(inputs.before),
    afterWeightG: parseDecimalInput(inputs.after),
  }), [inputs.before, inputs.after]);

  const sieveResult = useMemo(() => calculateSoilSieveRate({
    passedWeightG: parseDecimalInput(inputs.passed),
    totalWeightG: parseDecimalInput(inputs.total),
  }), [inputs.passed, inputs.total]);

  const summary = useMemo(() => {
    if (activeTab === 'moisture') {
      if ('error' in moistureResult) return '';
      return `含水率 ${moistureResult.moisturePercent.toFixed(2)}% · 水分 ${moistureResult.waterWeightG.toFixed(4)} g`;
    }
    if ('error' in lossResult || 'error' in sieveResult) return '';
    return `损失率 ${lossResult.lossPercent.toFixed(2)}% · 过筛率 ${sieveResult.sievePercent.toFixed(2)}%`;
  }, [activeTab, moistureResult, lossResult, sieveResult]);

  useRecordHistory(summary);

  const handleReset = () =>
    setInputs({ tab: 'moisture', wet: '', dry: '', before: '', after: '', passed: '', total: '' });

  return (
    <CalculatorShell
      title="土壤质控计算"
      actions={
        <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
          重置
        </button>
      }
    >
      <FormulaModuleShell
        modules={soilModules}
        activeKey={activeTab}
        onChange={(key) => setInputs({ tab: key })}
        navigationLabel="质控模块"
        countUnit="个模块"
        switchLabel="切换模块"
        drawerSubtitle="按样品处理阶段分组"
        searchPlaceholder="搜索质控模块"
        emptyText="无匹配模块"
      >
        <section className="app-panel p-4 md:p-5">
          {activeTab === 'moisture' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="湿重" unit="g" value={inputs.wet} onChange={(v) => setInputs({ wet: v })} required />
              <NumberInput label="干重" unit="g" value={inputs.dry} onChange={(v) => setInputs({ dry: v })} required />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="制备前重量" unit="g" value={inputs.before} onChange={(v) => setInputs({ before: v })} required />
              <NumberInput label="制备后重量" unit="g" value={inputs.after} onChange={(v) => setInputs({ after: v })} required />
              <NumberInput label="过筛重量" unit="g" value={inputs.passed} onChange={(v) => setInputs({ passed: v })} required />
              <NumberInput label="总重量" unit="g" value={inputs.total} onChange={(v) => setInputs({ total: v })} required />
            </div>
          )}
        </section>

        {activeTab === 'moisture' ? (
          'error' in moistureResult ? (
            <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
              {moistureResult.error}
            </div>
          ) : (
            <ResultDisplay
              title="含水率"
              standard="含水率 = (湿重 - 干重) / 干重 × 100%"
              items={[
                { label: '水分质量', value: moistureResult.waterWeightG.toFixed(4), unit: 'g' },
                { label: '含水率', value: moistureResult.moisturePercent.toFixed(2), unit: '%', status: 'success' },
              ]}
            />
          )
        ) : 'error' in lossResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
            {lossResult.error}
          </div>
        ) : 'error' in sieveResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
            {sieveResult.error}
          </div>
        ) : (
          <ResultDisplay
            title="制备质控"
            standard="损失率与过筛率同步核查"
            items={[
              { label: '损失量', value: lossResult.lossWeightG.toFixed(4), unit: 'g' },
              { label: '损失率', value: lossResult.lossPercent.toFixed(2), unit: '%', status: lossResult.lossPercent <= 5 ? 'success' : 'warning' },
              { label: '过筛率', value: sieveResult.sievePercent.toFixed(2), unit: '%', status: sieveResult.sievePercent >= 95 ? 'success' : 'warning' },
            ]}
          />
        )}
      </FormulaModuleShell>
    </CalculatorShell>
  );
}
