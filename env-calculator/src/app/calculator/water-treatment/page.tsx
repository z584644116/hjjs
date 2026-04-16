'use client';

import React, { useMemo, useState } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import FormulaModuleShell, { FormulaModuleOption } from '@/components/FormulaModuleShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
import {
  calculateAeratedPondBod,
  calculateAlkalinityBalance,
  calculateAor,
  calculateCoagulantDose,
  calculateCtValue,
  calculateEbct,
  calculateEbprRatios,
  calculateFacultativePondNitrogen,
  calculateFoodToMicroorganism,
  calculateHrt,
  calculateSor,
  calculateSrt,
  calculateSvi,
  calculateTemperatureCorrectedRate,
  calculateUvDose,
  parseDecimalInput,
} from '@/lib/calculators';

type WaterFormula =
  | 'bod'
  | 'temperature'
  | 'nitrogen'
  | 'alkalinity'
  | 'ebpr'
  | 'fm'
  | 'svi'
  | 'srt'
  | 'hrt'
  | 'aor'
  | 'sor'
  | 'coagulant'
  | 'ct'
  | 'uv'
  | 'ebct';

const formulaModules: FormulaModuleOption[] = [
  {
    key: 'bod',
    title: '完全混合曝气塘 BOD 去除',
    group: '废水稳定塘',
    description: '预测曝气塘出水 BOD 浓度和去除率。',
    formula: 'Ce = C0 / (1 + k t)',
  },
  {
    key: 'temperature',
    title: '反应速率温度校正',
    group: '废水稳定塘',
    description: '将 20℃ 基准反应速率校正到实际塘水温度。',
    formula: 'kT = k20 × θ^(T-20)',
  },
  {
    key: 'nitrogen',
    title: '兼氧塘总氮去除',
    group: '脱氮设计',
    description: '用 Reed 推流模型预测兼氧塘出水总氮。',
    formula: 'Ne = No × exp{-KT[t + 60.6(pH - 6.6)]}',
  },
  {
    key: 'alkalinity',
    title: '硝化耗碱与反硝化产碱',
    group: '脱氮设计',
    description: '核算硝化和反硝化对系统碱度的净影响。',
    formula: '净碱度 = 3.57NO3-N - 7.14NH3-N',
  },
  {
    key: 'ebpr',
    title: '生物除磷 COD:P 比率',
    group: '除磷设计',
    description: '判断 EBPR 厌氧区碳源供应是否充足。',
    formula: 'COD:TP 20~30；BOD5:TP ≥18；rbCOD:P 10~16',
  },
  {
    key: 'fm',
    title: 'F/M 比(BOD 负荷率)',
    group: '活性污泥工艺',
    description: '根据进水 BOD、流量、反应池容积与 MLVSS 计算食微比。',
    formula: 'F/M = Q·S0 / (V·X)',
  },
  {
    key: 'svi',
    title: '污泥容积指数 SVI',
    group: '活性污泥工艺',
    description: '评价污泥沉降性能,100~150 为正常。',
    formula: 'SVI = V30 × 1000 / MLSS (mL/g)',
  },
  {
    key: 'srt',
    title: '污泥龄 SRT',
    group: '活性污泥工艺',
    description: '反应池内污泥质量与每日排出污泥量之比。',
    formula: 'SRT = V·X / (Qw·Xr + Qe·Xe)',
  },
  {
    key: 'hrt',
    title: '水力停留时间 HRT',
    group: '活性污泥工艺',
    description: '反应池容积除以处理水量,输出 d 与 h 两种单位。',
    formula: 'HRT = V / Q',
  },
  {
    key: 'aor',
    title: '实际需氧量 AOR',
    group: '曝气与氧传递',
    description: '按碳化氧耗 + 硝化氧耗扣除内源呼吸,计算日需氧量。',
    formula: "AOR = a'·Q·ΔBOD + b'·Q·ΔNH4 − 1.42·R_endo",
  },
  {
    key: 'sor',
    title: '标态需氧量 SOR',
    group: '曝气与氧传递',
    description: '把 AOR 折算到 20℃ 清水标态,用于鼓风机与曝气头选型。',
    formula: 'SOR = AOR · Cs20 / [α(β·CsT − CL)] · 1.024^(20−T)',
  },
  {
    key: 'coagulant',
    title: '混凝剂日投加量',
    group: '药剂投加',
    description: '由处理水量与投加浓度估算日与年药耗。',
    formula: '日投加量 = Q · c / 1000 (kg/d)',
  },
  {
    key: 'ct',
    title: '氯消毒 CT 值',
    group: '消毒与深度处理',
    description: '浓度×接触时间,给出 Giardia 与病毒对数去除对比。',
    formula: 'CT = C × t (mg·min/L)',
  },
  {
    key: 'uv',
    title: '紫外剂量 D',
    group: '消毒与深度处理',
    description: '强度 × 接触时间,对照 USEPA 饮用水 ≥ 40 mJ/cm² 判定。',
    formula: 'D = I × t (mJ/cm²)',
  },
  {
    key: 'ebct',
    title: '活性炭 EBCT',
    group: '消毒与深度处理',
    description: '空床接触时间,VOC 深度处理推荐 ≥ 10 min。',
    formula: 'EBCT = V_carbon / Q',
  },
];

