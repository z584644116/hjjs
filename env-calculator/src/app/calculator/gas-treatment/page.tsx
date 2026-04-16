'use client';

import React, { useMemo, useState } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import FormulaModuleShell, { FormulaModuleOption } from '@/components/FormulaModuleShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
import {
  calculateActivatedCarbonIsotherm,
  calculateBagFilter,
  calculateCalciumSulfur,
  calculateCyclone,
  calculateEsPrecipitator,
  calculateMinimumLiquidGasRatio,
  calculatePackedTowerNtu,
  calculatePackedTowerPressureDrop,
  calculateRtoEfficiency,
  calculateScr,
  calculateWetScrubberLg,
  parseDecimalInput,
} from '@/lib/calculators';

type GasFormula =
  | 'lg-ratio'
  | 'ntu'
  | 'pressure-drop'
  | 'es-precipitator'
  | 'bag-filter'
  | 'cyclone'
  | 'wet-lg'
  | 'ca-s'
  | 'scr'
  | 'rto'
  | 'carbon';

const formulaModules: FormulaModuleOption[] = [
  {
    key: 'lg-ratio',
    title: '最小液气摩尔比',
    group: '吸收塔设计',
    description: '确定吸收塔最小液气比，并给出 1.2~1.5 倍推荐操作范围。',
    formula: '(Ls/Gs)min = (Yi - Yo) / (Xo* - Xi)',
  },
  {
    key: 'ntu',
    title: '填料塔传质单元数',
    group: '吸收塔设计',
    description: '计算 packed tower 所需传质单元数，用于结合 Htu 确定填料高度。',
    formula: 'Ntu = ln{[(Yi-mXi)/(Yo-mXi)]/(1-1/AF)+1/AF}/(1-1/AF)',
  },
  {
    key: 'pressure-drop',
    title: '填料塔压降',
    group: '吸收塔设计',
    description: '估算单位填料高度压降，用于风机功率和能耗核算。',
    formula: 'ΔP = c(jL × Lsfr/3600)(f × Gsfr)² / ρG',
  },
  {
    key: 'es-precipitator',
    title: '静电除尘效率',
    group: '除尘工艺',
    description: 'Deutsch 方程:按 SCA 和驱进速度估算静电除尘器效率。',
    formula: 'η = 1 - exp(-SCA · ωk);SCA = A / Q',
  },
  {
    key: 'bag-filter',
    title: '袋式除尘气布比',
    group: '除尘工艺',
    description: '气布比 A/C 核查,常规 0.6~1.5 m/min,脉冲清灰可到 3。',
    formula: 'A/C = Q / A (m/min)',
  },
  {
    key: 'cyclone',
    title: '旋风分离 d50',
    group: '除尘工艺',
    description: 'Lapple 分级粒径,评估旋风分离器的分离能力。',
    formula: 'd50 = √[9μW / (2π·Ne·Vi·ρp)]',
  },
  {
    key: 'wet-lg',
    title: '湿法脱硫液气比',
    group: '脱硫脱硝',
    description: 'L/G 评估,石灰石法常规 10~20 L/m³。',
    formula: 'L/G = L(m³/h)·1000 / G(m³/h)',
  },
  {
    key: 'ca-s',
    title: 'Ca/S 与石膏产率',
    group: '脱硫脱硝',
    description: '核算石灰石/石灰法投加钙硫比与理论石膏副产量。',
    formula: 'Ca/S = n_Ca / n_SO2;石膏 = Δn_SO2 × 172 g/mol',
  },
  {
    key: 'scr',
    title: 'SCR 脱硝 NSR / GHSV',
    group: '脱硫脱硝',
    description: '氨氮摩尔比、空速和接触时间一次核算。',
    formula: 'NSR = n_NH3 / n_NOx;GHSV = Q / V',
  },
  {
    key: 'rto',
    title: 'RTO 热回收效率',
    group: '有机废气治理',
    description: '蓄热氧化炉预热段热效率评估。',
    formula: 'η = (T预热出 − T进) / (T燃烧 − T进)',
  },
  {
    key: 'carbon',
    title: '活性炭 Langmuir 等温',
    group: '有机废气治理',
    description: '由 q_max、b 预测当前浓度下的平衡吸附量与饱和度。',
    formula: 'q* = q_max·b·C / (1 + b·C)',
  },
];

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
      {message}
    </div>
  );
}

