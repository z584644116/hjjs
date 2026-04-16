'use client';

import React, { useMemo, useState } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import FormulaModuleShell, { FormulaModuleOption } from '@/components/FormulaModuleShell';
import NumberInput from '@/components/NumberInput';
import PasteBulkInput from '@/components/PasteBulkInput';
import ResultDisplay from '@/components/ResultDisplay';
import {
  calculateBackgroundCorrection,
  calculateBarrierLoss,
  calculateDistanceDecay,
  calculateLeq,
  calculateSabineReverb,
  calculateSoundSum,
  calculateStatLevels,
  parseDecimalInput,
  parseNumberList,
} from '@/lib/calculators';

type NoiseFormula =
  | 'leq'
  | 'stat'
  | 'sum'
  | 'distance'
  | 'background'
  | 'sabine'
  | 'barrier';

const formulaModules: FormulaModuleOption[] = [
  {
    key: 'leq',
    title: '等效连续 A 声级 Leq',
    group: '时间积分',
    description: '由多个瞬时读数计算等效声级,用于环境噪声评价。',
    formula: 'Leq = 10·lg(1/n · Σ 10^(Li/10))',
  },
  {
    key: 'stat',
    title: '统计声级 L10 / L50 / L90',
    group: '时间积分',
    description: '由读数序列计算累计百分位声级,用于背景与峰值评估。',
    formula: 'L_x = "x% 测量时间内超过的值"',
  },
  {
    key: 'sum',
    title: '多声源叠加',
    group: '声源分析',
    description: '两个及以上声源同时作用的合成声级。',
    formula: 'Ltotal = 10·lg(Σ 10^(Li/10))',
  },
  {
    key: 'distance',
    title: '点声源距离衰减',
    group: '声源分析',
    description: '自由场内点声源的几何衰减。线声源请自行改用 10·lg。',
    formula: 'ΔL = 20·lg(r₂ / r₁),L₂ = L₁ − ΔL',
  },
  {
    key: 'background',
    title: '背景值修正',
    group: '测量质控',
    description: '按 GB 12348 / GB 3096 规则修正噪声测量中背景贡献。',
    formula: '3~10 dB:L_源 = 10·lg(10^(L_测/10) − 10^(L_背/10))',
  },
  {
    key: 'sabine',
    title: 'Sabine 混响时间 T60',
    group: '建筑声学',
    description: '房间吸声量与体积估算混响时间。',
    formula: 'T60 = 0.161·V / A',
  },
  {
    key: 'barrier',
    title: '声屏障 Maekawa 插入损失',
    group: '噪声控制',
    description: '根据衍射程差 δ 和声源频率估算声屏障插入损失。',
    formula: 'N = 2δ/λ;IL = 5 + 20·lg[√(2πN)/tanh(√(2πN))](cap 24 dB)',
  },
];

