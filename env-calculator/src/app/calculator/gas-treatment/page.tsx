'use client';

import React, { useMemo, useState } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import FormulaModuleShell, { FormulaModuleOption } from '@/components/FormulaModuleShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
import {
  calculateMinimumLiquidGasRatio,
  calculatePackedTowerNtu,
  calculatePackedTowerPressureDrop,
  parseDecimalInput,
} from '@/lib/calculators';

type GasFormula = 'lg-ratio' | 'ntu' | 'pressure-drop';

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
    group: '填料塔设计',
    description: '计算 packed tower 所需传质单元数，用于结合 Htu 确定填料高度。',
    formula: 'Ntu = ln{[(Yi-mXi)/(Yo-mXi)]/(1-1/AF)+1/AF}/(1-1/AF)',
  },
  {
    key: 'pressure-drop',
    title: '填料塔压降',
    group: '填料塔风机选型',
    description: '估算单位填料高度压降，用于风机功率和能耗核算。',
    formula: 'ΔP = c(jL × Lsfr/3600)(f × Gsfr)² / ρG',
  },
];

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

  const handleReset = () => {
    setActive('lg-ratio');
    setYi('');
    setYo('');
    setXoStar('');
    setXi('');
    setAf('');
    setM('');
    setNtuYi('');
    setNtuYo('');
    setNtuXi('');
    setC('');
    setJL('');
    setLRate('');
    setF('');
    setGRate('');
    setRhoG('');
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
        </section>

        {active === 'lg-ratio' && ('error' in ratioResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{ratioResult.error}</div>
        ) : (
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

        {active === 'ntu' && ('error' in ntuResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{ntuResult.error}</div>
        ) : (
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

        {active === 'pressure-drop' && ('error' in pressureDropResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{pressureDropResult.error}</div>
        ) : (
          <ResultDisplay
            title="填料塔压降"
            standard="ΔP = c(jL × Lsfr/3600)(f × Gsfr)² / ρG"
            items={[
              { label: '压降 ΔP', value: pressureDropResult.pressureDropInH2OPerFt.toFixed(6), unit: 'in. H₂O/ft填料', status: 'success' },
            ]}
          />
        ))}
      </FormulaModuleShell>
    </CalculatorShell>
  );
}
