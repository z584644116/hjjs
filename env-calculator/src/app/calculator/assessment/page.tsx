'use client';

import React, { useMemo, useState } from 'react';
import { Add24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import CalculatorShell from '@/components/CalculatorShell';
import FormulaModuleShell, { FormulaModuleOption } from '@/components/FormulaModuleShell';
import NumberInput from '@/components/NumberInput';
import PasteBulkInput from '@/components/PasteBulkInput';
import ResultDisplay from '@/components/ResultDisplay';
import {
  calculateBiodiversity,
  calculateIgeo,
  calculateNemerowIndex,
  calculatePollutionIndex,
  calculateTli,
  parseDecimalInput,
  parseNumberList,
  type PollutionIndexItem,
} from '@/lib/calculators';

type AssessmentFormula = 'pollution' | 'nemerow' | 'tli' | 'biodiversity' | 'igeo';

const formulaModules: FormulaModuleOption[] = [
  {
    key: 'pollution',
    title: '综合污染指数 P',
    group: '单因子评价',
    description: '以实测 / 评价标准 的平均比值作为综合指数,适用大气 / 水质 / 土壤。',
    formula: 'P = (1/n)·Σ (Cᵢ / Sᵢ)',
  },
  {
    key: 'nemerow',
    title: '内梅罗综合指数',
    group: '单因子评价',
    description: '兼顾平均污染与峰值污染的综合指数,土壤质量评价常用。',
    formula: 'N = √((P̄² + P_max²) / 2)',
  },
  {
    key: 'tli',
    title: '富营养化指数 TLI',
    group: '水体营养评价',
    description: '湖库五参数综合营养状态指数(GB 3838 附录)。',
    formula: 'TLI = Σ Wⱼ·TLI(j)',
  },
  {
    key: 'biodiversity',
    title: '生物多样性指数',
    group: '生态评价',
    description: '一次性输出 Shannon / Simpson / Pielou / Margalef 四项指数。',
    formula: "H' = −Σ pᵢ·ln(pᵢ);J' = H'/ln(S);D = Σ pᵢ²",
  },
  {
    key: 'igeo',
    title: '地累积指数 Igeo',
    group: '土壤重金属',
    description: 'Müller 法重金属污染分级。',
    formula: 'Igeo = log₂(Cᵢ / (k·Bᵢ)),k = 1.5',
  },
];

interface PollutantRow {
  id: string;
  name: string;
  measured: string;
  standard: string;
}

const DEFAULT_POLLUTANTS: PollutantRow[] = [
  { id: 'p1', name: 'Cd', measured: '0.25', standard: '0.3' },
  { id: 'p2', name: 'Pb', measured: '120', standard: '170' },
  { id: 'p3', name: 'As', measured: '18', standard: '25' },
  { id: 'p4', name: 'Hg', measured: '0.4', standard: '0.5' },
];

function newRowId() {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function AssessmentPage() {
  const [active, setActive] = useState<AssessmentFormula>('pollution');

  // 污染物行列表(综合指数 + 内梅罗共享)
  const [pollutants, setPollutants] = useState<PollutantRow[]>(DEFAULT_POLLUTANTS);

  // TLI 五参数
  const [chl, setChl] = useState('8');
  const [tp, setTp] = useState('0.05');
  const [tn, setTn] = useState('1.2');
  const [sd, setSd] = useState('1.5');
  const [codMn, setCodMn] = useState('4');

  // 多样性 — 粘贴个体数
  const [abundances, setAbundances] = useState('25, 18, 12, 9, 7, 5, 3, 1');

  // 地累积
  const [igeoC, setIgeoC] = useState('150');
  const [igeoB, setIgeoB] = useState('30');
  const [igeoK, setIgeoK] = useState('1.5');

  const pollutantItems: PollutionIndexItem[] = useMemo(
    () =>
      pollutants.map((row) => ({
        name: row.name.trim() || '未命名',
        measured: parseDecimalInput(row.measured),
        standard: parseDecimalInput(row.standard),
      })),
    [pollutants],
  );
  const pollutionResult = useMemo(() => calculatePollutionIndex(pollutantItems), [pollutantItems]);
  const nemerowResult = useMemo(() => calculateNemerowIndex(pollutantItems), [pollutantItems]);

  const tliResult = useMemo(
    () =>
      calculateTli({
        chlorophyllA: parseDecimalInput(chl),
        totalPhosphorus: parseDecimalInput(tp),
        totalNitrogen: parseDecimalInput(tn),
        secchiDepth: parseDecimalInput(sd),
        codMn: parseDecimalInput(codMn),
      }),
    [chl, tp, tn, sd, codMn],
  );

  const biodiversityResult = useMemo(
    () => calculateBiodiversity(parseNumberList(abundances)),
    [abundances],
  );

  const igeoResult = useMemo(
    () =>
      calculateIgeo({
        measured: parseDecimalInput(igeoC),
        background: parseDecimalInput(igeoB),
        kFactor: parseDecimalInput(igeoK),
      }),
    [igeoC, igeoB, igeoK],
  );

  const addRow = () =>
    setPollutants((prev) => [...prev, { id: newRowId(), name: '', measured: '', standard: '' }]);
  const removeRow = (id: string) => setPollutants((prev) => prev.filter((r) => r.id !== id));
  const updateRow = (id: string, patch: Partial<PollutantRow>) =>
    setPollutants((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const handleReset = () => {
    setActive('pollution');
    setPollutants(DEFAULT_POLLUTANTS);
    setChl('');
    setTp('');
    setTn('');
    setSd('');
    setCodMn('');
    setAbundances('');
    setIgeoC('');
    setIgeoB('');
    setIgeoK('1.5');
  };

  const actions = (
    <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
      重置
    </button>
  );

  return (
    <CalculatorShell title="环境评价与指数" actions={actions}>
      <FormulaModuleShell modules={formulaModules} activeKey={active} onChange={(k) => setActive(k as AssessmentFormula)}>
        <section className="app-panel space-y-4 p-4 md:p-5">
          {(active === 'pollution' || active === 'nemerow') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[var(--app-ink)]">污染物清单</h3>
                <button
                  type="button"
                  onClick={addRow}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--app-line)] bg-[var(--app-surface)] px-3 text-xs font-bold text-[var(--app-primary)] transition-colors hover:border-[var(--app-primary)] hover:bg-[var(--app-primary-light)]"
                >
                  <Add24Regular className="h-4 w-4" />
                  添加污染物
                </button>
              </div>
              <div className="space-y-2.5">
                {pollutants.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-[var(--app-radius-lg)] border border-[var(--app-line)] bg-[var(--app-surface)] p-3"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_40px] gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_40px]">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(row.id, { name: e.target.value })}
                        placeholder="污染物名"
                        className="min-h-[42px] rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-ink)] outline-none transition-colors focus:border-[var(--app-primary)]"
                        aria-label="污染物名"
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="grid h-[42px] w-10 place-items-center rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink-tertiary)] transition-colors hover:border-[var(--app-danger)] hover:text-[var(--app-danger)] md:col-start-4"
                        aria-label="删除污染物"
                      >
                        <Dismiss24Regular className="h-4 w-4" />
                      </button>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.measured}
                        onChange={(e) => updateRow(row.id, { measured: e.target.value })}
                        placeholder="实测值 Cᵢ"
                        className="col-span-2 min-h-[42px] rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-ink)] outline-none transition-colors focus:border-[var(--app-primary)] md:col-span-1 md:col-start-2 md:row-start-1"
                        aria-label="实测值"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.standard}
                        onChange={(e) => updateRow(row.id, { standard: e.target.value })}
                        placeholder="标准值 Sᵢ"
                        className="col-span-2 min-h-[42px] rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-ink)] outline-none transition-colors focus:border-[var(--app-primary)] md:col-span-1 md:col-start-3 md:row-start-1"
                        aria-label="标准值"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {pollutants.length === 0 && (
                <div className="rounded-[var(--app-radius-lg)] border border-dashed border-[var(--app-line)] p-6 text-center text-sm text-[var(--app-ink-tertiary)]">
                  点击「添加污染物」开始填表
                </div>
              )}
            </div>
          )}

          {active === 'tli' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <NumberInput label="叶绿素 a Chla" unit="mg/m³" value={chl} onChange={setChl} required />
              <NumberInput label="总磷 TP" unit="mg/L" value={tp} onChange={setTp} required />
              <NumberInput label="总氮 TN" unit="mg/L" value={tn} onChange={setTn} required />
              <NumberInput label="透明度 SD" unit="m" value={sd} onChange={setSd} required />
              <NumberInput label="高锰酸盐指数" unit="mg/L" value={codMn} onChange={setCodMn} required />
            </div>
          )}

          {active === 'biodiversity' && (
            <PasteBulkInput
              label="各物种个体数"
              value={abundances}
              onChange={setAbundances}
              placeholder="粘贴各物种的个体数,如 25, 18, 12, 9, 7, 5"
              hint="物种 ≥ 2 才能计算"
              minValues={2}
              rows={4}
              required
            />
          )}

          {active === 'igeo' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberInput label="实测值 Cᵢ" value={igeoC} onChange={setIgeoC} required />
              <NumberInput label="背景值 Bᵢ" value={igeoB} onChange={setIgeoB} required />
              <NumberInput label="修正系数 k" value={igeoK} onChange={setIgeoK} hint="默认 1.5" />
            </div>
          )}
        </section>

        {active === 'pollution' && ('error' in pollutionResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{pollutionResult.error}</div>
        ) : (
          <ResultDisplay
            title="综合污染指数 P"
            standard="P ≤ 0.2 清洁;0.7 ~ 1.0 中度;> 1.0 重度"
            items={[
              { label: '污染物数', value: pollutionResult.items.length },
              { label: '综合指数 P', value: pollutionResult.averageIndex.toFixed(3), status: pollutionResult.averageIndex > 1 ? 'danger' : 'success' },
              { label: '最高单项', value: `${pollutionResult.maxItem} = ${pollutionResult.maxIndex.toFixed(3)}`, status: pollutionResult.maxIndex > 1 ? 'warning' : 'neutral' },
              { label: '污染级别', value: pollutionResult.category, status: pollutionResult.averageIndex > 1 ? 'danger' : 'success' },
            ]}
            details={
              <ul className="space-y-1">
                {pollutionResult.items.map((p) => (
                  <li key={p.name}>
                    {p.name}:Pᵢ = {p.singleIndex.toFixed(3)} {p.exceeded ? '(超标)' : ''}
                  </li>
                ))}
              </ul>
            }
          />
        ))}

        {active === 'nemerow' && ('error' in nemerowResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{nemerowResult.error}</div>
        ) : (
          <ResultDisplay
            title="内梅罗综合指数 N"
            standard="参考 GB 15618:N ≤ 0.7 安全,> 3.0 重污染"
            items={[
              { label: '污染物数', value: nemerowResult.items.length },
              { label: '平均 P̄', value: nemerowResult.averageIndex.toFixed(3) },
              { label: '最高 P_max', value: `${nemerowResult.maxItem} = ${nemerowResult.maxIndex.toFixed(3)}` },
              { label: '内梅罗指数 N', value: nemerowResult.nemerowIndex.toFixed(3), status: nemerowResult.nemerowIndex > 1 ? 'danger' : 'success' },
              { label: '污染级别', value: nemerowResult.category, status: nemerowResult.nemerowIndex > 1 ? 'danger' : 'success' },
            ]}
          />
        ))}

        {active === 'tli' && ('error' in tliResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{tliResult.error}</div>
        ) : (
          <ResultDisplay
            title="湖库综合营养状态"
            standard="GB 3838 附录:TLI < 30 贫营养,> 70 重度富营养"
            items={[
              { label: 'TLI(Chla)', value: tliResult.tliChl.toFixed(1) },
              { label: 'TLI(TP)', value: tliResult.tliTP.toFixed(1) },
              { label: 'TLI(TN)', value: tliResult.tliTN.toFixed(1) },
              { label: 'TLI(SD)', value: tliResult.tliSD.toFixed(1) },
              { label: 'TLI(CODMn)', value: tliResult.tliCOD.toFixed(1) },
              { label: '综合 TLI', value: tliResult.tli.toFixed(1), status: tliResult.tli > 50 ? 'warning' : 'success' },
              { label: '营养等级', value: tliResult.category, status: tliResult.tli > 60 ? 'danger' : tliResult.tli > 50 ? 'warning' : 'success' },
            ]}
          />
        ))}

        {active === 'biodiversity' && ('error' in biodiversityResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{biodiversityResult.error}</div>
        ) : (
          <ResultDisplay
            title="生物多样性指数"
            standard="Shannon + Simpson + Pielou + Margalef 一次输出"
            items={[
              { label: '总个体数 N', value: biodiversityResult.total },
              { label: '物种数 S', value: biodiversityResult.species },
              { label: "Shannon H'", value: biodiversityResult.shannonH.toFixed(3), status: 'success' },
              { label: '理论最大 H_max', value: biodiversityResult.maxH.toFixed(3) },
              { label: "Pielou J'", value: biodiversityResult.pielouEvenness.toFixed(3) },
              { label: 'Simpson D', value: biodiversityResult.simpsonD.toFixed(3) },
              { label: 'Simpson 多样性 1-D', value: biodiversityResult.simpsonDiversity.toFixed(3) },
              { label: 'Margalef d', value: biodiversityResult.margalefD.toFixed(3) },
            ]}
          />
        ))}

        {active === 'igeo' && ('error' in igeoResult ? (
          <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">{igeoResult.error}</div>
        ) : (
          <ResultDisplay
            title="地累积指数 Igeo"
            standard="Müller 七级分类"
            items={[
              { label: 'Igeo', value: igeoResult.igeo.toFixed(3), status: igeoResult.igeo > 1 ? 'warning' : 'success' },
              { label: '污染等级', value: igeoResult.category, status: igeoResult.igeo > 3 ? 'danger' : igeoResult.igeo > 1 ? 'warning' : 'success' },
            ]}
          />
        ))}
      </FormulaModuleShell>
    </CalculatorShell>
  );
}
