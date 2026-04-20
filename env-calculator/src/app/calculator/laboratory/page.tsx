'use client';

import React, { useMemo, useState } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import FormulaModuleShell, { FormulaModuleOption } from '@/components/FormulaModuleShell';
import NumberInput from '@/components/NumberInput';
import PasteBulkInput from '@/components/PasteBulkInput';
import ResultDisplay from '@/components/ResultDisplay';
import {
  calculateDilutionSeries,
  calculateDilutionSingle,
  calculateLinearRegression,
  calculateSampleRecalc,
  calculateTitration,
  designDilution,
  parseDecimalInput,
  parseNumberList,
  type DilutionDesignMode,
  type DilutionDesignResult,
  type DilutionProposal,
  type DilutionSolveFor,
  type FinalVolumeMode,
  type RegressionPoint,
  type SampleMatrix,
} from '@/lib/calculators';
import {
  STANDARD_FLASK_SIZES_ML,
  STANDARD_PIPETTE_SIZES_ML,
} from '@/standards';

type LabFormula = 'dilution' | 'regression' | 'sample' | 'titration';

const formulaModules: FormulaModuleOption[] = [
  {
    key: 'dilution',
    title: '溶液稀释',
    group: '溶液制备',
    description: '三种模式:单级 C₁V₁=C₂V₂、等比连续、方案设计(按玻璃器具自动匹配最优组合,含不确定度)。',
    formula: 'C₁·V₁ = C₂·V₂;方案设计依据 JJG 196-2006 允差 + JJF 1059.1-2012 不确定度',
  },
  {
    key: 'regression',
    title: '标准曲线线性回归',
    group: '曲线与检出限',
    description: '最小二乘线性回归,输出 R²、残差、基于回归的 MDL / LOQ。',
    formula: 'y = a·x + b;MDL = 3.3·s(y/x) / |a|;LOQ = 10·s(y/x) / |a|',
  },
  {
    key: 'sample',
    title: '样品浓度回算',
    group: '前处理回算',
    description: '仪器读数 → 扣空白 → 定容/稀释/干重 回算为样品浓度(mg/L 或 mg/kg)。',
    formula: 'ρ = (C_inst − C_b)·V_f·f / V_s(或 m_s·(1 − w))',
  },
  {
    key: 'titration',
    title: '滴定计算',
    group: '容量分析',
    description: '酸碱 / 络合 / 氧化还原通用模板:滴定剂浓度 × 反应比 → 样品浓度。',
    formula: 'c_x = (c_T·(V_T − V_b) / n_rxn)·f / V_s',
  },
];

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
      {message}
    </div>
  );
}

function RatingStars({ rating }: { rating: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <span className="font-bold tracking-wider text-[var(--app-warning)]">
      {'★'.repeat(rating)}
      <span className="text-[var(--app-ink-tertiary)]">{'☆'.repeat(5 - rating)}</span>
    </span>
  );
}

