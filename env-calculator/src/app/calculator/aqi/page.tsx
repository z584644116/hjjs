'use client';

import React, { useMemo } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
import { useUrlState } from '@/hooks/useUrlState';
import { useRecordHistory } from '@/hooks/useRecordHistory';
import {
  AQI_POLLUTANTS,
  AqiPollutant,
  calculateAqi,
  getAqiPollutantInfo,
  parseDecimalInput,
} from '@/lib/calculators';

export default function AqiPage() {
  const [inputs, setInputs] = useUrlState({ p: 'PM2_5_24H', c: '55' });

  const pollutant: AqiPollutant = AQI_POLLUTANTS.some((x) => x.key === inputs.p)
    ? (inputs.p as AqiPollutant)
    : 'PM2_5_24H';

  const info = getAqiPollutantInfo(pollutant);
  const result = useMemo(
    () => calculateAqi(pollutant, parseDecimalInput(inputs.c)),
    [inputs.c, pollutant],
  );

  const summary = useMemo(() => {
    if ('error' in result) return '';
    if (inputs.c.trim() === '') return '';
    return `${info.name} ${inputs.c} ${info.unit} → IAQI ${result.iaqi.toFixed(0)} · ${result.level}`;
  }, [result, info.name, info.unit, inputs.c]);

  useRecordHistory(summary);

  const handleReset = () => setInputs({ p: 'PM2_5_24H', c: '' });

  return (
    <CalculatorShell
      title="AQI 空气质量指数"
      actions={
        <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
          重置
        </button>
      }
    >
      <section className="app-panel p-4 md:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="app-number-field">
            <label className="app-number-label" htmlFor="aqi-pollutant">污染物</label>
            <div className="app-number-control">
              <select
                id="aqi-pollutant"
                className="app-form-control px-3"
                value={pollutant}
                onChange={(event) => setInputs({ p: event.target.value })}
              >
                {AQI_POLLUTANTS.map((item) => (
                  <option key={item.key} value={item.key}>{item.name}</option>
                ))}
              </select>
            </div>
          </div>
          <NumberInput
            label="污染物浓度"
            unit={info.unit}
            value={inputs.c}
            onChange={(v) => setInputs({ c: v })}
            required
          />
        </div>
      </section>

      {'error' in result ? (
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
          {result.error}
        </div>
      ) : (
        <ResultDisplay
          title={info.name}
          standard={`当前输入单位:${info.unit}`}
          items={[
            { label: 'IAQI', value: result.iaqi.toFixed(0), status: result.iaqi > 100 ? 'warning' : 'success' },
            { label: '空气质量级别', value: result.level, status: result.iaqi > 100 ? 'warning' : 'success' },
          ]}
        />
      )}
    </CalculatorShell>
  );
}
