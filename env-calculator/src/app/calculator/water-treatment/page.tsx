'use client';

import React, { useMemo, useState } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import FormulaModuleShell, { FormulaModuleOption } from '@/components/FormulaModuleShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
import {
  calculateAeratedPondBod,
  calculateAlkalinityBalance,
  calculateEbprRatios,
  calculateFacultativePondNitrogen,
  calculateTemperatureCorrectedRate,
  parseDecimalInput,
} from '@/lib/calculators';

type WaterFormula = 'bod' | 'temperature' | 'nitrogen' | 'alkalinity' | 'ebpr';

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

  const handleReset = () => {
    setActive('bod');
    setBodC0('');
    setBodK('');
    setBodT('');
    setBaseK20('');
    setTheta('');
    setWaterTemp('');
    setNitrogenNo('');
    setNitrogenK20('');
    setNitrogenTheta('');
    setNitrogenTemp('');
    setNitrogenHrt('');
    setNitrogenPh('');
    setNh3n('');
    setNo3n('');
    setCod('');
    setTp('');
    setBod5('');
    setRbcod('');
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
        </section>

        {active === 'bod' && ('error' in bodResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{bodResult.error}</div>
        ) : (
          <ResultDisplay
            title="计算结果"
            standard="完全混合曝气塘 BOD 去除"
            items={[
              { label: '出水BOD Ce', value: bodResult.effluentBodMgL.toFixed(3), unit: 'mg/L', status: 'success' },
              { label: '去除率', value: bodResult.removalPercent.toFixed(2), unit: '%' },
            ]}
          />
        ))}

        {active === 'temperature' && ('error' in tempResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{tempResult.error}</div>
        ) : (
          <ResultDisplay
            title="计算结果"
            standard="反应速率温度校正"
            items={[
              { label: '校正速率常数 kT', value: tempResult.correctedRateConstant.toFixed(6), unit: 'd⁻¹', status: 'success' },
            ]}
          />
        ))}

        {active === 'nitrogen' && ('error' in nitrogenResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{nitrogenResult.error}</div>
        ) : (
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

        {active === 'alkalinity' && ('error' in alkalinityResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{alkalinityResult.error}</div>
        ) : (
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

        {active === 'ebpr' && ('error' in ebprResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{ebprResult.error}</div>
        ) : (
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
      </FormulaModuleShell>
    </CalculatorShell>
  );
}
