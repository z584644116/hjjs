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
  parseDecimalInput,
  parseNumberList,
  type DilutionSolveFor,
  type RegressionPoint,
  type SampleMatrix,
} from '@/lib/calculators';

type LabFormula = 'dilution' | 'regression' | 'sample' | 'titration';

const formulaModules: FormulaModuleOption[] = [
  {
    key: 'dilution',
    title: '溶液稀释',
    group: '溶液制备',
    description: '单级 C₁V₁=C₂V₂ 或等比连续稀释,输出每级取液/定容量。',
    formula: 'C₁·V₁ = C₂·V₂;perStep = (C₀ / C_final)^(1/n)',
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

export default function LaboratoryPage() {
  const [active, setActive] = useState<LabFormula>('dilution');

  // 稀释 ——
  const [dilMode, setDilMode] = useState<'single' | 'series'>('single');
  const [solveFor, setSolveFor] = useState<DilutionSolveFor>('v1');
  const [c1, setC1] = useState('1000');
  const [v1, setV1] = useState('');
  const [c2, setC2] = useState('10');
  const [v2, setV2] = useState('100');
  const [c0, setC0] = useState('1000');
  const [cFinal, setCFinal] = useState('0.1');
  const [vLevel, setVLevel] = useState('25');
  const [levels, setLevels] = useState('3');

  // 标准曲线 ——
  const [xList, setXList] = useState('0, 0.2, 0.5, 1.0, 2.0, 5.0');
  const [yList, setYList] = useState('0.003, 0.051, 0.128, 0.255, 0.510, 1.280');

  // 样品回算 ——
  const [matrix, setMatrix] = useState<SampleMatrix>('liquid');
  const [cInst, setCInst] = useState('0.52');
  const [cBlank, setCBlank] = useState('0.01');
  const [vFinalS, setVFinalS] = useState('50');
  const [dilF, setDilF] = useState('1');
  const [vSample, setVSample] = useState('25');
  const [mSample, setMSample] = useState('0.5');
  const [moisture, setMoisture] = useState('15');

  // 滴定 ——
  const [cT, setCT] = useState('0.1');
  const [vT, setVT] = useState('23.85');
  const [vBlank, setVBlank] = useState('0.05');
  const [vSampleT, setVSampleT] = useState('25');
  const [reactionRatio, setReactionRatio] = useState('1');
  const [molarMass, setMolarMass] = useState('');
  const [dilFt, setDilFt] = useState('1');

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
    setActive('dilution');
    setDilMode('single');
    setSolveFor('v1');
    setC1('1000');
    setV1('');
    setC2('10');
    setV2('100');
    setC0('1000');
    setCFinal('0.1');
    setVLevel('25');
    setLevels('3');
    setXList('0, 0.2, 0.5, 1.0, 2.0, 5.0');
    setYList('0.003, 0.051, 0.128, 0.255, 0.510, 1.280');
    setMatrix('liquid');
    setCInst('0.52');
    setCBlank('0.01');
    setVFinalS('50');
    setDilF('1');
    setVSample('25');
    setMSample('0.5');
    setMoisture('15');
    setCT('0.1');
    setVT('23.85');
    setVBlank('0.05');
    setVSampleT('25');
    setReactionRatio('1');
    setMolarMass('');
    setDilFt('1');
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
        <section className="app-panel space-y-4 p-4 md:p-5">
          {active === 'dilution' && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-black text-[var(--app-ink-secondary)]">计算模式</span>
                <SegmentControl
                  options={[
                    { value: 'single', label: '单级 C₁V₁=C₂V₂' },
                    { value: 'series', label: '等比连续稀释' },
                  ]}
                  value={dilMode}
                  onChange={setDilMode}
                  ariaLabel="稀释计算模式"
                />
              </div>

              {dilMode === 'single' ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
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
              ) : (
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
              <div className="flex flex-wrap items-center gap-3">
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