function ProposalCard({ proposal, index }: { proposal: DilutionProposal; index: number }) {
  const isTop = index === 0;
  const hasUnconfirmed = proposal.steps.some(
    (s) => !s.pipette.pdfConfirmed || !s.flask.pdfConfirmed,
  );
  return (
    <div
      className={`rounded-[var(--app-radius-lg)] border p-4 ${
        isTop
          ? 'border-[var(--app-primary)] bg-[var(--app-primary-light,rgba(0,120,212,0.05))]'
          : 'border-[var(--app-line)] bg-[var(--app-surface)]'
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-sm font-black text-[var(--app-ink)]">
          方案 {index + 1} {isTop && '· 推荐'}
        </span>
        <RatingStars rating={proposal.rating} />
        <span className="basis-full text-xs font-medium text-[var(--app-ink-secondary)] sm:basis-auto">
          {proposal.levels} 级 · 总倍数 {proposal.totalFactor.toFixed(4)}×(偏差{' '}
          {proposal.factorDeviationPercent >= 0 ? '+' : ''}
          {proposal.factorDeviationPercent.toFixed(3)}%)
        </span>
        <span className="text-xs font-bold text-[var(--app-primary)]">
          U(k=2) ≈ {proposal.expandedUPercent.toFixed(3)}%
        </span>
        {proposal.usesAdjustedTake && (
          <span className="rounded-[var(--app-radius-sm)] border border-[var(--app-warning)] bg-[var(--app-warning-light)] px-2 py-0.5 text-[10px] font-bold text-[var(--app-warning)]">
            非满刻度读数
          </span>
        )}
        {hasUnconfirmed && (
          <span className="rounded-[var(--app-radius-sm)] border border-[var(--app-warning)] bg-[var(--app-warning-light)] px-2 py-0.5 text-[10px] font-bold text-[var(--app-warning)]">
            允差待核对
          </span>
        )}
      </div>

      <div className="mb-2 flex flex-wrap gap-3 text-[11px] text-[var(--app-ink-tertiary)]">
        <span>稀释操作 u_rel = {proposal.dilutionURelPercent.toFixed(3)}%</span>
        <span>母液 C₀ u_rel = {proposal.c0URelPercent.toFixed(3)}%</span>
        <span>合成 u_c = {proposal.combinedURelPercent.toFixed(3)}%</span>
      </div>

      <div className="mb-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-xs">
          <thead className="text-[var(--app-ink-tertiary)]">
            <tr className="border-b border-[var(--app-line)]">
              <th className="py-1 pr-3 text-left">级</th>
              <th className="py-1 pr-3 text-left">倍数</th>
              <th className="py-1 pr-3 text-left">吸管(量程)</th>
              <th className="py-1 pr-3 text-left">实际取液</th>
              <th className="py-1 pr-3 text-left">定容</th>
              <th className="py-1 pr-3 text-left">起止浓度</th>
              <th className="py-1 pr-3 text-left">u_rel 本级</th>
            </tr>
          </thead>
          <tbody>
            {proposal.steps.map((s) => {
              const takeText =
                s.takeTimes > 1
                  ? `${s.actualTakeMl.toFixed(3)} mL(分${s.takeTimes}次)`
                  : `${s.actualTakeMl.toFixed(3)} mL`;
              return (
                <tr key={s.level} className="border-b border-[var(--app-line)]/50">
                  <td className="py-1 pr-3 font-bold">{s.level}</td>
                  <td className="py-1 pr-3">{s.factor.toFixed(3)}×</td>
                  <td className="py-1 pr-3">
                    {s.pipette.volumeMl}(±{s.pipette.toleranceMl})
                    <span className="ml-1 text-[10px] text-[var(--app-ink-tertiary)]">
                      {s.pipette.kind === 'volumetric_pipette'
                        ? '单标线'
                        : s.pipette.kind === 'graduated_pipette'
                          ? '分度'
                          : '可调'}
                    </span>
                  </td>
                  <td className="py-1 pr-3">
                    {takeText}
                    {s.isFinalAdjusted && (
                      <span className="ml-1 rounded-[var(--app-radius-sm)] bg-[var(--app-warning)] px-1.5 py-0.5 text-[9px] font-bold text-white">
                        非满刻度
                      </span>
                    )}
                  </td>
                  <td className="py-1 pr-3">
                    {s.flask.volumeMl}(±{s.flask.toleranceMl})
                  </td>
                  <td className="py-1 pr-3">
                    {s.cFrom.toPrecision(4)} → {s.cTo.toPrecision(4)}
                  </td>
                  <td className="py-1 pr-3">{s.uRelPercent.toFixed(3)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-1 text-[10px] text-[var(--app-ink-tertiary)]">
          标签说明:单标线 = 单标线吸量管(仅移取标称体积);分度 = 分度吸量管;可调 = 可调移液器。
          「非满刻度」徽章表示该级使用分度吸量管 / 可调移液器的任意读数,不确定度应按对应检定/校准数据核算。
        </p>
      </div>

      <div className="space-y-1">
        {proposal.steps.map((s) => (
          <p key={`op-${s.level}`} className="text-xs leading-relaxed text-[var(--app-ink-secondary)]">
            {s.instruction}
          </p>
        ))}
      </div>

      {proposal.warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {proposal.warnings.map((w, i) => (
            <p
              key={`w-${i}`}
              className="text-xs font-medium text-[var(--app-warning)]"
            >
              ⚠ {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function DilutionDesignResultView({
  result,
}: {
  result: DilutionDesignResult | { error: string };
}) {
  if ('error' in result) {
    return <ErrorBox message={result.error} />;
  }
  if (result.proposals.length === 0) {
    return (
      <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-warning)] bg-[var(--app-warning-light)] p-4 text-sm font-medium text-[var(--app-warning)]">
        {result.message ?? '未找到可行方案'}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] px-4 py-3 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
        <span className="font-bold text-[var(--app-ink)]">
          请求总稀释倍数 {result.requestedTotalFactor.toFixed(2)}×
        </span>
        <span className="text-[var(--app-ink-tertiary)]">
          候选池 {result.searchPoolSize} 组单级稀释单元
        </span>
        <span className="text-[var(--app-ink-tertiary)]">
          命中 {result.proposals.length} 个方案,优先按最终体积匹配度排序
        </span>
      </div>
      {result.proposals.map((p, i) => (
        <ProposalCard key={p.id} proposal={p} index={i} />
      ))}
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
      className="inline-flex flex-wrap gap-1.5 rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] p-1.5"
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
            className={`min-h-[36px] rounded-[var(--app-radius-sm)] px-4 py-2 text-xs font-bold transition-colors ${
              isActive
                ? 'bg-[var(--app-primary)] text-white shadow-sm'
                : 'text-[var(--app-ink-secondary)] hover:bg-[var(--app-line)]/40 hover:text-[var(--app-ink)]'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function LaboratoryPage() {
  const [active, setActive] = useState<LabFormula>('dilution');

  // 稀释 ——
  const [dilMode, setDilMode] = useState<'single' | 'series' | 'design'>('single');
  const [solveFor, setSolveFor] = useState<DilutionSolveFor>('v1');
  const [c1, setC1] = useState('');
  const [v1, setV1] = useState('');
  const [c2, setC2] = useState('');
  const [v2, setV2] = useState('');
  const [c0, setC0] = useState('');
  const [cFinal, setCFinal] = useState('');
  const [vLevel, setVLevel] = useState('');
  const [levels, setLevels] = useState('');

  // 稀释 —— 方案设计模式(design)
  const [dC0, setDC0] = useState('');
  const [dCTarget, setDCTarget] = useState('');
  const [dVNeed, setDVNeed] = useState('');
  const [dC0Avail, setDC0Avail] = useState('');
  const [dMaxLevels, setDMaxLevels] = useState<'1' | '2' | '3'>('2');
  const [dFlaskGrade, setDFlaskGrade] = useState<'A' | 'B'>('A');
  const [dPipetteGrade, setDPipetteGrade] = useState<'A' | 'B'>('A');
  const [dFactorTol, setDFactorTol] = useState('');
  const [dURelC0, setDURelC0] = useState('');
  const [dDesignMode, setDDesignMode] = useState<DilutionDesignMode>('standard');
  const [dFinalVolumeMode, setDFinalVolumeMode] =
    useState<FinalVolumeMode>('exact-or-nearest');
  const [dSelectedFlasks, setDSelectedFlasks] = useState<number[]>([
    10, 25, 50, 100, 250, 500, 1000,
  ]);
  const [dSelectedPipettes, setDSelectedPipettes] = useState<number[]>([
    1, 2, 5, 10, 25, 50,
  ]);

  // 标准曲线 ——
  const [xList, setXList] = useState('');
  const [yList, setYList] = useState('');

  // 样品回算 ——
  const [matrix, setMatrix] = useState<SampleMatrix>('liquid');
  const [cInst, setCInst] = useState('');
  const [cBlank, setCBlank] = useState('');
  const [vFinalS, setVFinalS] = useState('');
  const [dilF, setDilF] = useState('');
  const [vSample, setVSample] = useState('');
  const [mSample, setMSample] = useState('');
  const [moisture, setMoisture] = useState('');

  // 滴定 ——
  const [cT, setCT] = useState('');
  const [vT, setVT] = useState('');
  const [vBlank, setVBlank] = useState('');
  const [vSampleT, setVSampleT] = useState('');
  const [reactionRatio, setReactionRatio] = useState('');
  const [molarMass, setMolarMass] = useState('');
  const [dilFt, setDilFt] = useState('');

  // --- 结果 ---

  const dilSingleResult = useMemo(
    () =>
      calculateDilutionSingle({
        c1: parseDecimalInput(c1),
        v1: parseDecimalInput(v1),
        c2: parseDecimalInput(c2),
        v2: parseDecimalInput(v2),
        solveFor,
      }),
    [c1, v1, c2, v2, solveFor],
  );

  const dilSeriesResult = useMemo(
    () =>
      calculateDilutionSeries({
        c0: parseDecimalInput(c0),
        cFinal: parseDecimalInput(cFinal),
        vFinal: parseDecimalInput(vLevel),
        levels: Math.floor(parseDecimalInput(levels)),
      }),
    [c0, cFinal, vLevel, levels],
  );

  const dilDesignResult = useMemo(() => {
    const c0AvailNum = parseDecimalInput(dC0Avail);
    const uC0Num = parseDecimalInput(dURelC0);
    const factorTolNum = parseDecimalInput(dFactorTol);
    return designDilution({
      c0: parseDecimalInput(dC0),
      cTarget: parseDecimalInput(dCTarget),
      vNeedMl: parseDecimalInput(dVNeed),
      c0AvailableMl: Number.isFinite(c0AvailNum) && c0AvailNum > 0 ? c0AvailNum : undefined,
      availableFlaskSizesMl: dSelectedFlasks.slice().sort((a, b) => a - b),
      flaskGrade: dFlaskGrade,
      availablePipetteSizesMl: dSelectedPipettes.slice().sort((a, b) => a - b),
      pipetteGrade: dPipetteGrade,
      maxLevels: Number(dMaxLevels) as 1 | 2 | 3,
      factorTolerancePercent:
        Number.isFinite(factorTolNum) && factorTolNum >= 0 ? factorTolNum : 2,
      uRelC0Percent: Number.isFinite(uC0Num) && uC0Num >= 0 ? uC0Num : 0.5,
      designMode: dDesignMode,
      finalVolumeMode: dFinalVolumeMode,
      topN: 5,
    });
  }, [
    dC0,
    dCTarget,
    dVNeed,
    dC0Avail,
    dSelectedFlasks,
    dFlaskGrade,
    dSelectedPipettes,
    dPipetteGrade,
    dMaxLevels,
    dFactorTol,
    dURelC0,
    dDesignMode,
    dFinalVolumeMode,
  ]);

  const xs = useMemo(() => parseNumberList(xList), [xList]);
  const ys = useMemo(() => parseNumberList(yList), [yList]);
  const regressionCountMismatch = xs.length !== ys.length;
  const regressionPoints: RegressionPoint[] = useMemo(() => {
    const n = Math.min(xs.length, ys.length);
    const pts: RegressionPoint[] = [];
    for (let i = 0; i < n; i++) pts.push({ x: xs[i], y: ys[i] });
    return pts;
  }, [xs, ys]);
  const regressionResult = useMemo(
    () => calculateLinearRegression(regressionPoints),
    [regressionPoints],
  );

  const sampleResult = useMemo(
    () =>
      calculateSampleRecalc({
        matrix,
        cInstrument: parseDecimalInput(cInst),
        cBlank: parseDecimalInput(cBlank),
        vFinal: parseDecimalInput(vFinalS),
        dilutionFactor: parseDecimalInput(dilF),
        vSample: matrix === 'liquid' ? parseDecimalInput(vSample) : undefined,
        mSample: matrix === 'solid' ? parseDecimalInput(mSample) : undefined,
        moisture: matrix === 'solid' ? parseDecimalInput(moisture) : 0,
      }),
    [matrix, cInst, cBlank, vFinalS, dilF, vSample, mSample, moisture],
  );

  const titrationResult = useMemo(
    () =>
      calculateTitration({
        cTitrant: parseDecimalInput(cT),
        vTitrant: parseDecimalInput(vT),
        vBlank: parseDecimalInput(vBlank),
        vSample: parseDecimalInput(vSampleT),
        reactionRatio: parseDecimalInput(reactionRatio),
        molarMass: molarMass.trim() ? parseDecimalInput(molarMass) : undefined,
        dilutionFactor: parseDecimalInput(dilFt),
      }),
    [cT, vT, vBlank, vSampleT, reactionRatio, molarMass, dilFt],
  );

  const handleReset = () => {
    // 只重置当前 active 子模块(含稀释的 dilMode 子模式)的输入,
    // 不改变 active / dilMode / 器具勾选 / 类型选择等配置
    if (active === 'dilution') {
      if (dilMode === 'single') {
        setC1('');
        setV1('');
        setC2('');
        setV2('');
      } else if (dilMode === 'series') {
        setC0('');
        setCFinal('');
        setVLevel('');
        setLevels('');
      } else {
        setDC0('');
        setDCTarget('');
        setDVNeed('');
        setDC0Avail('');
        setDFactorTol('');
        setDURelC0('');
      }
      return;
    }
    if (active === 'regression') {
      setXList('');
      setYList('');
      return;
    }
    if (active === 'sample') {
      setCInst('');
      setCBlank('');
      setVFinalS('');
      setDilF('');
      setVSample('');
      setMSample('');
      setMoisture('');
      return;
    }
    if (active === 'titration') {
      setCT('');
      setVT('');
      setVBlank('');
      setVSampleT('');
      setReactionRatio('');
      setMolarMass('');
      setDilFt('');
    }
  };

  const actions = (
    <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
      重置
    </button>
  );

  return (
    <CalculatorShell title="实验室分析" actions={actions}>
      <FormulaModuleShell
        modules={formulaModules}
        activeKey={active}
        onChange={(k) => setActive(k as LabFormula)}
      >
        <section className="app-panel space-y-5 p-4 md:p-5">
          {active === 'dilution' && (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <span className="text-sm font-black text-[var(--app-ink-secondary)]">计算模式</span>
                <SegmentControl
                  options={[
                    { value: 'single', label: '单级 C₁V₁=C₂V₂' },
                    { value: 'series', label: '等比连续稀释' },
                    { value: 'design', label: '方案设计 (推荐)' },
                  ]}
                  value={dilMode}
                  onChange={setDilMode}
                  ariaLabel="稀释计算模式"
                />
              </div>

              {dilMode === 'single' && (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                    <span className="text-xs font-bold text-[var(--app-ink-secondary)]">待求解</span>
                    <SegmentControl<DilutionSolveFor>
                      options={[
                        { value: 'c1', label: 'C₁' },
                        { value: 'v1', label: 'V₁' },
                        { value: 'c2', label: 'C₂' },
                        { value: 'v2', label: 'V₂' },
                      ]}
                      value={solveFor}
                      onChange={setSolveFor}
                      ariaLabel="选择待求解参数"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <NumberInput
                      label="母液浓度 C₁"
                      value={c1}
                      onChange={setC1}
                      disabled={solveFor === 'c1'}
                      hint={solveFor === 'c1' ? '待求' : undefined}
                      required={solveFor !== 'c1'}
                    />
                    <NumberInput
                      label="取液量 V₁"
                      unit="mL"
                      value={v1}
                      onChange={setV1}
                      disabled={solveFor === 'v1'}
                      hint={solveFor === 'v1' ? '待求' : undefined}
                      required={solveFor !== 'v1'}
                    />
                    <NumberInput
                      label="目标浓度 C₂"
                      value={c2}
                      onChange={setC2}
                      disabled={solveFor === 'c2'}
                      hint={solveFor === 'c2' ? '待求' : undefined}
                      required={solveFor !== 'c2'}
                    />
                    <NumberInput
                      label="目标体积 V₂"
                      unit="mL"
                      value={v2}
                      onChange={setV2}
                      disabled={solveFor === 'v2'}
                      hint={solveFor === 'v2' ? '待求' : undefined}
                      required={solveFor !== 'v2'}
                    />
                  </div>
                </>
              )}

              {dilMode === 'series' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <NumberInput label="母液浓度 C₀" value={c0} onChange={setC0} required />
                  <NumberInput
                    label="目标浓度 C_final"
                    value={cFinal}
                    onChange={setCFinal}
                    required
                  />
                  <NumberInput
                    label="每级定容 V_final"
                    unit="mL"
                    value={vLevel}
                    onChange={setVLevel}
                    required
                  />
                  <NumberInput
                    label="稀释级数 n"
                    value={levels}
                    onChange={setLevels}
                    hint="1 ~ 10 整数"
                    required
                  />
                </div>
              )}

              {dilMode === 'design' && (
                <div className="space-y-4">
                  <div className="rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] px-3 py-2 text-xs font-medium text-[var(--app-ink-tertiary)]">
                    依据 JJG 196-2006 A/B 级允差 + JJF 1059.1-2012(均匀分布 u=a/√3,扩展因子 k=2),
                    在可用玻璃器具池中自动匹配 Top-5 稀释方案。仅 A 级数值已由用户核对,B 级 / 微量移液器为占位值。
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <NumberInput label="母液浓度 C₀" value={dC0} onChange={setDC0} required />
                    <NumberInput label="目标浓度 C" value={dCTarget} onChange={setDCTarget} required />
                    <NumberInput
                      label="需要体积 V_need"
                      unit="mL"
                      value={dVNeed}
                      onChange={setDVNeed}
                      required
                      hint="最后一级容量瓶按「最终体积策略」选择"
                    />
                    <NumberInput
                      label="母液可用量(可选)"
                      unit="mL"
                      value={dC0Avail}
                      onChange={setDC0Avail}
                      hint="留空不限制;首级总消耗超过此值将判定不可行"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-[var(--app-ink-secondary)]">方案模式</span>
                      <SegmentControl<DilutionDesignMode>
                        options={[
                          { value: 'standard', label: '规范(默认)' },
                          { value: 'smart', label: '智能' },
                        ]}
                        value={dDesignMode}
                        onChange={setDDesignMode}
                        ariaLabel="方案运行模式"
                      />
                      <span className="text-[10px] text-[var(--app-ink-tertiary)]">
                        规范模式仅用单标线吸量管固定体积组合(适合 CMA/CNAS);智能模式允许最后一级使用可调移液器 / 分度吸量管。
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-[var(--app-ink-secondary)]">最终体积策略</span>
                      <SegmentControl<FinalVolumeMode>
                        options={[
                          { value: 'exact-or-nearest', label: '精确或最近' },
                          { value: 'exact-only', label: '仅精确' },
                          { value: 'at-least', label: '允许更大' },
                        ]}
                        value={dFinalVolumeMode}
                        onChange={setDFinalVolumeMode}
                        ariaLabel="最终容量瓶选择策略"
                      />
                      <span className="text-[10px] text-[var(--app-ink-tertiary)]">
                        默认优先 V_need 精确命中;无精确规格时用最小 ≥ V_need 的容量瓶。
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-[var(--app-ink-secondary)]">最大级数</span>
                      <SegmentControl<'1' | '2' | '3'>
                        options={[
                          { value: '1', label: '1 级' },
                          { value: '2', label: '2 级' },
                          { value: '3', label: '3 级' },
                        ]}
                        value={dMaxLevels}
                        onChange={setDMaxLevels}
                        ariaLabel="最大稀释级数"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-3 gap-y-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-[var(--app-ink-secondary)]">容量瓶等级</span>
                      <SegmentControl<'A' | 'B'>
                        options={[
                          { value: 'A', label: 'A 级' },
                          { value: 'B', label: 'B 级' },
                        ]}
                        value={dFlaskGrade}
                        onChange={setDFlaskGrade}
                        ariaLabel="容量瓶等级"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-[var(--app-ink-secondary)]">吸管等级</span>
                      <SegmentControl<'A' | 'B'>
                        options={[
                          { value: 'A', label: 'A 级' },
                          { value: 'B', label: 'B 级' },
                        ]}
                        value={dPipetteGrade}
                        onChange={setDPipetteGrade}
                        ariaLabel="吸管等级"
                      />
                    </div>
                  </div>

                  {(dFlaskGrade === 'B' || dPipetteGrade === 'B') && (
                    <div className="rounded-[var(--app-radius-sm)] border border-[var(--app-warning)] bg-[var(--app-warning-light)] px-3 py-2 text-xs font-medium text-[var(--app-warning)]">
                      ⚠ B 级允差当前为占位或推算值,正式报告或作业指导书中使用前请核对 JJG 196-2006 原文或检定证书。
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <NumberInput
                      label="固定体积组合总倍数允许偏差"
                      unit="%"
                      value={dFactorTol}
                      onChange={setDFactorTol}
                      hint="默认 2%。仅对单标线吸量管固定体积组合生效;自适应(smart 模式)方案本项不适用"
                    />
                    <NumberInput
                      label="母液 C₀ 相对不确定度"
                      unit="%"
                      value={dURelC0}
                      onChange={setDURelC0}
                      hint="标准储备液一般 0.3~1%,默认 0.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-bold text-[var(--app-ink-secondary)]">
                      可用容量瓶规格(mL)—— 来源 JJG 196-2006
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {STANDARD_FLASK_SIZES_ML.map((size) => {
                        const checked = dSelectedFlasks.includes(size);
                        return (
                          <label
                            key={`f-${size}`}
                            className={`flex min-h-[36px] min-w-[52px] cursor-pointer items-center justify-center rounded-[var(--app-radius-sm)] border px-3 py-1.5 text-xs font-bold transition-colors ${
                              checked
                                ? 'border-[var(--app-primary)] bg-[var(--app-primary)] text-white shadow-sm'
                                : 'border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink-secondary)] hover:bg-[var(--app-line)]/40'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() => {
                                setDSelectedFlasks((prev) =>
                                  prev.includes(size)
                                    ? prev.filter((v) => v !== size)
                                    : [...prev, size],
                                );
                              }}
                            />
                            {size}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-bold text-[var(--app-ink-secondary)]">
                      可用单标线吸量管规格(mL)—— 来源 JJG 196-2006(仅移取标称体积)
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {STANDARD_PIPETTE_SIZES_ML.map((size) => {
                        const checked = dSelectedPipettes.includes(size);
                        return (
                          <label
                            key={`p-${size}`}
                            className={`flex min-h-[36px] min-w-[52px] cursor-pointer items-center justify-center rounded-[var(--app-radius-sm)] border px-3 py-1.5 text-xs font-bold transition-colors ${
                              checked
                                ? 'border-[var(--app-primary)] bg-[var(--app-primary)] text-white shadow-sm'
                                : 'border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink-secondary)] hover:bg-[var(--app-line)]/40'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={() => {
                                setDSelectedPipettes((prev) =>
                                  prev.includes(size)
                                    ? prev.filter((v) => v !== size)
                                    : [...prev, size],
                                );
                              }}
                            />
                            {size}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {active === 'regression' && (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <PasteBulkInput
                  label="标准浓度 x 列"
                  value={xList}
                  onChange={setXList}
                  placeholder="粘贴 x 值:0, 0.2, 0.5, 1.0..."
                  minValues={3}
                  rows={5}
                  required
                />
                <PasteBulkInput
                  label="仪器响应 y 列"
                  value={yList}
                  onChange={setYList}
                  placeholder="粘贴 y 值,顺序与 x 一致"
                  minValues={3}
                  rows={5}
                  required
                />
              </div>
              {regressionCountMismatch && (
                <div className="rounded-[var(--app-radius-sm)] border border-[var(--app-warning)] bg-[var(--app-warning-light)] px-3 py-2 text-xs font-medium text-[var(--app-warning)]">
                  x 列 ({xs.length} 个)与 y 列 ({ys.length} 个)数量不一致,将按较短序列截取配对
                </div>
              )}
            </>
          )}

          {active === 'sample' && (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                <span className="text-sm font-black text-[var(--app-ink-secondary)]">样品类型</span>
                <SegmentControl<SampleMatrix>
                  options={[
                    { value: 'liquid', label: '液体 → mg/L' },
                    { value: 'solid', label: '固体 → mg/kg 干重' },
                  ]}
                  value={matrix}
                  onChange={setMatrix}
                  ariaLabel="样品基质"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <NumberInput
                  label="仪器读数 C_inst"
                  unit="mg/L"
                  value={cInst}
                  onChange={setCInst}
                  required
                />
                <NumberInput
                  label="方法空白 C_blank"
                  unit="mg/L"
                  value={cBlank}
                  onChange={setCBlank}
                  hint="默认 0"
                />
                <NumberInput
                  label="定容体积 V_final"
                  unit="mL"
                  value={vFinalS}
                  onChange={setVFinalS}
                  required
                />
                <NumberInput label="稀释倍数 f" value={dilF} onChange={setDilF} hint="默认 1" />
                {matrix === 'liquid' ? (
                  <NumberInput
                    label="取样体积 V_sample"
                    unit="mL"
                    value={vSample}
                    onChange={setVSample}
                    required
                  />
                ) : (
                  <>
                    <NumberInput
                      label="取样质量 m_sample"
                      unit="g"
                      value={mSample}
                      onChange={setMSample}
                      required
                    />
                    <NumberInput
                      label="含水率 w"
                      unit="%"
                      value={moisture}
                      onChange={setMoisture}
                      hint="风干基可填 0"
                    />
                  </>
                )}
              </div>
            </>
          )}

          {active === 'titration' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumberInput
                label="滴定剂浓度 c_T"
                unit="mol/L"
                value={cT}
                onChange={setCT}
                required
              />
              <NumberInput
                label="滴定剂消耗 V_T"
                unit="mL"
                value={vT}
                onChange={setVT}
                required
              />
              <NumberInput
                label="空白消耗 V_blank"
                unit="mL"
                value={vBlank}
                onChange={setVBlank}
                hint="默认 0"
              />
              <NumberInput
                label="取样体积 V_sample"
                unit="mL"
                value={vSampleT}
                onChange={setVSampleT}
                required
              />
              <NumberInput
                label="反应计量比 n_T/n_S"
                value={reactionRatio}
                onChange={setReactionRatio}
                hint="酸碱 1:1 填 1;NaOH 滴 H₂SO₄ 填 2"
                required
              />
              <NumberInput label="稀释倍数 f" value={dilFt} onChange={setDilFt} hint="默认 1" />
              <NumberInput
                label="摩尔质量 M (可选)"
                unit="g/mol"
                value={molarMass}
                onChange={setMolarMass}
                hint="填入后额外输出 mg/L"
              />
            </div>
          )}
        </section>

        {/* ============ 结果区 ============ */}

        {active === 'dilution' &&
          dilMode === 'single' &&
          ('error' in dilSingleResult ? (
            <ErrorBox message={dilSingleResult.error} />
          ) : (
            <ResultDisplay
              title="单级稀释方案"
              standard="C₁·V₁ = C₂·V₂"
              items={[
                {
                  label: '母液浓度 C₁',
                  value: dilSingleResult.c1,
                  status: solveFor === 'c1' ? 'success' : 'neutral',
                },
                {
                  label: '取液量 V₁',
                  value: dilSingleResult.v1.toFixed(3),
                  unit: 'mL',
                  status: solveFor === 'v1' ? 'success' : 'neutral',
                },
                {
                  label: '目标浓度 C₂',
                  value: dilSingleResult.c2,
                  status: solveFor === 'c2' ? 'success' : 'neutral',
                },
                {
                  label: '目标体积 V₂',
                  value: dilSingleResult.v2.toFixed(3),
                  unit: 'mL',
                  status: solveFor === 'v2' ? 'success' : 'neutral',
                },
                { label: '需加溶剂', value: dilSingleResult.solventVolume.toFixed(3), unit: 'mL' },
                { label: '总稀释倍数', value: `${dilSingleResult.dilutionFactor} ×` },
              ]}
            />
          ))}

        {active === 'dilution' &&
          dilMode === 'series' &&
          ('error' in dilSeriesResult ? (
            <ErrorBox message={dilSeriesResult.error} />
          ) : (
            <ResultDisplay
              title="连续稀释方案"
              standard={`共 ${dilSeriesResult.steps.length} 级,每级稀释因子 ${dilSeriesResult.perStepFactor} ×`}
              items={[
                { label: '总稀释倍数', value: `${dilSeriesResult.totalFactor} ×` },
                { label: '每级稀释因子', value: `${dilSeriesResult.perStepFactor} ×` },
                {
                  label: '每级取液量',
                  value: dilSeriesResult.steps[0].vTake.toFixed(3),
                  unit: 'mL',
                  status: 'success',
                },
                {
                  label: '每级定容至',
                  value: dilSeriesResult.steps[0].vFinal.toFixed(3),
                  unit: 'mL',
                },
              ]}
              details={
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] text-xs">
                    <thead className="text-[var(--app-ink-tertiary)]">
                      <tr className="border-b border-[var(--app-line)]">
                        <th className="py-1 pr-3 text-left">级</th>
                        <th className="py-1 pr-3 text-left">起始浓度</th>
                        <th className="py-1 pr-3 text-left">末浓度</th>
                        <th className="py-1 pr-3 text-left">取液 mL</th>
                        <th className="py-1 pr-3 text-left">定容 mL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dilSeriesResult.steps.map((s) => (
                        <tr key={s.level}>
                          <td className="py-0.5 pr-3">{s.level}</td>
                          <td className="py-0.5 pr-3">{s.cFrom}</td>
                          <td className="py-0.5 pr-3">{s.cTo}</td>
                          <td className="py-0.5 pr-3">{s.vTake}</td>
                          <td className="py-0.5 pr-3">{s.vFinal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            />
          ))}

        {active === 'dilution' && dilMode === 'design' && (
          <DilutionDesignResultView result={dilDesignResult} />
        )}

        {active === 'regression' &&
          ('error' in regressionResult ? (
            <ErrorBox message={regressionResult.error} />
          ) : (
            <ResultDisplay
              title="线性回归"
              standard={`n = ${regressionResult.n};依据 ICH Q2 / HJ 168 回归法`}
              items={[
                { label: '回归方程', value: regressionResult.equation },
                { label: '斜率 a', value: regressionResult.slope.toFixed(6) },
                { label: '截距 b', value: regressionResult.intercept.toFixed(6) },
                {
                  label: '决定系数 R²',
                  value: regressionResult.rSquared.toFixed(5),
                  status:
                    regressionResult.rSquared >= 0.999
                      ? 'success'
                      : regressionResult.rSquared >= 0.995
                        ? 'warning'
                        : 'danger',
                },
                { label: '残差 s(y/x)', value: regressionResult.sResidual.toFixed(6) },
                {
                  label: 'MDL (3.3·s/a)',
                  value: regressionResult.mdl.toFixed(6),
                  status: 'success',
                },
                { label: 'LOQ (10·s/a)', value: regressionResult.loq.toFixed(6) },
              ]}
              details={
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] text-xs">
                    <thead className="text-[var(--app-ink-tertiary)]">
                      <tr className="border-b border-[var(--app-line)]">
                        <th className="py-1 pr-3 text-left">x</th>
                        <th className="py-1 pr-3 text-left">y 实测</th>
                        <th className="py-1 pr-3 text-left">ŷ 预测</th>
                        <th className="py-1 pr-3 text-left">残差</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regressionResult.residuals.map((r, i) => (
                        <tr key={i}>
                          <td className="py-0.5 pr-3">{r.x}</td>
                          <td className="py-0.5 pr-3">{r.y}</td>
                          <td className="py-0.5 pr-3">{r.yHat}</td>
                          <td className="py-0.5 pr-3">{r.residual}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            />
          ))}

        {active === 'sample' &&
          ('error' in sampleResult ? (
            <ErrorBox message={sampleResult.error} />
          ) : (
            <ResultDisplay
              title="样品浓度回算"
              standard={
                matrix === 'liquid' ? '液体样品 → mg/L' : '固体样品 → mg/kg 干重'
              }
              items={[
                {
                  label: '扣空白读数',
                  value: sampleResult.netReading.toFixed(4),
                  unit: 'mg/L',
                },
                { label: '有效换算因子', value: sampleResult.effectiveFactor.toFixed(3) },
                ...(matrix === 'solid' && sampleResult.driedMass !== undefined
                  ? [
                      {
                        label: '干重',
                        value: sampleResult.driedMass.toFixed(4),
                        unit: 'g',
                      },
                    ]
                  : []),
                {
                  label: '样品浓度',
                  value: sampleResult.sampleConcentration.toFixed(4),
                  unit: sampleResult.unit,
                  status: 'success',
                },
              ]}
            />
          ))}

        {active === 'titration' &&
          ('error' in titrationResult ? (
            <ErrorBox message={titrationResult.error} />
          ) : (
            <ResultDisplay
              title="滴定结果"
              standard="c_x = (c_T·V_net / n_rxn)·f / V_s"
              items={[
                {
                  label: '扣空白体积 V_net',
                  value: titrationResult.netVolume.toFixed(3),
                  unit: 'mL',
                },
                {
                  label: '样品摩尔浓度',
                  value: titrationResult.molarConcentration.toFixed(6),
                  unit: 'mol/L',
                  status: 'success',
                },
                ...(titrationResult.massConcentration !== null
                  ? [
                      {
                        label: '样品质量浓度',
                        value: titrationResult.massConcentration.toFixed(4),
                        unit: 'mg/L',
                      },
                    ]
                  : []),
              ]}
            />
          ))}
      </FormulaModuleShell>
    </CalculatorShell>
  );
}