export default function GasTreatmentPage() {
  const [active, setActive] = useState<GasFormula>('lg-ratio');

  const [yi, setYi] = useState('0.010');
  const [yo, setYo] = useState('0.001');
  const [xoStar, setXoStar] = useState('0.030');
  const [xi, setXi] = useState('0.000');

  const [af, setAf] = useState('1.5');
  const [m, setM] = useState('0.8');
  const [ntuYi, setNtuYi] = useState('0.010');
  const [ntuYo, setNtuYo] = useState('0.001');
  const [ntuXi, setNtuXi] = useState('0.000');

  const [c, setC] = useState('0.115');
  const [jL, setJL] = useState('1.0');
  const [lRate, setLRate] = useState('1500');
  const [f, setF] = useState('20');
  const [gRate, setGRate] = useState('2000');
  const [rhoG, setRhoG] = useState('0.075');

  // ES precipitator
  const [esA, setEsA] = useState('2000');
  const [esQ, setEsQ] = useState('20');
  const [esW, setEsW] = useState('0.1');

  // Bag filter
  const [bagQ, setBagQ] = useState('1500');
  const [bagA, setBagA] = useState('1500');

  // Cyclone
  const [cyMu, setCyMu] = useState('1.81e-5');
  const [cyW, setCyW] = useState('0.15');
  const [cyVi, setCyVi] = useState('15');
  const [cyRho, setCyRho] = useState('2500');
  const [cyNe, setCyNe] = useState('5');

  // Wet scrubber L/G
  const [wetL, setWetL] = useState('40');
  const [wetG, setWetG] = useState('3000');

  // Ca/S
  const [caCa, setCaCa] = useState('1200');
  const [caSo2, setCaSo2] = useState('1000');
  const [caEff, setCaEff] = useState('95');

  // SCR
  const [scrNh3, setScrNh3] = useState('800');
  const [scrNox, setScrNox] = useState('1000');
  const [scrQ, setScrQ] = useState('100000');
  const [scrV, setScrV] = useState('25');

  // RTO
  const [rtoPre, setRtoPre] = useState('780');
  const [rtoBurn, setRtoBurn] = useState('800');
  const [rtoIn, setRtoIn] = useState('25');

  // Activated carbon
  const [carbonQmax, setCarbonQmax] = useState('200');
  const [carbonB, setCarbonB] = useState('0.05');
  const [carbonC, setCarbonC] = useState('50');

  const ratioResult = useMemo(() => calculateMinimumLiquidGasRatio({
    inletGasMoleFraction: parseDecimalInput(yi),
    outletGasMoleFraction: parseDecimalInput(yo),
    equilibriumLiquidConcentration: parseDecimalInput(xoStar),
    inletLiquidConcentration: parseDecimalInput(xi),
  }), [xi, xoStar, yi, yo]);

  const ntuResult = useMemo(() => calculatePackedTowerNtu({
    absorptionFactor: parseDecimalInput(af),
    equilibriumSlope: parseDecimalInput(m),
    inletGasMoleFraction: parseDecimalInput(ntuYi),
    outletGasMoleFraction: parseDecimalInput(ntuYo),
    inletLiquidConcentration: parseDecimalInput(ntuXi),
  }), [af, m, ntuXi, ntuYi, ntuYo]);

  const pressureDropResult = useMemo(() => calculatePackedTowerPressureDrop({
    packingConstantC: parseDecimalInput(c),
    liquidLoadingFactor: parseDecimalInput(jL),
    liquidSuperficialRate: parseDecimalInput(lRate),
    packingFactor: parseDecimalInput(f),
    gasSuperficialRate: parseDecimalInput(gRate),
    gasDensity: parseDecimalInput(rhoG),
  }), [c, f, gRate, jL, lRate, rhoG]);

  const esResult = useMemo(() => calculateEsPrecipitator({
    collectingAreaM2: parseDecimalInput(esA),
    flowM3PerSecond: parseDecimalInput(esQ),
    migrationVelocity: parseDecimalInput(esW),
  }), [esA, esQ, esW]);

  const bagResult = useMemo(() => calculateBagFilter({
    flowM3PerMinute: parseDecimalInput(bagQ),
    filterAreaM2: parseDecimalInput(bagA),
  }), [bagA, bagQ]);

  const cycloneResult = useMemo(() => calculateCyclone({
    gasViscosityPaS: parseDecimalInput(cyMu),
    inletWidthM: parseDecimalInput(cyW),
    inletVelocityMS: parseDecimalInput(cyVi),
    particleDensityKgM3: parseDecimalInput(cyRho),
    effectiveTurns: parseDecimalInput(cyNe),
  }), [cyMu, cyNe, cyRho, cyVi, cyW]);

  const wetResult = useMemo(() => calculateWetScrubberLg({
    liquidFlowM3PerHour: parseDecimalInput(wetL),
    gasFlowM3PerHour: parseDecimalInput(wetG),
  }), [wetG, wetL]);

  const caResult = useMemo(() => calculateCalciumSulfur({
    caInletMolPerHour: parseDecimalInput(caCa),
    so2InletMolPerHour: parseDecimalInput(caSo2),
    so2RemovalPercent: parseDecimalInput(caEff),
  }), [caCa, caEff, caSo2]);

  const scrResult = useMemo(() => calculateScr({
    nh3MolPerHour: parseDecimalInput(scrNh3),
    noxMolPerHour: parseDecimalInput(scrNox),
    flowM3PerHour: parseDecimalInput(scrQ),
    catalystVolumeM3: parseDecimalInput(scrV),
  }), [scrNh3, scrNox, scrQ, scrV]);

  const rtoResult = useMemo(() => calculateRtoEfficiency({
    preheatOutletC: parseDecimalInput(rtoPre),
    combustionC: parseDecimalInput(rtoBurn),
    ambientInletC: parseDecimalInput(rtoIn),
  }), [rtoBurn, rtoIn, rtoPre]);

  const carbonResult = useMemo(() => calculateActivatedCarbonIsotherm({
    qMax: parseDecimalInput(carbonQmax),
    b: parseDecimalInput(carbonB),
    cEquilibrium: parseDecimalInput(carbonC),
  }), [carbonB, carbonC, carbonQmax]);

  const handleReset = () => {
    setActive('lg-ratio');
    setYi(''); setYo(''); setXoStar(''); setXi('');
    setAf(''); setM(''); setNtuYi(''); setNtuYo(''); setNtuXi('');
    setC(''); setJL(''); setLRate(''); setF(''); setGRate(''); setRhoG('');
    setEsA(''); setEsQ(''); setEsW('');
    setBagQ(''); setBagA('');
    setCyMu(''); setCyW(''); setCyVi(''); setCyRho(''); setCyNe('');
    setWetL(''); setWetG('');
    setCaCa(''); setCaSo2(''); setCaEff('');
    setScrNh3(''); setScrNox(''); setScrQ(''); setScrV('');
    setRtoPre(''); setRtoBurn(''); setRtoIn('');
    setCarbonQmax(''); setCarbonB(''); setCarbonC('');
  };

  const actions = (
    <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
      重置
    </button>
  );

  return (
    <CalculatorShell title="气体处理公式" actions={actions}>
      <FormulaModuleShell modules={formulaModules} activeKey={active} onChange={(key) => setActive(key as GasFormula)}>
        <section className="app-panel space-y-4 p-4 md:p-5">
          {active === 'lg-ratio' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="进气 Yi" value={yi} onChange={setYi} required hint="气相污染物摩尔分数" />
              <NumberInput label="出气 Yo" value={yo} onChange={setYo} required hint="气相污染物摩尔分数" />
              <NumberInput label="液相平衡 Xo*" value={xoStar} onChange={setXoStar} required hint="mol污染物/mol溶剂" />
              <NumberInput label="进液 Xi" value={xi} onChange={setXi} required hint="mol污染物/mol溶剂" />
            </div>
          )}

          {active === 'ntu' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumberInput label="吸收因子 AF" value={af} onChange={setAf} required />
              <NumberInput label="平衡线斜率 m" value={m} onChange={setM} required />
              <NumberInput label="进气 Yi" value={ntuYi} onChange={setNtuYi} required />
              <NumberInput label="出气 Yo" value={ntuYo} onChange={setNtuYo} required />
              <NumberInput label="进液 Xi" value={ntuXi} onChange={setNtuXi} required />
            </div>
          )}

          {active === 'pressure-drop' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumberInput label="填料常数 c" value={c} onChange={setC} required />
              <NumberInput label="填料常数 jL" value={jL} onChange={setJL} required />
              <NumberInput label="液相表观流速 Lsfr" unit="lb/h·ft²" value={lRate} onChange={setLRate} required />
              <NumberInput label="填料常数 f" value={f} onChange={setF} required />
              <NumberInput label="气相表观流速 Gsfr" unit="lb/h·ft²" value={gRate} onChange={setGRate} required />
              <NumberInput label="气体密度 ρG" unit="lb/ft³" value={rhoG} onChange={setRhoG} required />
            </div>
          )}

          {active === 'es-precipitator' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberInput label="集尘面积 A" unit="m²" value={esA} onChange={setEsA} required />
              <NumberInput label="处理气量 Q" unit="m³/s" value={esQ} onChange={setEsQ} required />
              <NumberInput label="驱进速度 ωk" unit="m/s" value={esW} onChange={setEsW} required hint="典型 0.05~0.15" />
            </div>
          )}

          {active === 'bag-filter' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="处理气量 Q" unit="m³/min" value={bagQ} onChange={setBagQ} required />
              <NumberInput label="过滤面积 A" unit="m²" value={bagA} onChange={setBagA} required />
            </div>
          )}

          {active === 'cyclone' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumberInput label="气体粘度 μ" unit="Pa·s" value={cyMu} onChange={setCyMu} required hint="空气 20℃ ≈ 1.81e-5" />
              <NumberInput label="入口宽度 W" unit="m" value={cyW} onChange={setCyW} required />
              <NumberInput label="入口气速 Vi" unit="m/s" value={cyVi} onChange={setCyVi} required />
              <NumberInput label="颗粒密度 ρp" unit="kg/m³" value={cyRho} onChange={setCyRho} required />
              <NumberInput label="有效旋转圈数 Ne" value={cyNe} onChange={setCyNe} required hint="典型 5" />
            </div>
          )}

          {active === 'wet-lg' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberInput label="液流量 L" unit="m³/h" value={wetL} onChange={setWetL} required />
              <NumberInput label="气流量 G" unit="m³/h" value={wetG} onChange={setWetG} required />
            </div>
          )}

          {active === 'ca-s' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberInput label="Ca 进料" unit="mol/h" value={caCa} onChange={setCaCa} required />
              <NumberInput label="SO₂ 进料" unit="mol/h" value={caSo2} onChange={setCaSo2} required />
              <NumberInput label="脱硫效率 η" unit="%" value={caEff} onChange={setCaEff} required />
            </div>
          )}

          {active === 'scr' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <NumberInput label="NH₃ 流量" unit="mol/h" value={scrNh3} onChange={setScrNh3} required />
              <NumberInput label="NOx 流量" unit="mol/h" value={scrNox} onChange={setScrNox} required />
              <NumberInput label="烟气流量 Q" unit="m³/h" value={scrQ} onChange={setScrQ} required />
              <NumberInput label="催化剂体积 V" unit="m³" value={scrV} onChange={setScrV} required />
            </div>
          )}

          {active === 'rto' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberInput label="预热出口温度 T预" unit="℃" value={rtoPre} onChange={setRtoPre} required />
              <NumberInput label="燃烧室温度 T燃" unit="℃" value={rtoBurn} onChange={setRtoBurn} required />
              <NumberInput label="进气温度 T进" unit="℃" value={rtoIn} onChange={setRtoIn} required />
            </div>
          )}

          {active === 'carbon' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberInput label="q_max" unit="mg/g" value={carbonQmax} onChange={setCarbonQmax} required />
              <NumberInput label="Langmuir b" unit="L/mg" value={carbonB} onChange={setCarbonB} required />
              <NumberInput label="平衡浓度 C" unit="mg/L" value={carbonC} onChange={setCarbonC} required />
            </div>
          )}
        </section>

        {active === 'lg-ratio' && ('error' in ratioResult ? <ErrorBox message={ratioResult.error} /> : (
          <ResultDisplay
            title="最小液气摩尔比"
            standard="(Ls/Gs)min = (Yi - Yo) / (Xo* - Xi)"
            items={[
              { label: '最小液气比', value: ratioResult.minimumRatio.toFixed(6), unit: 'mol/mol', status: 'success' },
              { label: '推荐下限 1.2×', value: ratioResult.recommendedRatioLow.toFixed(6), unit: 'mol/mol' },
              { label: '推荐上限 1.5×', value: ratioResult.recommendedRatioHigh.toFixed(6), unit: 'mol/mol' },
            ]}
          />
        ))}

        {active === 'ntu' && ('error' in ntuResult ? <ErrorBox message={ntuResult.error} /> : (
          <ResultDisplay
            title="填料塔传质单元数"
            standard="Ntu = ln{[(Yi-mXi)/(Yo-mXi)]/(1-1/AF)+1/AF}/(1-1/AF)"
            items={[
              { label: '传质单元数 Ntu', value: ntuResult.ntu.toFixed(4), status: 'success' },
              { label: '分母项 1-1/AF', value: ntuResult.denominatorTerm.toFixed(6) },
              { label: '对数项', value: ntuResult.logarithmArgument.toFixed(6) },
            ]}
          />
        ))}

        {active === 'pressure-drop' && ('error' in pressureDropResult ? <ErrorBox message={pressureDropResult.error} /> : (
          <ResultDisplay
            title="填料塔压降"
            standard="ΔP = c(jL × Lsfr/3600)(f × Gsfr)² / ρG"
            items={[
              { label: '压降 ΔP', value: pressureDropResult.pressureDropInH2OPerFt.toFixed(6), unit: 'in. H₂O/ft填料', status: 'success' },
            ]}
          />
        ))}

        {active === 'es-precipitator' && ('error' in esResult ? <ErrorBox message={esResult.error} /> : (
          <ResultDisplay
            title="静电除尘效率"
            standard="Deutsch η = 1 - exp(-SCA · ωk)"
            items={[
              { label: '比集尘面积 SCA', value: esResult.sca.toFixed(2), unit: 's/m' },
              { label: '除尘效率 η', value: esResult.efficiencyPercent.toFixed(2), unit: '%', status: esResult.efficiencyPercent >= 99 ? 'success' : esResult.efficiencyPercent >= 95 ? 'warning' : 'danger' },
            ]}
          />
        ))}

        {active === 'bag-filter' && ('error' in bagResult ? <ErrorBox message={bagResult.error} /> : (
          <ResultDisplay
            title="袋式除尘气布比"
            standard="常规 0.6~1.5 m/min;脉冲清灰 1.5~3.0"
            items={[
              { label: '气布比 A/C', value: bagResult.airToClothRatio.toFixed(3), unit: 'm/min', status: bagResult.airToClothRatio <= 1.5 ? 'success' : bagResult.airToClothRatio <= 3 ? 'warning' : 'danger' },
              { label: '判定', value: bagResult.assessment },
            ]}
          />
        ))}

        {active === 'cyclone' && ('error' in cycloneResult ? <ErrorBox message={cycloneResult.error} /> : (
          <ResultDisplay
            title="旋风分离 d50"
            standard="一般旋风 d50 约 2~10 μm"
            items={[
              { label: '分割粒径 d50', value: cycloneResult.d50Micron.toFixed(3), unit: 'μm', status: cycloneResult.d50Micron <= 10 ? 'success' : 'warning' },
            ]}
          />
        ))}

        {active === 'wet-lg' && ('error' in wetResult ? <ErrorBox message={wetResult.error} /> : (
          <ResultDisplay
            title="湿法脱硫液气比"
            standard="石灰石湿法常规 10~20 L/m³"
            items={[
              { label: 'L/G', value: wetResult.lgRatio.toFixed(2), unit: 'L/m³', status: wetResult.lgRatio >= 5 && wetResult.lgRatio <= 25 ? 'success' : 'warning' },
              { label: '判定', value: wetResult.assessment },
            ]}
          />
        ))}

        {active === 'ca-s' && ('error' in caResult ? <ErrorBox message={caResult.error} /> : (
          <ResultDisplay
            title="Ca/S 与石膏产率"
            standard="湿法石灰石一般 Ca/S 1.02~1.05"
            items={[
              { label: 'Ca/S 摩尔比', value: caResult.caSRatio.toFixed(3), status: caResult.caSRatio >= 1 && caResult.caSRatio <= 1.1 ? 'success' : 'warning' },
              { label: '石膏产率', value: caResult.gypsumYieldKgPerHour.toFixed(2), unit: 'kg/h' },
            ]}
          />
        ))}

        {active === 'scr' && ('error' in scrResult ? <ErrorBox message={scrResult.error} /> : (
          <ResultDisplay
            title="SCR 脱硝核算"
            standard="NSR 一般 0.9~1.05;空速 GHSV 2000~8000 h⁻¹"
            items={[
              { label: 'NSR', value: scrResult.nsr.toFixed(3), status: scrResult.nsr >= 0.9 && scrResult.nsr <= 1.05 ? 'success' : 'warning' },
              { label: 'GHSV', value: scrResult.ghsvPerHour.toFixed(0), unit: 'h⁻¹' },
              { label: '接触时间 τ', value: scrResult.contactSeconds.toFixed(3), unit: 's' },
            ]}
          />
        ))}

        {active === 'rto' && ('error' in rtoResult ? <ErrorBox message={rtoResult.error} /> : (
          <ResultDisplay
            title="RTO 热回收效率"
            standard="两床 RTO ≥ 95%;三床 ≥ 97%"
            items={[
              { label: '热回收效率 η', value: rtoResult.thermalRecoveryPercent.toFixed(2), unit: '%', status: rtoResult.thermalRecoveryPercent >= 95 ? 'success' : rtoResult.thermalRecoveryPercent >= 90 ? 'warning' : 'danger' },
              { label: '预热温升', value: rtoResult.temperatureRisePreheat.toFixed(1), unit: '℃' },
              { label: '距燃烧室温差', value: rtoResult.temperatureGapToBurner.toFixed(1), unit: '℃' },
            ]}
          />
        ))}

        {active === 'carbon' && ('error' in carbonResult ? <ErrorBox message={carbonResult.error} /> : (
          <ResultDisplay
            title="活性炭 Langmuir 等温"
            standard="q* = q_max·b·C / (1 + b·C)"
            items={[
              { label: '平衡吸附量 q*', value: carbonResult.qEquilibrium.toFixed(4), unit: 'mg/g', status: 'success' },
              { label: '占饱和比例', value: carbonResult.saturationPercent.toFixed(2), unit: '%' },
            ]}
          />
        ))}
      </FormulaModuleShell>
    </CalculatorShell>
  );
}
