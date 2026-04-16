'use client';

import React, { useMemo, useState } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
import { calculateTitrationAsCaco3 } from '@/lib/calculators';

// Data definitions
const equivalentWeights: Record<string, number> = {
  k: 39.1,
  na: 23.0,
  ca: 20.04,
  mg: 12.15,
  cl: 35.45,
  so4: 48.03,
  hco3: 61.02,
  co3: 30.005,
};

type IonOption = { key: string; name: string; molarMass: number; charge: number };

const optionalCations: Record<string, IonOption> = {
  fe2: { key: 'fe2', name: '亚铁 (Fe²⁺)', molarMass: 55.845, charge: 2 },
  fe3: { key: 'fe3', name: '铁(III) (Fe³⁺)', molarMass: 55.845, charge: 3 },
  mn2: { key: 'mn2', name: '锰 (Mn²⁺)', molarMass: 54.938, charge: 2 },
  nh4: { key: 'nh4', name: '铵 (NH₄⁺)', molarMass: 18.039, charge: 1 },
  pb2: { key: 'pb2', name: '铅 (Pb²⁺)', molarMass: 207.2, charge: 2 },
};

const optionalAnions: Record<string, IonOption> = {
  f: { key: 'f', name: '氟 (F⁻)', molarMass: 18.998, charge: -1 },
  no3: { key: 'no3', name: '硝酸根 (NO₃⁻)', molarMass: 62.004, charge: -1 },
  no2: { key: 'no2', name: '亚硝酸根 (NO₂⁻)', molarMass: 46.005, charge: -1 },
  po4: { key: 'po4', name: '磷酸根 (PO₄³⁻)', molarMass: 94.971, charge: -3 },
  cro4: { key: 'cro4', name: '铬酸根 (CrO₄²⁻)', molarMass: 115.99, charge: -2 },
};

const KSP = { CaCO3: 3.8e-9, CaSO4: 2.4e-5, PbCrO4: 1.8e-14, PbSO4: 1.7e-8 };

function parseNum(str: string): number {
  return str.trim() === '' ? 0 : parseFloat(str.replace(',', '.'));
}

type OptionalRow = { id: string; key: string; conc: string };

