'use client';

import React, { useMemo, useState } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import FormulaModuleShell, { FormulaModuleOption } from '@/components/FormulaModuleShell';
import NumberInput from '@/components/NumberInput';
import PasteBulkInput from '@/components/PasteBulkInput';
import ResultDisplay from '@/components/ResultDisplay';
import {
  calculateDixon,
  calculateGrubbs,
  calculateRpd,
  calculateTwoSampleT,
  parseDecimalInput,
  parseNumberList,
} from '@/lib/calculators';

type QcFormula = 'rpd' | 'grubbs' | 'dixon' | 'ttest';

const formulaModules: FormulaModuleOption[] = [
  {
    key: 'rpd',
    title: '相对偏差 RPD',
    group: '平行样',
    description: '两个平行样相对偏差计算,自带常规 / 痕量多档位合格判定。',
    formula: 'RPD = |x₁ − x₂| / ((x₁ + x₂) / 2) × 100%',
  },
  {
    key: 'grubbs',
    title: 'Grubbs 极值检验',
    group: '离群点检验',
    description: '正态样本离群值判别(GB/T 4883 单侧 α=0.05),自动输出剔除后统计。',
    formula: 'G = |x_extreme − x̄| / s;G > G_crit(n, α) → 离群',
  },
  {
    key: 'dixon',
    title: 'Dixon Q 检验',
    group: '离群点检验',
    description: '按 n 选用 r₁₀ / r₁₁ / r₂₁ / r₂₂ 四种统计量,适用 n = 3 ~ 30。',
    formula: 'Q = (疑似 − 最近) / 极差范围;Q > Q_crit → 离群',
  },
  {
    key: 'ttest',
    title: '双样本 t 检验',
    group: '双组比对',
    description: 'Welch t 检验,用于方法比对 / 操作员比对 / 标样稳定性验证。',
    formula: 't = (x̄₁ − x̄₂) / √(s₁²/n₁ + s₂²/n₂);Welch-Satterthwaite df',
  },
];

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
      {message}
    </div>
  );
}

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-1 rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] p-1"
    >
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={`rounded-[var(--app-radius-sm)] px-3.5 py-1.5 text-xs font-bold transition-colors ${
              isActive
                ? 'bg-[var(--app-primary)] text-white'
                : 'text-[var(--app-ink-secondary)] hover:text-[var(--app-ink)]'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

type RpdPreset = '10' | '20' | '30' | '50' | 'custom';

export default function QcStatsPage() {
  const [active, setActive] = useState<QcFormula>('rpd');

  // RPD ——
  const [rpdX1, setRpdX1] = useState('0.245');
  const [rpdX2, setRpdX2] = useState('0.258');
  const [rpdPreset, setRpdPreset] = useState<RpdPreset>('20');
  const [rpdCustom, setRpdCustom] = useState('20');
  const rpdThreshold = rpdPreset === 'custom' ? parseDecimalInput(rpdCustom) : Number(rpdPreset);

  // Grubbs ——
  const [grubbsData, setGrubbsData] = useState('12.3, 12.5, 12.4, 12.6, 12.5, 15.8, 12.4, 12.3');

  // Dixon ——
  const [dixonData, setDixonData] = useState('8.2, 8.3, 8.25, 8.28, 8.5, 9.8');

  // t 检验 ——
  const [ttestA, setTtestA] = useState('10.2, 10.4, 10.3, 10.5, 10.1, 10.3');
  const [ttestB, setTtestB] = useState('10.8, 10.9, 11.0, 10.7, 10.9, 11.1');
  const [labelA, setLabelA] = useState('方法 A');
  const [labelB, setLabelB] = useState('方法 B');

  // --- 计算 ---

  const rpdResult = useMemo(
    () =>
      calculateRpd({
        x1: parseDecimalInput(rpdX1),
        x2: parseDecimalInput(rpdX2),
        threshold: rpdThreshold,
      }),
    [rpdX1, rpdX2, rpdThreshold],
  );

  const grubbsValues = useMemo(() => parseNumberList(grubbsData), [grubbsData]);
  const grubbsResult = useMemo(() => calculateGrubbs(grubbsValues), [grubbsValues]);

  const dixonValues = useMemo(() => parseNumberList(dixonData), [dixonData]);
  const dixonResult = useMemo(() => calculateDixon(dixonValues), [dixonValues]);

  const ttestResult = useMemo(
    () =>
      calculateTwoSampleT({
        group1: parseNumberList(ttestA),
        group2: parseNumberList(ttestB),
        label1: labelA.trim() || '第 1 组',
        label2: labelB.trim() || '第 2 组',
      }),
    [ttestA, ttestB, labelA, labelB],
  );

  const handleReset = () => {
    setActive('rpd');
    setRpdX1('0.245');
    setRpdX2('0.258');
    setRpdPreset('20');
    setRpdCustom('20');
    setGrubbsData('12.3, 12.5, 12.4, 12.6, 12.5, 15.8, 12.4, 12.3');
    setDixonData('8.2, 8.3, 8.25, 8.28, 8.5, 9.8');
    setTtestA('10.2, 10.4, 10.3, 10.5, 10.1, 10.3');
    setTtestB('10.8, 10.9, 11.0, 10.7, 10.9, 11.1');
    setLabelA('方法 A');
    setLabelB('方法 B');
  };

  const actions = (
    <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
      重置
    </button>
  );

  return (
    <CalculatorShell title="质控统计" actions={actions}>
      <FormulaModuleShell
        modules={formulaModules}
        activeKey={active}
        onChange={(k) => setActive(k as QcFormula)}
      >
        <section className="app-panel space-y-4 p-4 md:p-5">
          {active === 'rpd' && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <NumberInput label="平行样 1 (x₁)" value={rpdX1} onChange={setRpdX1} required />
                <NumberInput label="平行样 2 (x₂)" value={rpdX2} onChange={setRpdX2} required />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-black text-[var(--app-ink-secondary)]">合格阈值</span>
                <SegmentControl<RpdPreset>
                  options={[
                    { value: '10', label: '严格 10%' },
                    { value: '20', label: '常规 20%' },
                    { value: '30', label: '痕量 30%' },
                    { value: '50', label: '超痕量 50%' },
                    { value: 'custom', label: '自定义' },
                  ]}
                  value={rpdPreset}
                  onChange={setRpdPreset}
                  ariaLabel="RPD 合格阈值"
                />
                {rpdPreset === 'custom' && (
                  <div className="w-28">
                    <NumberInput
                      label=""
                      unit="%"
                      value={rpdCustom}
                      onChange={setRpdCustom}
                      hint="填入合格阈值"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {active === 'grubbs' && (
            <PasteBulkInput
              label="原始数据"
              value={grubbsData}
              onChange={setGrubbsData}
              placeholder="粘贴 3 ~ 100 个数值,空格 / 逗号 / 换行均可"
              hint="Grubbs 要求数据近似正态分布"
              minValues={3}
              maxValues={100}
              rows={5}
              required
            />
          )}

          {active === 'dixon' && (
            <PasteBulkInput
              label="原始数据"
              value={dixonData}
              onChange={setDixonData}
              placeholder="粘贴 3 ~ 30 个数值"
              hint="Dixon 适用小样本(n ≤ 30)"
              minValues={3}
              maxValues={30}
              rows={5}
              required
            />
          )}

          {active === 'ttest' && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-[var(--app-ink-secondary)]">
                    第 1 组标签
                  </label>
                  <input
                    type="text"
                    value={labelA}
                    onChange={(e) => setLabelA(e.target.value)}
                    placeholder="方法 A"
                    className="min-h-[42px] rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-ink)] outline-none transition-colors focus:border-[var(--app-primary)]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-black text-[var(--app-ink-secondary)]">
                    第 2 组标签
                  </label>
                  <input
                    type="text"
                    value={labelB}
                    onChange={(e) => setLabelB(e.target.value)}
                    placeholder="方法 B"
                    className="min-h-[42px] rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-ink)] outline-none transition-colors focus:border-[var(--app-primary)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <PasteBulkInput
                  label={`${labelA.trim() || '第 1 组'} 数据`}
                  value={ttestA}
                  onChange={setTtestA}
                  placeholder="粘贴 ≥ 2 个数值"
                  minValues={2}
                  rows={5}
                  required
                />
                <PasteBulkInput
                  label={`${labelB.trim() || '第 2 组'} 数据`}
                  value={ttestB}
                  onChange={setTtestB}
                  placeholder="粘贴 ≥ 2 个数值"
                  minValues={2}
                  rows={5}
                  required
                />
              </div>
            </>
          )}
        </section>

        {/* ========== 结果区 ========== */}

        {active === 'rpd' &&
          ('error' in rpdResult ? (
            <ErrorBox message={rpdResult.error} />
          ) : (
            <ResultDisplay
              title="相对偏差 RPD"
              standard={`阈值 ${rpdResult.threshold}%${
                rpdResult.level === 'strict'
                  ? '(严格)'
                  : rpdResult.level === 'normal'
                    ? '(常规)'
                    : rpdResult.level === 'trace'
                      ? '(痕量)'
                      : ''
              }`}
              items={[
                { label: '均值', value: rpdResult.mean },
                { label: '绝对偏差', value: rpdResult.difference },
                {
                  label: 'RPD',
                  value: `${rpdResult.rpd.toFixed(3)} %`,
                  status: rpdResult.passed ? 'success' : 'danger',
                },
                {
                  label: '判定',
                  value: rpdResult.passed ? '合格' : '超差',
                  status: rpdResult.passed ? 'success' : 'danger',
                },
              ]}
            />
          ))}

        {active === 'grubbs' &&
          ('error' in grubbsResult ? (
            <ErrorBox message={grubbsResult.error} />
          ) : (
            <ResultDisplay
              title="Grubbs 极值检验"
              standard={`n = ${grubbsResult.n},G_crit(α=0.05) = ${grubbsResult.gCritical}`}
              items={[
                { label: '样本量 n', value: grubbsResult.n },
                { label: '均值 x̄', value: grubbsResult.mean },
                { label: '标准差 s', value: grubbsResult.stdev },
                {
                  label: 'G_max(最大值)',
                  value: grubbsResult.suspects[0].g.toFixed(4),
                  status:
                    grubbsResult.suspects[0].g > grubbsResult.gCritical ? 'danger' : 'success',
                },
                {
                  label: 'G_min(最小值)',
                  value: grubbsResult.suspects[1].g.toFixed(4),
                  status:
                    grubbsResult.suspects[1].g > grubbsResult.gCritical ? 'danger' : 'success',
                },
                {
                  label: '离群值个数',
                  value: grubbsResult.outliers.length,
                  status: grubbsResult.outliers.length === 0 ? 'success' : 'warning',
                },
                ...(grubbsResult.outliers.length > 0
                  ? [
                      {
                        label: '剔除后 n',
                        value: grubbsResult.cleanedData.length,
                      },
                      {
                        label: '剔除后均值',
                        value: grubbsResult.cleanedMean,
                      },
                      {
                        label: '剔除后 RSD',
                        value: `${grubbsResult.cleanedRsd.toFixed(3)} %`,
                      },
                    ]
                  : []),
              ]}
              details={
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold">疑似极值:</span>
                    <ul className="ml-4 list-disc">
                      {grubbsResult.suspects.map((s) => (
                        <li key={`${s.position}-${s.index}`}>
                          {s.position === 'max' ? '最大值' : '最小值'} = {s.value}(位置 #
                          {s.index + 1}),G = {s.g}
                          {s.g > grubbsResult.gCritical ? ' → 离群' : ' → 保留'}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {grubbsResult.outliers.length > 0 && (
                    <div>
                      <span className="font-bold">剔除后数据:</span>
                      <div className="mt-1 rounded bg-[var(--app-surface-muted,#f7f8fa)] p-2 font-mono">
                        {grubbsResult.cleanedData.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              }
            />
          ))}

        {active === 'dixon' &&
          ('error' in dixonResult ? (
            <ErrorBox message={dixonResult.error} />
          ) : (
            <ResultDisplay
              title="Dixon Q 检验"
              standard={`n = ${dixonResult.n},统计量 ${dixonResult.statistic.toUpperCase()},Q_crit(α=0.05) = ${dixonResult.qCritical}`}
              items={[
                { label: '样本量 n', value: dixonResult.n },
                { label: '使用统计量', value: dixonResult.statistic.toUpperCase() },
                {
                  label: 'Q_min',
                  value: dixonResult.suspects[0].q.toFixed(4),
                  status:
                    dixonResult.suspects[0].q > dixonResult.qCritical ? 'danger' : 'success',
                },
                {
                  label: 'Q_max',
                  value: dixonResult.suspects[1].q.toFixed(4),
                  status:
                    dixonResult.suspects[1].q > dixonResult.qCritical ? 'danger' : 'success',
                },
                {
                  label: '离群值个数',
                  value: dixonResult.outliers.length,
                  status: dixonResult.outliers.length === 0 ? 'success' : 'warning',
                },
                ...(dixonResult.outliers.length > 0
                  ? [
                      {
                        label: '剔除后 n',
                        value: dixonResult.cleanedData.length,
                      },
                    ]
                  : []),
              ]}
              details={
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold">排序后数据:</span>
                    <div className="mt-1 rounded bg-[var(--app-surface-muted,#f7f8fa)] p-2 font-mono">
                      {dixonResult.sorted.join(', ')}
                    </div>
                  </div>
                  <div>
                    <span className="font-bold">疑似极值:</span>
                    <ul className="ml-4 list-disc">
                      {dixonResult.suspects.map((s, i) => (
                        <li key={`${s.position}-${i}`}>
                          {s.position === 'max' ? '最大值' : '最小值'} = {s.value},公式{' '}
                          {s.formula},Q = {s.q}
                          {s.q > dixonResult.qCritical ? ' → 离群' : ' → 保留'}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {dixonResult.outliers.length > 0 && (
                    <div>
                      <span className="font-bold">剔除后数据:</span>
                      <div className="mt-1 rounded bg-[var(--app-surface-muted,#f7f8fa)] p-2 font-mono">
                        {dixonResult.cleanedData.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              }
            />
          ))}

        {active === 'ttest' &&
          ('error' in ttestResult ? (
            <ErrorBox message={ttestResult.error} />
          ) : (
            <ResultDisplay
              title="双样本 Welch t 检验"
              standard={`df = ${ttestResult.df},t_crit(α=0.05 双边) = ${ttestResult.tCritical}`}
              items={[
                {
                  label: `${ttestResult.label1} n₁`,
                  value: ttestResult.n1,
                },
                {
                  label: `${ttestResult.label1} 均值`,
                  value: ttestResult.mean1,
                },
                {
                  label: `${ttestResult.label1} 标准差`,
                  value: ttestResult.sd1,
                },
                {
                  label: `${ttestResult.label2} n₂`,
                  value: ttestResult.n2,
                },
                {
                  label: `${ttestResult.label2} 均值`,
                  value: ttestResult.mean2,
                },
                {
                  label: `${ttestResult.label2} 标准差`,
                  value: ttestResult.sd2,
                },
                {
                  label: '均值差',
                  value: ttestResult.meanDifference,
                },
                {
                  label: 't 统计量',
                  value: ttestResult.tStat.toFixed(4),
                  status: ttestResult.significantDifference ? 'danger' : 'success',
                },
                {
                  label: '结论',
                  value: ttestResult.significantDifference ? '存在显著差异' : '无显著差异',
                  status: ttestResult.significantDifference ? 'danger' : 'success',
                },
              ]}
              details={<div className="text-xs">{ttestResult.conclusion}</div>}
            />
          ))}
      </FormulaModuleShell>
    </CalculatorShell>
  );
}
