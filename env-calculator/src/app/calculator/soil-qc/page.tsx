'use client';

import React, { useMemo, useState } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
import {
  calculateSoilMoisture,
  calculateSoilPrepLoss,
  calculateSoilSieveRate,
  parseDecimalInput,
} from '@/lib/calculators';

type SoilTab = 'moisture' | 'prep';

export default function SoilQcPage() {
  const [activeTab, setActiveTab] = useState<SoilTab>('moisture');
  const [wetWeight, setWetWeight] = useState('125.4');
  const [dryWeight, setDryWeight] = useState('103.2');
  const [beforeWeight, setBeforeWeight] = useState('500');
  const [afterWeight, setAfterWeight] = useState('496');
  const [passedWeight, setPassedWeight] = useState('480');
  const [totalWeight, setTotalWeight] = useState('500');

  const moistureResult = useMemo(() => calculateSoilMoisture({
    wetWeightG: parseDecimalInput(wetWeight),
    dryWeightG: parseDecimalInput(dryWeight),
  }), [dryWeight, wetWeight]);

  const lossResult = useMemo(() => calculateSoilPrepLoss({
    beforeWeightG: parseDecimalInput(beforeWeight),
    afterWeightG: parseDecimalInput(afterWeight),
  }), [afterWeight, beforeWeight]);

  const sieveResult = useMemo(() => calculateSoilSieveRate({
    passedWeightG: parseDecimalInput(passedWeight),
    totalWeightG: parseDecimalInput(totalWeight),
  }), [passedWeight, totalWeight]);

  const handleReset = () => {
    setActiveTab('moisture');
    setWetWeight('');
    setDryWeight('');
    setBeforeWeight('');
    setAfterWeight('');
    setPassedWeight('');
    setTotalWeight('');
  };

  return (
    <CalculatorShell
      title="土壤质控计算"
      actions={
        <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
          重置
        </button>
      }
    >
      <section className="app-panel p-4 md:p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setActiveTab('moisture')} data-active={activeTab === 'moisture'} className="app-segment">
            含水率
          </button>
          <button type="button" onClick={() => setActiveTab('prep')} data-active={activeTab === 'prep'} className="app-segment">
            制备质控
          </button>
        </div>

        {activeTab === 'moisture' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="湿重" unit="g" value={wetWeight} onChange={setWetWeight} required />
            <NumberInput label="干重" unit="g" value={dryWeight} onChange={setDryWeight} required />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberInput label="制备前重量" unit="g" value={beforeWeight} onChange={setBeforeWeight} required />
            <NumberInput label="制备后重量" unit="g" value={afterWeight} onChange={setAfterWeight} required />
            <NumberInput label="过筛重量" unit="g" value={passedWeight} onChange={setPassedWeight} required />
            <NumberInput label="总重量" unit="g" value={totalWeight} onChange={setTotalWeight} required />
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
    </CalculatorShell>
  );
}