export default function WaterQualityQCPage() {
  // base ions (mg/L)
  const [k, setK] = useState('');
  const [na, setNa] = useState('');
  const [ca, setCa] = useState('');
  const [mg, setMg] = useState('');
  const [cl, setCl] = useState('');
  const [so4, setSo4] = useState('');
  const [hco3, setHco3] = useState('');
  const [co3, setCo3] = useState('');

  // optional ions
  const [optCations, setOptCations] = useState<OptionalRow[]>([]);
  const [optAnions, setOptAnions] = useState<OptionalRow[]>([]);

  // other params
  const [tdsMeasured, setTdsMeasured] = useState('');
  const [ecMeasured, setEcMeasured] = useState('');
  const [hardnessMeasured, setHardnessMeasured] = useState('');
  const [titrantVolume, setTitrantVolume] = useState('');
  const [blankVolume, setBlankVolume] = useState('');
  const [titrantConcentration, setTitrantConcentration] = useState('');
  const [sampleVolume, setSampleVolume] = useState('');

  const [showResult, setShowResult] = useState(false);

  const ionBalance = useMemo(() => {
    const cationsMeq =
      parseNum(k) / equivalentWeights.k +
      parseNum(na) / equivalentWeights.na +
      parseNum(ca) / equivalentWeights.ca +
      parseNum(mg) / equivalentWeights.mg;
    const anionsMeq =
      parseNum(cl) / equivalentWeights.cl +
      parseNum(so4) / equivalentWeights.so4 +
      parseNum(hco3) / equivalentWeights.hco3 +
      parseNum(co3) / equivalentWeights.co3;

    let cOpt = 0,
      aOpt = 0;
    optCations.forEach((r) => {
      const v = parseNum(r.conc);
      if (!r.key || v <= 0) return;
      const info = optionalCations[r.key];
      if (!info) return;
      const meq = v / (info.molarMass / Math.abs(info.charge));
      cOpt += meq;
    });
    optAnions.forEach((r) => {
      const v = parseNum(r.conc);
      if (!r.key || v <= 0) return;
      const info = optionalAnions[r.key];
      if (!info) return;
      const meq = v / (info.molarMass / Math.abs(info.charge));
      aOpt += meq;
    });

    const totalC = cationsMeq + cOpt;
    const totalA = anionsMeq + aOpt;
    const sum = totalC + totalA;
    const error = sum > 0 ? ((totalC - totalA) / sum) * 100 : 0;
    const ok = Math.abs(error) <= 10;

    return { totalC, totalA, error, ok };
  }, [k, na, ca, mg, cl, so4, hco3, co3, optCations, optAnions]);

  const tdsVsIons = useMemo(() => {
    const tds = parseNum(tdsMeasured);
    const ions: Record<string, number> = {
      k: parseNum(k),
      na: parseNum(na),
      ca: parseNum(ca),
      mg: parseNum(mg),
      cl: parseNum(cl),
      so4: parseNum(so4),
      hco3: parseNum(hco3),
      co3: parseNum(co3),
    };
    optCations.forEach((r) => {
      const v = parseNum(r.conc);
      if (r.key && v > 0) ions[r.key] = (ions[r.key] || 0) + v;
    });
    optAnions.forEach((r) => {
      const v = parseNum(r.conc);
      if (r.key && v > 0) ions[r.key] = (ions[r.key] || 0) + v;
    });

    let calculatedTds = 0;
    for (const key in ions) {
      if (key === 'hco3') calculatedTds += ions[key] * (60 / 122);
      else calculatedTds += ions[key];
    }
    const error = tds > 0 ? (calculatedTds / tds - 1) * 100 : 0;
    const ok = Math.abs(error) <= 10;
    return { calculatedTds, tds, error, ok };
  }, [k, na, ca, mg, cl, so4, hco3, co3, optCations, optAnions, tdsMeasured]);

  const tdsVsEc = useMemo(() => {
    const tds = parseNum(tdsMeasured);
    const ec = parseNum(ecMeasured);
    const ratio = tds > 0 && ec > 0 ? tds / ec : 0;
    const ok = ratio >= 0.55 && ratio <= 0.70;
    return { ratio, ok };
  }, [tdsMeasured, ecMeasured]);

  const ecVsIons = useMemo(() => {
    const ec = parseNum(ecMeasured);
    const c = ionBalance.totalC;
    const a = ionBalance.totalA;
    const errorC = ec > 0 ? (c * 100 / ec - 1) * 100 : 0;
    const errorA = ec > 0 ? (a * 100 / ec - 1) * 100 : 0;
    return { errorC, errorA, okC: Math.abs(errorC) <= 10, okA: Math.abs(errorA) <= 10 };
  }, [ionBalance, ecMeasured]);

  const hardness = useMemo(() => {
    const meas = parseNum(hardnessMeasured);
    const caV = parseNum(ca);
    const mgV = parseNum(mg);
    let fe3V = 0,
      mn2V = 0;
    optCations.forEach((r) => {
      const v = parseNum(r.conc);
      if (r.key === 'fe3') fe3V += v;
      if (r.key === 'mn2') mn2V += v;
    });
    const calc = ((caV / 20) + (mgV / 12) + (fe3V / 18.6) + (mn2V / 27.5)) * 50;
    const error = meas > 0 ? (calc / meas - 1) * 100 : 0;
    const ok = Math.abs(error) <= 10;
    return { calc, meas, error, ok };
  }, [hardnessMeasured, ca, mg, optCations]);

  const alkalinityHardness = useMemo(() => calculateTitrationAsCaco3({
    titrantVolumeMl: parseNum(titrantVolume),
    blankVolumeMl: parseNum(blankVolume),
    titrantConcentrationMolL: parseNum(titrantConcentration),
    sampleVolumeMl: parseNum(sampleVolume),
  }), [blankVolume, sampleVolume, titrantConcentration, titrantVolume]);

  const hasTitrationInput = [titrantVolume, blankVolume, titrantConcentration, sampleVolume]
    .some((value) => value.trim() !== '');

  const solubility = useMemo(() => {
    const caMol = parseNum(ca) / 1000 / 40.08;
    const co3Mol = parseNum(co3) / 1000 / 60.009;
    const so4Mol = parseNum(so4) / 1000 / 96.06;
    let pbMgL = 0;
    optCations.forEach((r) => {
      const v = parseNum(r.conc);
      if (r.key === 'pb2' && v > 0) pbMgL += v;
    });
    let cro4MgL = 0;
    optAnions.forEach((r) => {
      const v = parseNum(r.conc);
      if (r.key === 'cro4' && v > 0) cro4MgL += v;
    });
    const pbMol = pbMgL / 1000 / optionalCations.pb2.molarMass;
    const cro4Mol = cro4MgL / 1000 / optionalAnions.cro4.molarMass;

    const iap_CaCO3 = caMol * co3Mol;
    const iap_CaSO4 = caMol * so4Mol;
    const iap_PbCrO4 = pbMol * cro4Mol;
    const iap_PbSO4 = pbMol * so4Mol;

    const status = (iap: number, ksp: number) => {
      if (iap === 0) return '数据不足';
      const r = iap / ksp;
      if (r > 1.1) return '过饱和';
      if (r < 0.9) return '未饱和';
      return '饱和';
    };

    return {
      CaCO3: { iap: iap_CaCO3, ksp: KSP.CaCO3, status: status(iap_CaCO3, KSP.CaCO3) },
      CaSO4: { iap: iap_CaSO4, ksp: KSP.CaSO4, status: status(iap_CaSO4, KSP.CaSO4) },
      PbCrO4: { iap: iap_PbCrO4, ksp: KSP.PbCrO4, status: status(iap_PbCrO4, KSP.PbCrO4) },
      PbSO4: { iap: iap_PbSO4, ksp: KSP.PbSO4, status: status(iap_PbSO4, KSP.PbSO4) },
    };
  }, [ca, co3, so4, optCations, optAnions]);

  const resetAll = () => {
    setK('');
    setNa('');
    setCa('');
    setMg('');
    setCl('');
    setSo4('');
    setHco3('');
    setCo3('');
    setOptCations([]);
    setOptAnions([]);
    setTdsMeasured('');
    setEcMeasured('');
    setHardnessMeasured('');
    setTitrantVolume('');
    setBlankVolume('');
    setTitrantConcentration('');
    setSampleVolume('');
    setShowResult(false);
  };

  const addCation = () =>
    setOptCations((prev) => [...prev, { id: crypto.randomUUID(), key: '', conc: '' }]);
  const addAnion = () =>
    setOptAnions((prev) => [...prev, { id: crypto.randomUUID(), key: '', conc: '' }]);

  const handleCalculate = () => setShowResult(true);

  const actions = (
    <>
      <button
        type="button"
        onClick={handleCalculate}
        className="app-action-primary flex-1 md:flex-none"
      >
        开始计算
      </button>
      <button
        type="button"
        onClick={resetAll}
        className="app-action-secondary flex-1 md:flex-none"
      >
        重置
      </button>
    </>
  );

  return (
    <CalculatorShell
      title="水质质量控制分析"
      description="多模型水质评价（离子平衡、TDS、电导率与硬度校核）"
      actions={actions}
    >
      <div className="space-y-5">
        {/* 基础离子 */}
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-sm)]">
          <h3 className="text-base font-semibold text-[var(--app-ink)] mb-4">基础离子 (mg/L)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <NumberInput label="钾 K⁺" unit="mg/L" value={k} onChange={setK} placeholder="例如 2.5" />
            <NumberInput label="钠 Na⁺" unit="mg/L" value={na} onChange={setNa} placeholder="例如 15.0" />
            <NumberInput label="钙 Ca²⁺" unit="mg/L" value={ca} onChange={setCa} placeholder="例如 80.2" />
            <NumberInput label="镁 Mg²⁺" unit="mg/L" value={mg} onChange={setMg} placeholder="例如 24.3" />
            <NumberInput label="氯 Cl⁻" unit="mg/L" value={cl} onChange={setCl} placeholder="例如 20.0" />
            <NumberInput label="硫酸根 SO₄²⁻" unit="mg/L" value={so4} onChange={setSo4} placeholder="例如 96.0" />
            <NumberInput label="碳酸氢根 HCO₃⁻" unit="mg/L" value={hco3} onChange={setHco3} placeholder="例如 122.0" />
            <NumberInput label="碳酸根 CO₃²⁻" unit="mg/L" value={co3} onChange={setCo3} placeholder="例如 1.0" />
          </div>
        </div>

        {/* 可选阳离子 */}
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-sm)]">
          <h3 className="text-base font-semibold text-[var(--app-ink)] mb-4">可选阳离子</h3>
          <div className="space-y-3">
            {optCations.map((row) => (
              <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div>
                  <label className="block text-sm text-[var(--app-ink-secondary)] mb-1">离子</label>
                  <select
                    value={row.key}
                    onChange={(e) =>
                      setOptCations((prev) =>
                        prev.map((r) => (r.id === row.id ? { ...r, key: e.target.value } : r))
                      )
                    }
                    className="w-full h-10 px-3 rounded-[var(--app-radius)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-primary)] focus:border-transparent"
                  >
                    <option value="">-- 选择 --</option>
                    {Object.values(optionalCations).map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <NumberInput
                  label="浓度"
                  unit="mg/L"
                  value={row.conc}
                  onChange={(v) =>
                    setOptCations((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, conc: v } : r))
                    )
                  }
                  placeholder="浓度 (mg/L)"
                />
                <button
                  type="button"
                  onClick={() => setOptCations((prev) => prev.filter((r) => r.id !== row.id))}
                  className="h-10 px-3 rounded-[var(--app-radius)] text-sm text-[var(--app-danger)] border border-[var(--app-line)] hover:bg-[var(--app-danger-light)] transition-colors"
                  aria-label="删除"
                >
                  删除
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addCation}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--app-radius)] text-sm font-medium text-[var(--app-primary)] border border-dashed border-[var(--app-line)] hover:border-[var(--app-primary)] hover:bg-[var(--app-primary-light)] transition-colors"
            >
              + 添加阳离子
            </button>
          </div>
        </div>

        {/* 可选阴离子 */}
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-sm)]">
          <h3 className="text-base font-semibold text-[var(--app-ink)] mb-4">可选阴离子</h3>
          <div className="space-y-3">
            {optAnions.map((row) => (
              <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <div>
                  <label className="block text-sm text-[var(--app-ink-secondary)] mb-1">离子</label>
                  <select
                    value={row.key}
                    onChange={(e) =>
                      setOptAnions((prev) =>
                        prev.map((r) => (r.id === row.id ? { ...r, key: e.target.value } : r))
                      )
                    }
                    className="w-full h-10 px-3 rounded-[var(--app-radius)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--app-primary)] focus:border-transparent"
                  >
                    <option value="">-- 选择 --</option>
                    {Object.values(optionalAnions).map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
                <NumberInput
                  label="浓度"
                  unit="mg/L"
                  value={row.conc}
                  onChange={(v) =>
                    setOptAnions((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, conc: v } : r))
                    )
                  }
                  placeholder="浓度 (mg/L)"
                />
                <button
                  type="button"
                  onClick={() => setOptAnions((prev) => prev.filter((r) => r.id !== row.id))}
                  className="h-10 px-3 rounded-[var(--app-radius)] text-sm text-[var(--app-danger)] border border-[var(--app-line)] hover:bg-[var(--app-danger-light)] transition-colors"
                  aria-label="删除"
                >
                  删除
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addAnion}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--app-radius)] text-sm font-medium text-[var(--app-primary)] border border-dashed border-[var(--app-line)] hover:border-[var(--app-primary)] hover:bg-[var(--app-primary-light)] transition-colors"
            >
              + 添加阴离子
            </button>
          </div>
        </div>

        {/* 其他水质参数 */}
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-sm)]">
          <h3 className="text-base font-semibold text-[var(--app-ink)] mb-4">其他水质参数</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumberInput label="TDS 实测" unit="mg/L" value={tdsMeasured} onChange={setTdsMeasured} placeholder="例如 350" />
            <NumberInput label="电导率实测" unit="μS/cm" value={ecMeasured} onChange={setEcMeasured} placeholder="例如 550" />
            <NumberInput label="总硬度实测" unit="mg/L" value={hardnessMeasured} onChange={setHardnessMeasured} placeholder="例如 250" />
          </div>
          <p className="mt-3 text-xs text-[var(--app-ink-tertiary)]">
            如需计算沉淀溶解平衡，请分别在&ldquo;可选阳离子&rdquo;添加&ldquo;铅 (Pb²⁺)&rdquo;，并在&ldquo;可选阴离子&rdquo;添加&ldquo;铬酸根 (CrO₄²⁻)&rdquo;。
          </p>
        </div>

        {/* 碱度/硬度换算 */}
        <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-sm)]">
          <h3 className="text-base font-semibold text-[var(--app-ink)] mb-4">碱度/硬度换算（以 CaCO₃ 计）</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <NumberInput label="滴定体积 V" unit="mL" value={titrantVolume} onChange={setTitrantVolume} placeholder="例如 12.30" />
            <NumberInput label="空白体积 V0" unit="mL" value={blankVolume} onChange={setBlankVolume} placeholder="例如 0.05" />
            <NumberInput label="滴定液浓度 C" unit="mol/L" value={titrantConcentration} onChange={setTitrantConcentration} placeholder="例如 0.0100" />
            <NumberInput label="样品体积 Vs" unit="mL" value={sampleVolume} onChange={setSampleVolume} placeholder="例如 100" />
          </div>
          <p className="mt-3 text-xs text-[var(--app-ink-tertiary)]">
            mg/L(as CaCO₃) = (V - V0) × C × 50000 / Vs。
          </p>
        </div>

        {/* 计算结果 */}
        {showResult && (
          <div className="space-y-5">
            {/* 阴阳离子平衡 */}
            <ResultDisplay
              title="阴阳离子平衡"
              items={[
                { label: '总阳离子', value: ionBalance.totalC.toFixed(3), unit: 'meq/L' },
                { label: '总阴离子', value: ionBalance.totalA.toFixed(3), unit: 'meq/L' },
                {
                  label: '相对误差',
                  value: ionBalance.error.toFixed(2),
                  unit: '%',
                  status: ionBalance.ok ? 'success' : 'danger',
                },
                {
                  label: '评价',
                  value: ionBalance.ok ? '合格' : '不合格',
                  status: ionBalance.ok ? 'success' : 'danger',
                },
              ]}
            />

            {/* TDS & 离子总量 */}
            <ResultDisplay
              title="TDS 与离子总量"
              items={[
                { label: '离子总量计算值', value: tdsVsIons.calculatedTds.toFixed(2), unit: 'mg/L' },
                { label: 'TDS 实测值', value: tdsVsIons.tds.toFixed(2), unit: 'mg/L' },
                {
                  label: '相对误差',
                  value: tdsVsIons.error.toFixed(2),
                  unit: '%',
                  status: tdsVsIons.ok ? 'success' : 'danger',
                },
                {
                  label: '评价',
                  value: tdsVsIons.ok ? '合格' : '不合格',
                  status: tdsVsIons.ok ? 'success' : 'danger',
                },
              ]}
            />

            {/* TDS & 电导率 */}
            <ResultDisplay
              title="TDS 与电导率"
              items={[
                {
                  label: '比值 (TDS/EC)',
                  value: tdsVsEc.ratio.toFixed(3),
                  status: tdsVsEc.ok ? 'success' : 'warning',
                },
                {
                  label: '评价',
                  value: tdsVsEc.ok ? '合格' : '不合格',
                  status: tdsVsEc.ok ? 'success' : 'danger',
                },
              ]}
            />

            {/* 电导率 & 离子 */}
            <ResultDisplay
              title="电导率与离子校核"
              items={[
                {
                  label: '阳离子校核误差',
                  value: ecVsIons.errorC.toFixed(2),
                  unit: '%',
                  status: ecVsIons.okC ? 'success' : 'danger',
                },
                {
                  label: '阴离子校核误差',
                  value: ecVsIons.errorA.toFixed(2),
                  unit: '%',
                  status: ecVsIons.okA ? 'success' : 'danger',
                },
                {
                  label: '评价',
                  value: ecVsIons.okC && ecVsIons.okA ? '合格' : '不合格',
                  status: ecVsIons.okC && ecVsIons.okA ? 'success' : 'danger',
                },
              ]}
            />

            {/* 总硬度 */}
            <ResultDisplay
              title="总硬度"
              items={[
                { label: '硬度计算值', value: hardness.calc.toFixed(2), unit: 'mg/L' },
                { label: '硬度实测值', value: hardness.meas.toFixed(2), unit: 'mg/L' },
                {
                  label: '相对误差',
                  value: hardness.error.toFixed(2),
                  unit: '%',
                  status: hardness.ok ? 'success' : 'danger',
                },
                {
                  label: '评价',
                  value: hardness.ok ? '合格' : '不合格',
                  status: hardness.ok ? 'success' : 'danger',
                },
              ]}
            />

            {/* 碱度/硬度换算 */}
            {!hasTitrationInput ? (
              <ResultDisplay
                title="碱度/硬度换算"
                standard="结果以 CaCO₃ 计"
                items={[
                  { label: '状态', value: '未输入滴定数据' },
                ]}
              />
            ) : 'error' in alkalinityHardness ? (
              <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
                {alkalinityHardness.error}
              </div>
            ) : (
              <ResultDisplay
                title="碱度/硬度换算"
                standard="结果以 CaCO₃ 计"
                items={[
                  { label: '净滴定体积', value: alkalinityHardness.netTitrantVolumeMl.toFixed(3), unit: 'mL' },
                  { label: '换算结果', value: alkalinityHardness.concentrationMgLAsCaco3.toFixed(3), unit: 'mg/L', status: 'success' },
                ]}
                details="mg/L(as CaCO₃) = (V - V0) × C × 50000 / Vs"
              />
            )}

            {/* 沉淀溶解平衡 */}
            <ResultDisplay
              title="沉淀溶解平衡"
              standard="Ksp 判定"
              items={[
                {
                  label: 'CaCO₃',
                  value: `${solubility.CaCO3.status}`,
                  status: solubility.CaCO3.status === '过饱和'
                    ? 'danger'
                    : solubility.CaCO3.status === '未饱和'
                      ? 'success'
                      : 'warning',
                },
                {
                  label: 'CaSO₄',
                  value: `${solubility.CaSO4.status}`,
                  status: solubility.CaSO4.status === '过饱和'
                    ? 'danger'
                    : solubility.CaSO4.status === '未饱和'
                      ? 'success'
                      : 'warning',
                },
                {
                  label: 'PbCrO₄',
                  value: `${solubility.PbCrO4.status}`,
                  status: solubility.PbCrO4.status === '过饱和'
                    ? 'danger'
                    : solubility.PbCrO4.status === '未饱和'
                      ? 'success'
                      : 'warning',
                },
                {
                  label: 'PbSO₄',
                  value: `${solubility.PbSO4.status}`,
                  status: solubility.PbSO4.status === '过饱和'
                    ? 'danger'
                    : solubility.PbSO4.status === '未饱和'
                      ? 'success'
                      : 'warning',
                },
              ]}
              details={
                <div className="space-y-2">
                  <p>
                    <strong>CaCO₃</strong>：IAP = {solubility.CaCO3.iap.toExponential(2)} | Ksp ={' '}
                    {solubility.CaCO3.ksp.toExponential(2)}
                  </p>
                  <p>
                    <strong>CaSO₄</strong>：IAP = {solubility.CaSO4.iap.toExponential(2)} | Ksp ={' '}
                    {solubility.CaSO4.ksp.toExponential(2)}
                  </p>
                  <p>
                    <strong>PbCrO₄</strong>：IAP = {solubility.PbCrO4.iap.toExponential(2)} | Ksp ={' '}
                    {solubility.PbCrO4.ksp.toExponential(2)}
                  </p>
                  <p>
                    <strong>PbSO₄</strong>：IAP = {solubility.PbSO4.iap.toExponential(2)} | Ksp ={' '}
                    {solubility.PbSO4.ksp.toExponential(2)}
                  </p>
                  <p className="text-xs text-[var(--app-ink-tertiary)]">
                    判定：IAP &gt; Ksp 可能过饱和；IAP &lt; Ksp 可能未饱和
                  </p>
                </div>
              }
            />
          </div>
        )}
      </div>
    </CalculatorShell>
  );
}