export default function NoisePage() {
  const [active, setActive] = useState<NoiseFormula>('leq');

  // 序列输入(Leq / stat / sum 共享 3 个独立输入)
  const [leqSeries, setLeqSeries] = useState('55, 58, 62, 65, 70, 72, 68, 63, 60, 57');
  const [statSeries, setStatSeries] = useState('45, 48, 50, 53, 55, 56, 58, 60, 62, 65, 68, 70, 72, 74, 78');
  const [sumSeries, setSumSeries] = useState('75, 78, 80');

  // 距离衰减
  const [distL1, setDistL1] = useState('85');
  const [distR1, setDistR1] = useState('1');
  const [distR2, setDistR2] = useState('10');

  // 背景修正
  const [bgMeasured, setBgMeasured] = useState('62.0');
  const [bgBackground, setBgBackground] = useState('55.0');

  // Sabine
  const [sabineV, setSabineV] = useState('120');
  const [sabineA, setSabineA] = useState('24');

  // 声屏障
  const [barrierDelta, setBarrierDelta] = useState('0.2');
  const [barrierFreq, setBarrierFreq] = useState('500');

  const leqResult = useMemo(() => calculateLeq(parseNumberList(leqSeries)), [leqSeries]);
  const statResult = useMemo(() => calculateStatLevels(parseNumberList(statSeries)), [statSeries]);
  const sumResult = useMemo(() => calculateSoundSum(parseNumberList(sumSeries)), [sumSeries]);
  const distanceResult = useMemo(() => calculateDistanceDecay({
    sourceLevel: parseDecimalInput(distL1),
    r1: parseDecimalInput(distR1),
    r2: parseDecimalInput(distR2),
  }), [distL1, distR1, distR2]);
  const bgResult = useMemo(() => calculateBackgroundCorrection({
    measured: parseDecimalInput(bgMeasured),
    background: parseDecimalInput(bgBackground),
  }), [bgBackground, bgMeasured]);
  const sabineResult = useMemo(() => calculateSabineReverb({
    volume: parseDecimalInput(sabineV),
    absorption: parseDecimalInput(sabineA),
  }), [sabineA, sabineV]);
  const barrierResult = useMemo(() => calculateBarrierLoss({
    pathDifference: parseDecimalInput(barrierDelta),
    frequency: parseDecimalInput(barrierFreq),
  }), [barrierDelta, barrierFreq]);

  const handleReset = () => {
    setActive('leq');
    setLeqSeries('');
    setStatSeries('');
    setSumSeries('');
    setDistL1('');
    setDistR1('');
    setDistR2('');
    setBgMeasured('');
    setBgBackground('');
    setSabineV('');
    setSabineA('');
    setBarrierDelta('');
    setBarrierFreq('');
  };

  const actions = (
    <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
      重置
    </button>
  );

  return (
    <CalculatorShell title="噪声与振动计算" actions={actions}>
      <FormulaModuleShell modules={formulaModules} activeKey={active} onChange={(k) => setActive(k as NoiseFormula)}>
        <section className="app-panel space-y-4 p-4 md:p-5">
          {active === 'leq' && (
            <PasteBulkInput
              label="A 声级读数序列"
              value={leqSeries}
              onChange={setLeqSeries}
              placeholder="粘贴多个读数,可用空格、逗号、分号或换行分隔"
              hint="单位 dB(A);建议 ≥ 100 个"
              minValues={1}
              rows={5}
              required
            />
          )}

          {active === 'stat' && (
            <PasteBulkInput
              label="A 声级读数序列"
              value={statSeries}
              onChange={setStatSeries}
              placeholder="粘贴读数,建议 ≥ 100 个采样"
              hint="按百分位计算;实际现场数据越多越可信"
              minValues={3}
              rows={5}
              required
            />
          )}

          {active === 'sum' && (
            <PasteBulkInput
              label="各声源声级"
              value={sumSeries}
              onChange={setSumSeries}
              placeholder="粘贴 2 个及以上声源声级"
              hint="单位 dB(A)"
              minValues={1}
              rows={4}
              required
            />
          )}

          {active === 'distance' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberInput label="源声级 L₁" unit="dB(A)" value={distL1} onChange={setDistL1} required />
              <NumberInput label="参考距离 r₁" unit="m" value={distR1} onChange={setDistR1} required />
              <NumberInput label="目标距离 r₂" unit="m" value={distR2} onChange={setDistR2} required />
            </div>
          )}

          {active === 'background' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="测量值 L_测" unit="dB(A)" value={bgMeasured} onChange={setBgMeasured} required />
              <NumberInput label="背景值 L_背" unit="dB(A)" value={bgBackground} onChange={setBgBackground} required />
            </div>
          )}

          {active === 'sabine' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="房间体积 V" unit="m³" value={sabineV} onChange={setSabineV} required />
              <NumberInput label="总吸声量 A" unit="m² Sabins" value={sabineA} onChange={setSabineA} required hint="A = Σ αᵢ·Sᵢ" />
            </div>
          )}

          {active === 'barrier' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="衍射程差 δ" unit="m" value={barrierDelta} onChange={setBarrierDelta} required hint="= 绕行路径 − 直线路径" />
              <NumberInput label="中心频率" unit="Hz" value={barrierFreq} onChange={setBarrierFreq} required hint="交通噪声常用 500 Hz" />
            </div>
          )}
        </section>

        {active === 'leq' && ('error' in leqResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{leqResult.error}</div>
        ) : (
          <ResultDisplay
            title="等效连续 A 声级"
            standard="GB 3096 / GB 12348"
            items={[
              { label: '读数个数 n', value: leqResult.count },
              { label: '等效声级 Leq', value: leqResult.leq.toFixed(1), unit: 'dB(A)', status: 'success' },
              { label: '最小值', value: leqResult.lmin.toFixed(1), unit: 'dB(A)' },
              { label: '最大值', value: leqResult.lmax.toFixed(1), unit: 'dB(A)' },
              { label: '动态范围', value: leqResult.lrange.toFixed(1), unit: 'dB' },
            ]}
          />
        ))}

        {active === 'stat' && ('error' in statResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{statResult.error}</div>
        ) : (
          <ResultDisplay
            title="统计声级"
            standard="L10 峰值特征;L50 中值;L90 背景"
            items={[
              { label: '读数个数 n', value: statResult.count },
              { label: 'L10', value: statResult.l10.toFixed(1), unit: 'dB(A)', status: 'warning' },
              { label: 'L50', value: statResult.l50.toFixed(1), unit: 'dB(A)' },
              { label: 'L90', value: statResult.l90.toFixed(1), unit: 'dB(A)', status: 'success' },
              { label: '最小', value: statResult.lmin.toFixed(1), unit: 'dB(A)' },
              { label: '最大', value: statResult.lmax.toFixed(1), unit: 'dB(A)' },
            ]}
          />
        ))}

        {active === 'sum' && ('error' in sumResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{sumResult.error}</div>
        ) : (
          <ResultDisplay
            title="多声源叠加"
            standard="两个 80 dB 点声源叠加 ≈ 83 dB"
            items={[
              { label: '声源个数', value: sumResult.count },
              { label: '总声级 Ltotal', value: sumResult.total.toFixed(1), unit: 'dB(A)', status: 'success' },
              { label: '最大单源', value: sumResult.maxSource.toFixed(1), unit: 'dB(A)' },
              { label: '叠加增加', value: (sumResult.total - sumResult.maxSource).toFixed(1), unit: 'dB' },
            ]}
          />
        ))}

        {active === 'distance' && ('error' in distanceResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{distanceResult.error}</div>
        ) : (
          <ResultDisplay
            title="点声源距离衰减"
            standard="ΔL = 20·lg(r₂/r₁)"
            items={[
              { label: '衰减量 ΔL', value: distanceResult.decay.toFixed(1), unit: 'dB' },
              { label: '目标点声级', value: distanceResult.targetLevel.toFixed(1), unit: 'dB(A)', status: 'success' },
            ]}
          />
        ))}

        {active === 'background' && ('error' in bgResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{bgResult.error}</div>
        ) : (
          <ResultDisplay
            title="背景值修正"
            standard="GB 12348 附录 A 修正规则"
            items={[
              { label: 'ΔL', value: bgResult.delta.toFixed(1), unit: 'dB' },
              {
                label: '修正后声源声级',
                value: bgResult.corrected === null ? '不可用' : bgResult.corrected.toFixed(1),
                unit: bgResult.corrected === null ? undefined : 'dB(A)',
                status: bgResult.rule === 'invalid' ? 'danger' : bgResult.rule === 'logarithmic' ? 'warning' : 'success',
              },
              { label: '判定', value: bgResult.ruleText },
            ]}
          />
        ))}

        {active === 'sabine' && ('error' in sabineResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{sabineResult.error}</div>
        ) : (
          <ResultDisplay
            title="混响时间"
            standard="T60 = 0.161·V/A(语音房建议 T60 0.3~0.6 s)"
            items={[
              { label: '总吸声量 A', value: sabineResult.equivalentArea.toFixed(2), unit: 'm² Sabins' },
              { label: '混响时间 T60', value: sabineResult.t60.toFixed(2), unit: 's', status: 'success' },
            ]}
          />
        ))}

        {active === 'barrier' && ('error' in barrierResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{barrierResult.error}</div>
        ) : (
          <ResultDisplay
            title="声屏障插入损失"
            standard="Maekawa / Kurze-Anderson 简化估算"
            items={[
              { label: '菲涅尔数 N', value: barrierResult.fresnelN.toFixed(3) },
              { label: '插入损失 IL', value: barrierResult.insertionLoss.toFixed(1), unit: 'dB', status: barrierResult.insertionLoss >= 10 ? 'success' : 'warning' },
            ]}
          />
        ))}
      </FormulaModuleShell>
    </CalculatorShell>
  );
}