function ratioStatusText(status: 'sufficient' | 'marginal' | 'insufficient') {
  if (status === 'sufficient') return '充足';
  if (status === 'marginal') return '临界';
  return '不足';
}

function ratioStatusColor(status: 'sufficient' | 'marginal' | 'insufficient') {
  if (status === 'sufficient') return 'success';
  if (status === 'marginal') return 'warning';
  return 'danger';
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
      {message}
    </div>
  );
}

export default function WaterTreatmentPage() {
  const [active, setActive] = useState<WaterFormula>('bod');

  const [bodC0, setBodC0] = useState('200');
  const [bodK, setBodK] = useState('0.20');
  const [bodT, setBodT] = useState('5');

  const [baseK20, setBaseK20] = useState('0.20');
  const [theta, setTheta] = useState('1.06');
  const [waterTemp, setWaterTemp] = useState('15');

  const [nitrogenNo, setNitrogenNo] = useState('40');
  const [nitrogenK20, setNitrogenK20] = useState('0.0064');
  const [nitrogenTheta, setNitrogenTheta] = useState('1.039');
  const [nitrogenTemp, setNitrogenTemp] = useState('20');
  const [nitrogenHrt, setNitrogenHrt] = useState('10');
  const [nitrogenPh, setNitrogenPh] = useState('7.2');

  const [nh3n, setNh3n] = useState('25');
  const [no3n, setNo3n] = useState('10');

  const [cod, setCod] = useState('200');
  const [tp, setTp] = useState('8');
  const [bod5, setBod5] = useState('150');
  const [rbcod, setRbcod] = useState('90');

  // F/M
  const [fmBod, setFmBod] = useState('250');
  const [fmQ, setFmQ] = useState('5000');
  const [fmV, setFmV] = useState('2500');
  const [fmX, setFmX] = useState('3000');

  // SVI
  const [sviV30, setSviV30] = useState('300');
  const [sviMlss, setSviMlss] = useState('3000');

  // SRT
  const [srtV, setSrtV] = useState('2500');
  const [srtX, setSrtX] = useState('3000');
  const [srtQw, setSrtQw] = useState('100');
  const [srtXr, setSrtXr] = useState('8000');
  const [srtQe, setSrtQe] = useState('5000');
  const [srtXe, setSrtXe] = useState('15');

  // HRT
  const [hrtV, setHrtV] = useState('2500');
  const [hrtQ, setHrtQ] = useState('5000');

  // AOR
  const [aorQ, setAorQ] = useState('10000');
  const [aorDBod, setAorDBod] = useState('180');
  const [aorDNh4, setAorDNh4] = useState('30');
  const [aorA, setAorA] = useState('0.42');
  const [aorB, setAorB] = useState('4.57');
  const [aorEndo, setAorEndo] = useState('50');

  // SOR
  const [sorAor, setSorAor] = useState('1500');
  const [sorAlpha, setSorAlpha] = useState('0.82');
  const [sorBeta, setSorBeta] = useState('0.95');
  const [sorDo, setSorDo] = useState('2');
  const [sorCsT, setSorCsT] = useState('8.3');
  const [sorCs20, setSorCs20] = useState('9.17');
  const [sorT, setSorT] = useState('25');

  // Coagulant dose
  const [coagQ, setCoagQ] = useState('10000');
  const [coagDose, setCoagDose] = useState('30');

  // CT
  const [ctC, setCtC] = useState('1.0');
  const [ctT, setCtT] = useState('30');

  // UV
  const [uvI, setUvI] = useState('5');
  const [uvT, setUvT] = useState('10');

  // EBCT
  const [ebctV, setEbctV] = useState('12');
  const [ebctQ, setEbctQ] = useState('100');

  const bodResult = useMemo(() => calculateAeratedPondBod({
    influentBodMgL: parseDecimalInput(bodC0),
    rateConstantPerDay: parseDecimalInput(bodK),
    hrtDays: parseDecimalInput(bodT),
  }), [bodC0, bodK, bodT]);

  const tempResult = useMemo(() => calculateTemperatureCorrectedRate({
    baseRateConstant20C: parseDecimalInput(baseK20),
    temperatureCoefficient: parseDecimalInput(theta),
    temperatureC: parseDecimalInput(waterTemp),
  }), [baseK20, theta, waterTemp]);

  const nitrogenResult = useMemo(() => calculateFacultativePondNitrogen({
    influentNitrogenMgL: parseDecimalInput(nitrogenNo),
    baseRateConstant20C: parseDecimalInput(nitrogenK20),
    temperatureCoefficient: parseDecimalInput(nitrogenTheta),
    temperatureC: parseDecimalInput(nitrogenTemp),
    hrtDays: parseDecimalInput(nitrogenHrt),
    ph: parseDecimalInput(nitrogenPh),
  }), [nitrogenHrt, nitrogenK20, nitrogenNo, nitrogenPh, nitrogenTemp, nitrogenTheta]);

  const alkalinityResult = useMemo(() => calculateAlkalinityBalance({
    ammoniaNitrogenMgL: parseDecimalInput(nh3n),
    nitrateNitrogenMgL: parseDecimalInput(no3n),
  }), [nh3n, no3n]);

  const ebprResult = useMemo(() => calculateEbprRatios({
    codMgL: parseDecimalInput(cod),
    tpMgL: parseDecimalInput(tp),
    bod5MgL: parseDecimalInput(bod5),
    rbcodMgL: parseDecimalInput(rbcod),
  }), [bod5, cod, rbcod, tp]);

  const fmResult = useMemo(() => calculateFoodToMicroorganism({
    influentBod: parseDecimalInput(fmBod),
    flowM3PerDay: parseDecimalInput(fmQ),
    reactorVolumeM3: parseDecimalInput(fmV),
    mlvssMgL: parseDecimalInput(fmX),
  }), [fmBod, fmQ, fmV, fmX]);

  const sviResult = useMemo(() => calculateSvi({
    v30MlL: parseDecimalInput(sviV30),
    mlssMgL: parseDecimalInput(sviMlss),
  }), [sviV30, sviMlss]);

  const srtResult = useMemo(() => calculateSrt({
    reactorVolumeM3: parseDecimalInput(srtV),
    mlvssMgL: parseDecimalInput(srtX),
    wastageFlowM3PerDay: parseDecimalInput(srtQw),
    wastageMlvssMgL: parseDecimalInput(srtXr),
    effluentFlowM3PerDay: parseDecimalInput(srtQe),
    effluentTssMgL: parseDecimalInput(srtXe),
  }), [srtQe, srtQw, srtV, srtX, srtXe, srtXr]);

  const hrtResult = useMemo(() => calculateHrt({
    reactorVolumeM3: parseDecimalInput(hrtV),
    flowM3PerDay: parseDecimalInput(hrtQ),
  }), [hrtQ, hrtV]);

  const aorResult = useMemo(() => calculateAor({
    flowM3PerDay: parseDecimalInput(aorQ),
    deltaBodMgL: parseDecimalInput(aorDBod),
    deltaNh4MgL: parseDecimalInput(aorDNh4),
    aCoeff: parseDecimalInput(aorA),
    bCoeff: parseDecimalInput(aorB),
    endogenousRespirationKg: aorEndo.trim() === '' ? undefined : parseDecimalInput(aorEndo),
  }), [aorA, aorB, aorDBod, aorDNh4, aorEndo, aorQ]);

  const sorResult = useMemo(() => calculateSor({
    aorKgPerDay: parseDecimalInput(sorAor),
    alpha: parseDecimalInput(sorAlpha),
    beta: parseDecimalInput(sorBeta),
    workingDo: parseDecimalInput(sorDo),
    saturationAtT: parseDecimalInput(sorCsT),
    saturation20C: parseDecimalInput(sorCs20),
    temperatureC: parseDecimalInput(sorT),
  }), [sorAlpha, sorAor, sorBeta, sorCs20, sorCsT, sorDo, sorT]);

  const coagResult = useMemo(() => calculateCoagulantDose({
    flowM3PerDay: parseDecimalInput(coagQ),
    doseMgL: parseDecimalInput(coagDose),
  }), [coagDose, coagQ]);

  const ctResult = useMemo(() => calculateCtValue({
    concentrationMgL: parseDecimalInput(ctC),
    contactMinutes: parseDecimalInput(ctT),
  }), [ctC, ctT]);

  const uvResult = useMemo(() => calculateUvDose({
    intensityMwCm2: parseDecimalInput(uvI),
    contactSeconds: parseDecimalInput(uvT),
  }), [uvI, uvT]);

  const ebctResult = useMemo(() => calculateEbct({
    carbonBedVolumeM3: parseDecimalInput(ebctV),
    flowM3PerHour: parseDecimalInput(ebctQ),
  }), [ebctQ, ebctV]);

  const handleReset = () => {
    setActive('bod');
    setBodC0(''); setBodK(''); setBodT('');
    setBaseK20(''); setTheta(''); setWaterTemp('');
    setNitrogenNo(''); setNitrogenK20(''); setNitrogenTheta('');
    setNitrogenTemp(''); setNitrogenHrt(''); setNitrogenPh('');
    setNh3n(''); setNo3n('');
    setCod(''); setTp(''); setBod5(''); setRbcod('');
    setFmBod(''); setFmQ(''); setFmV(''); setFmX('');
    setSviV30(''); setSviMlss('');
    setSrtV(''); setSrtX(''); setSrtQw(''); setSrtXr(''); setSrtQe(''); setSrtXe('');
    setHrtV(''); setHrtQ('');
    setAorQ(''); setAorDBod(''); setAorDNh4(''); setAorA(''); setAorB(''); setAorEndo('');
    setSorAor(''); setSorAlpha(''); setSorBeta(''); setSorDo('');
    setSorCsT(''); setSorCs20(''); setSorT('');
    setCoagQ(''); setCoagDose('');
    setCtC(''); setCtT('');
    setUvI(''); setUvT('');
    setEbctV(''); setEbctQ('');
  };

  const actions = (
    <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
      重置
    </button>
  );

  return (
    <CalculatorShell title="环境水处理公式" actions={actions}>
      <FormulaModuleShell modules={formulaModules} activeKey={active} onChange={(key) => setActive(key as WaterFormula)}>
        <section className="app-panel space-y-4 p-4 md:p-5">
          {active === 'bod' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberInput label="进水BOD C0" unit="mg/L" value={bodC0} onChange={setBodC0} required />
              <NumberInput label="反应速率常数 k" unit="d⁻¹" value={bodK} onChange={setBodK} required />
              <NumberInput label="水力停留时间 t" unit="d" value={bodT} onChange={setBodT} required />
            </div>
          )}

          {active === 'temperature' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberInput label="k20" unit="d⁻¹" value={baseK20} onChange={setBaseK20} required />
              <NumberInput label="温度系数 θ" value={theta} onChange={setTheta} required />
              <NumberInput label="塘水温度 T" unit="℃" value={waterTemp} onChange={setWaterTemp} required />
            </div>
          )}

          {active === 'nitrogen' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumberInput label="进水总氮 No" unit="mg/L" value={nitrogenNo} onChange={setNitrogenNo} required />
              <NumberInput label="K20" unit="d⁻¹" value={nitrogenK20} onChange={setNitrogenK20} required />
              <NumberInput label="温度系数 θ" value={nitrogenTheta} onChange={setNitrogenTheta} required />
              <NumberInput label="塘水温度 T" unit="℃" value={nitrogenTemp} onChange={setNitrogenTemp} required />
              <NumberInput label="HRT t" unit="d" value={nitrogenHrt} onChange={setNitrogenHrt} required />
              <NumberInput label="塘水 pH" value={nitrogenPh} onChange={setNitrogenPh} required />
            </div>
          )}

          {active === 'alkalinity' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="NH₃-N" unit="mg/L" value={nh3n} onChange={setNh3n} required />
              <NumberInput label="NO₃-N" unit="mg/L" value={no3n} onChange={setNo3n} required />
            </div>
          )}

          {active === 'ebpr' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <NumberInput label="COD" unit="mg/L" value={cod} onChange={setCod} required />
              <NumberInput label="TP" unit="mg/L" value={tp} onChange={setTp} required />
              <NumberInput label="BOD₅" unit="mg/L" value={bod5} onChange={setBod5} required />
              <NumberInput label="rbCOD" unit="mg/L" value={rbcod} onChange={setRbcod} required />
            </div>
          )}

          {active === 'fm' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <NumberInput label="进水 BOD₅ S₀" unit="mg/L" value={fmBod} onChange={setFmBod} required />
              <NumberInput label="处理水量 Q" unit="m³/d" value={fmQ} onChange={setFmQ} required />
              <NumberInput label="反应池容积 V" unit="m³" value={fmV} onChange={setFmV} required />
              <NumberInput label="MLVSS X" unit="mg/L" value={fmX} onChange={setFmX} required />
            </div>
          )}

          {active === 'svi' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="30 min 沉降体积 V₃₀" unit="mL/L" value={sviV30} onChange={setSviV30} required />
              <NumberInput label="MLSS" unit="mg/L" value={sviMlss} onChange={setSviMlss} required />
            </div>
          )}

          {active === 'srt' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumberInput label="反应池容积 V" unit="m³" value={srtV} onChange={setSrtV} required />
              <NumberInput label="MLVSS X" unit="mg/L" value={srtX} onChange={setSrtX} required />
              <NumberInput label="剩余污泥流量 Qw" unit="m³/d" value={srtQw} onChange={setSrtQw} required />
              <NumberInput label="剩余污泥浓度 Xr" unit="mg/L" value={srtXr} onChange={setSrtXr} required />
              <NumberInput label="出水流量 Qe" unit="m³/d" value={srtQe} onChange={setSrtQe} required />
              <NumberInput label="出水 SS Xe" unit="mg/L" value={srtXe} onChange={setSrtXe} required />
            </div>
          )}

          {active === 'hrt' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="反应池容积 V" unit="m³" value={hrtV} onChange={setHrtV} required />
              <NumberInput label="处理水量 Q" unit="m³/d" value={hrtQ} onChange={setHrtQ} required />
            </div>
          )}

          {active === 'aor' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumberInput label="处理水量 Q" unit="m³/d" value={aorQ} onChange={setAorQ} required />
              <NumberInput label="ΔBOD" unit="mg/L" value={aorDBod} onChange={setAorDBod} required />
              <NumberInput label="ΔNH₄-N" unit="mg/L" value={aorDNh4} onChange={setAorDNh4} required />
              <NumberInput label="碳化系数 a'" value={aorA} onChange={setAorA} required hint="典型 0.42" />
              <NumberInput label="硝化系数 b'" value={aorB} onChange={setAorB} required hint="典型 4.57" />
              <NumberInput label="内源呼吸量 R_endo" unit="kg O₂/d" value={aorEndo} onChange={setAorEndo} hint="可留空" />
            </div>
          )}

          {active === 'sor' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumberInput label="AOR" unit="kg O₂/d" value={sorAor} onChange={setSorAor} required />
              <NumberInput label="α 系数" value={sorAlpha} onChange={setSorAlpha} required hint="0.6~0.9" />
              <NumberInput label="β 系数" value={sorBeta} onChange={setSorBeta} required hint="≈ 0.95" />
              <NumberInput label="工况溶解氧 C_L" unit="mg/L" value={sorDo} onChange={setSorDo} required />
              <NumberInput label="T℃ 饱和 DO Cs,T" unit="mg/L" value={sorCsT} onChange={setSorCsT} required />
              <NumberInput label="20℃ 饱和 DO Cs,20" unit="mg/L" value={sorCs20} onChange={setSorCs20} required hint="≈ 9.17" />
              <NumberInput label="温度 T" unit="℃" value={sorT} onChange={setSorT} required />
            </div>
          )}

          {active === 'coagulant' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="处理水量 Q" unit="m³/d" value={coagQ} onChange={setCoagQ} required />
              <NumberInput label="投加浓度 c" unit="mg/L" value={coagDose} onChange={setCoagDose} required />
            </div>
          )}

          {active === 'ct' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="余氯浓度 C" unit="mg/L" value={ctC} onChange={setCtC} required />
              <NumberInput label="接触时间 t" unit="min" value={ctT} onChange={setCtT} required />
            </div>
          )}

          {active === 'uv' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="紫外强度 I" unit="mW/cm²" value={uvI} onChange={setUvI} required />
              <NumberInput label="接触时间 t" unit="s" value={uvT} onChange={setUvT} required />
            </div>
          )}

          {active === 'ebct' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="活性炭床体积 V" unit="m³" value={ebctV} onChange={setEbctV} required />
              <NumberInput label="处理水量 Q" unit="m³/h" value={ebctQ} onChange={setEbctQ} required />
            </div>
          )}
        </section>

        {active === 'bod' && ('error' in bodResult ? <ErrorBox message={bodResult.error} /> : (
          <ResultDisplay
            title="计算结果"
            standard="完全混合曝气塘 BOD 去除"
            items={[
              { label: '出水BOD Ce', value: bodResult.effluentBodMgL.toFixed(3), unit: 'mg/L', status: 'success' },
              { label: '去除率', value: bodResult.removalPercent.toFixed(2), unit: '%' },
            ]}
          />
        ))}

        {active === 'temperature' && ('error' in tempResult ? <ErrorBox message={tempResult.error} /> : (
          <ResultDisplay
            title="计算结果"
            standard="反应速率温度校正"
            items={[
              { label: '校正速率常数 kT', value: tempResult.correctedRateConstant.toFixed(6), unit: 'd⁻¹', status: 'success' },
            ]}
          />
        ))}

        {active === 'nitrogen' && ('error' in nitrogenResult ? <ErrorBox message={nitrogenResult.error} /> : (
          <ResultDisplay
            title="计算结果"
            standard="兼氧塘总氮去除（Reed模型）"
            items={[
              { label: '温度校正 KT', value: nitrogenResult.correctedRateConstant.toFixed(6), unit: 'd⁻¹' },
              { label: '指数项', value: nitrogenResult.exponentTerm.toFixed(3), unit: 'd' },
              { label: '出水总氮 Ne', value: nitrogenResult.effluentNitrogenMgL.toFixed(3), unit: 'mg/L', status: 'success' },
              { label: '去除率', value: nitrogenResult.removalPercent.toFixed(2), unit: '%' },
            ]}
          />
        ))}

        {active === 'alkalinity' && ('error' in alkalinityResult ? <ErrorBox message={alkalinityResult.error} /> : (
          <ResultDisplay
            title="计算结果"
            standard="硝化 7.14 g/g N；反硝化 3.57 g/g N"
            items={[
              { label: '硝化耗碱量', value: alkalinityResult.alkalinityConsumedMgLAsCaCO3.toFixed(2), unit: 'mg/L as CaCO₃', status: 'warning' },
              { label: '反硝化产碱量', value: alkalinityResult.alkalinityProducedMgLAsCaCO3.toFixed(2), unit: 'mg/L as CaCO₃', status: 'success' },
              {
                label: '净碱度变化',
                value: alkalinityResult.netAlkalinityMgLAsCaCO3.toFixed(2),
                unit: 'mg/L as CaCO₃',
                status: alkalinityResult.needsSupplement ? 'danger' : 'success',
              },
              { label: '判定', value: alkalinityResult.needsSupplement ? '需补充碱度' : '净产碱或平衡', status: alkalinityResult.needsSupplement ? 'danger' : 'success' },
            ]}
          />
        ))}

        {active === 'ebpr' && ('error' in ebprResult ? <ErrorBox message={ebprResult.error} /> : (
          <ResultDisplay
            title="计算结果"
            standard="COD:TP 20~30:1；BOD₅:TP ≥18:1；rbCOD:P 10~16:1"
            items={[
              { label: 'COD:TP', value: ebprResult.codTpRatio.toFixed(2), status: ratioStatusColor(ebprResult.codStatus) },
              { label: 'COD:TP 判定', value: ratioStatusText(ebprResult.codStatus), status: ratioStatusColor(ebprResult.codStatus) },
              { label: 'BOD₅:TP', value: ebprResult.bodTpRatio.toFixed(2), status: ebprResult.bodStatus === 'sufficient' ? 'success' : 'danger' },
              { label: 'BOD₅:TP 判定', value: ebprResult.bodStatus === 'sufficient' ? '充足' : '不足', status: ebprResult.bodStatus === 'sufficient' ? 'success' : 'danger' },
              { label: 'rbCOD:P', value: ebprResult.rbcodTpRatio.toFixed(2), status: ratioStatusColor(ebprResult.rbcodStatus) },
              { label: 'rbCOD:P 判定', value: ratioStatusText(ebprResult.rbcodStatus), status: ratioStatusColor(ebprResult.rbcodStatus) },
            ]}
          />
        ))}

        {active === 'fm' && ('error' in fmResult ? <ErrorBox message={fmResult.error} /> : (
          <ResultDisplay
            title="F/M 比"
            standard="普通活性污泥 0.1~0.5;延时曝气 < 0.1;高负荷 > 0.5"
            items={[
              { label: 'F/M', value: fmResult.fm.toFixed(4), unit: 'kg BOD/kg MLVSS·d', status: fmResult.fm >= 0.1 && fmResult.fm <= 0.5 ? 'success' : 'warning' },
              { label: 'BOD 负荷 Q·S₀', value: fmResult.organicLoad.toFixed(2), unit: 'kg/d' },
              { label: '反应池污泥量 V·X', value: fmResult.totalMass.toFixed(2), unit: 'kg' },
              { label: '工况判定', value: fmResult.range, status: fmResult.fm >= 0.1 && fmResult.fm <= 0.5 ? 'success' : 'warning' },
            ]}
          />
        ))}

        {active === 'svi' && ('error' in sviResult ? <ErrorBox message={sviResult.error} /> : (
          <ResultDisplay
            title="污泥容积指数"
            standard="正常 100~150;> 200 膨胀风险;< 70 老化或无机质过多"
            items={[
              {
                label: 'SVI',
                value: sviResult.svi.toFixed(1),
                unit: 'mL/g',
                status: sviResult.status === 'normal' ? 'success' : sviResult.status === 'bulking-risk' ? 'danger' : 'warning',
              },
              {
                label: '判定',
                value: sviResult.statusText,
                status: sviResult.status === 'normal' ? 'success' : sviResult.status === 'bulking-risk' ? 'danger' : 'warning',
              },
            ]}
          />
        ))}

        {active === 'srt' && ('error' in srtResult ? <ErrorBox message={srtResult.error} /> : (
          <ResultDisplay
            title="污泥龄 SRT"
            standard="常规 5~15 d;硝化系统 ≥ 10 d"
            items={[
              { label: 'SRT', value: srtResult.srtDays.toFixed(2), unit: 'd', status: srtResult.srtDays >= 5 && srtResult.srtDays <= 30 ? 'success' : 'warning' },
              { label: '反应池总污泥量 V·X', value: srtResult.massInReactor.toFixed(2), unit: 'kg' },
              { label: '每日排出污泥量', value: srtResult.wastedMass.toFixed(4), unit: 'kg/d' },
            ]}
          />
        ))}

        {active === 'hrt' && ('error' in hrtResult ? <ErrorBox message={hrtResult.error} /> : (
          <ResultDisplay
            title="水力停留时间"
            standard="HRT = V / Q"
            items={[
              { label: 'HRT', value: hrtResult.hrtDays.toFixed(4), unit: 'd', status: 'success' },
              { label: 'HRT(小时)', value: hrtResult.hrtHours.toFixed(2), unit: 'h' },
            ]}
          />
        ))}

        {active === 'aor' && ('error' in aorResult ? <ErrorBox message={aorResult.error} /> : (
          <ResultDisplay
            title="实际需氧量 AOR"
            standard="AOR = a'·Q·ΔBOD + b'·Q·ΔNH₄ − 1.42·R_endo"
            items={[
              { label: 'AOR', value: aorResult.aorKgPerDay.toFixed(2), unit: 'kg O₂/d', status: 'success' },
              { label: '碳化氧耗', value: aorResult.carbonDemandKg.toFixed(2), unit: 'kg O₂/d' },
              { label: '硝化氧耗', value: aorResult.nitrificationDemandKg.toFixed(2), unit: 'kg O₂/d' },
            ]}
          />
        ))}

        {active === 'sor' && ('error' in sorResult ? <ErrorBox message={sorResult.error} /> : (
          <ResultDisplay
            title="标态需氧量 SOR"
            standard="SOR = AOR · Cs20 / [α(β·CsT − CL)] · 1.024^(20−T)"
            items={[
              { label: 'SOR', value: sorResult.sorKgPerDay.toFixed(2), unit: 'kg O₂/d', status: 'success' },
              { label: '折算系数', value: sorResult.factor.toFixed(4) },
            ]}
          />
        ))}

        {active === 'coagulant' && ('error' in coagResult ? <ErrorBox message={coagResult.error} /> : (
          <ResultDisplay
            title="药剂投加量"
            standard="日投加量 = Q · c / 1000"
            items={[
              { label: '日投加量', value: coagResult.dailyKg.toFixed(2), unit: 'kg/d', status: 'success' },
              { label: '年投加量', value: coagResult.yearlyTon.toFixed(2), unit: 't/a' },
            ]}
          />
        ))}

        {active === 'ct' && ('error' in ctResult ? <ErrorBox message={ctResult.error} /> : (
          <ResultDisplay
            title="氯消毒 CT 值"
            standard="USEPA 5℃/pH7 参考:游氯 Giardia 1-log ≈ 40;病毒 1-log ≈ 3 mg·min/L"
            items={[
              { label: 'CT', value: ctResult.ctValue.toFixed(2), unit: 'mg·min/L', status: 'success' },
              { label: 'Giardia 对数去除', value: ctResult.logRemovalGiardia },
              { label: '病毒对数去除', value: ctResult.logRemovalVirus },
            ]}
          />
        ))}

        {active === 'uv' && ('error' in uvResult ? <ErrorBox message={uvResult.error} /> : (
          <ResultDisplay
            title="紫外剂量"
            standard="USEPA 饮用水推荐 ≥ 40 mJ/cm²"
            items={[
              { label: '剂量 D', value: uvResult.dose.toFixed(2), unit: 'mJ/cm²', status: uvResult.complianceUsepa ? 'success' : 'warning' },
              { label: '判定', value: uvResult.text, status: uvResult.complianceUsepa ? 'success' : 'warning' },
            ]}
          />
        ))}

        {active === 'ebct' && ('error' in ebctResult ? <ErrorBox message={ebctResult.error} /> : (
          <ResultDisplay
            title="活性炭 EBCT"
            standard="VOC 深度处理推荐 ≥ 10 min"
            items={[
              { label: 'EBCT', value: ebctResult.ebctMinutes.toFixed(2), unit: 'min', status: ebctResult.ebctMinutes >= 10 ? 'success' : 'warning' },
              { label: 'EBCT(秒)', value: ebctResult.ebctSeconds.toFixed(1), unit: 's' },
            ]}
          />
        ))}
      </FormulaModuleShell>
    </CalculatorShell>
  );
}
