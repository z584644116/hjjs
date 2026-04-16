'use client';

import React, { useCallback, useMemo } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import FormulaModuleShell, { FormulaModuleOption } from '@/components/FormulaModuleShell';
import NumberInput from '@/components/NumberInput';
import PasteBulkInput from '@/components/PasteBulkInput';
import ResultDisplay from '@/components/ResultDisplay';
import { useUrlState } from '@/hooks/useUrlState';
import { useRecordHistory } from '@/hooks/useRecordHistory';
import {
  calculateMdlFromReplicates,
  calculateMethodDetectionLimit,
  parseDecimalInput,
  parseNumberList,
} from '@/lib/calculators';

type MdlMode = 'raw' | 'manual';

const mdlModules: FormulaModuleOption[] = [
  {
    key: 'raw',
    title: '原始平行样',
    group: '推荐方式',
    description: '粘贴 7~20 个平行样数据,自动输出完整 MDL 质控报告。',
    formula: 'MDL = t × s;CI95 = mean ± t × s / √n',
  },
  {
    key: 'manual',
    title: '手动 s 与 t',
    group: '兼容方式',
    description: '沿用已知标准差和 t 值,快速计算方法检出限。',
    formula: 'MDL = t × s',
  },
];

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function MdlPage() {
  const [inputs, setInputs] = useUrlState({
    mode: 'raw',
    v: '0.051, 0.049, 0.053, 0.050, 0.052, 0.048, 0.054',
    sd: '0.012',
    t: '3.143',
    u: 'mg/L',
  });

  const mode: MdlMode = inputs.mode === 'manual' ? 'manual' : 'raw';

  const parsedValues = useMemo(() => parseNumberList(inputs.v), [inputs.v]);
  const rawResult = useMemo(
    () => calculateMdlFromReplicates(parsedValues),
    [parsedValues],
  );
  const manualResult = useMemo(
    () => calculateMethodDetectionLimit({
      standardDeviation: parseDecimalInput(inputs.sd),
      tValue: parseDecimalInput(inputs.t),
    }),
    [inputs.sd, inputs.t],
  );

  const activeRawResult = mode === 'raw' ? rawResult : null;

  const summary = useMemo(() => {
    if (mode === 'raw') {
      if ('error' in rawResult) return '';
      return `MDL ${rawResult.methodDetectionLimit.toFixed(6)} ${inputs.u} · s=${rawResult.standardDeviation.toFixed(6)} · n=${rawResult.count}`;
    }
    if ('error' in manualResult) return '';
    return `MDL ${manualResult.methodDetectionLimit.toFixed(6)} ${inputs.u} · s=${inputs.sd} · t=${inputs.t}`;
  }, [mode, rawResult, manualResult, inputs.u, inputs.sd, inputs.t]);

  useRecordHistory(summary);

  const handleReset = useCallback(() => {
    setInputs({ mode: 'raw', v: '', sd: '', t: '3.143', u: '' });
  }, [setInputs]);

  const handleExportCsv = useCallback(() => {
    if (!activeRawResult || 'error' in activeRawResult) return;

    const unit = inputs.u || '';
    const rows: Array<Array<string | number>> = [
      ['项目', '数值', '单位/说明'],
      ['有效数据个数', activeRawResult.count, 'n'],
      ['样本均值', activeRawResult.mean, unit],
      ['样本标准差 s', activeRawResult.standardDeviation, unit],
      ['MDL t 值', activeRawResult.tValue, '99% 单侧'],
      ['方法检出限 MDL', activeRawResult.methodDetectionLimit, unit],
      ['95%置信区间下限', activeRawResult.confidenceLower, unit],
      ['95%置信区间上限', activeRawResult.confidenceUpper, unit],
      ['最小值', activeRawResult.min, unit],
      ['最大值', activeRawResult.max, unit],
      ['极差', activeRawResult.range, unit],
      [],
      ['序号', '原始值', unit],
      ...parsedValues.map((value, index) => [index + 1, value, unit]),
    ];

    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mdl-qc-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [activeRawResult, parsedValues, inputs.u]);

  const canExport = activeRawResult && !('error' in activeRawResult);
  const actions = (
    <>
      <button
        type="button"
        onClick={handleExportCsv}
        disabled={!canExport}
        className="app-action-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50 md:flex-none"
      >
        导出 CSV
      </button>
      <button type="button" onClick={handleReset} className="app-action-secondary flex-1 md:flex-none">
        重置
      </button>
    </>
  );

  return (
    <CalculatorShell title="方法检出限 MDL" actions={actions}>
      <FormulaModuleShell
        modules={mdlModules}
        activeKey={mode}
        onChange={(key) => setInputs({ mode: key })}
        navigationLabel="输入方式"
        countUnit="种方式"
        switchLabel="切换方式"
        drawerSubtitle="推荐优先使用原始平行样"
        searchPlaceholder="搜索输入方式"
        emptyText="无匹配方式"
      >
        <section className="app-panel p-4 md:p-5">
          {mode === 'raw' ? (
            <div className="space-y-4">
              <PasteBulkInput
                label="原始平行样数据"
                value={inputs.v}
                onChange={(v) => setInputs({ v })}
                placeholder="粘贴 7~20 个数据,可用空格、逗号、分号或换行分隔"
                hint="支持科学计数法 1.2e-5"
                minValues={7}
                maxValues={20}
                rows={5}
                required
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="app-number-field">
                  <label className="app-number-label" htmlFor="mdl-unit">浓度单位</label>
                  <div className="app-number-control">
                    <input
                      id="mdl-unit"
                      type="text"
                      value={inputs.u}
                      onChange={(event) => setInputs({ u: event.target.value })}
                      className="app-number-input text-left"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberInput label="重复测定标准差 s" unit={inputs.u} value={inputs.sd} onChange={(v) => setInputs({ sd: v })} required />
              <NumberInput label="t 分布值" value={inputs.t} onChange={(v) => setInputs({ t: v })} required />
              <div className="app-number-field">
                <label className="app-number-label" htmlFor="mdl-manual-unit">浓度单位</label>
                <div className="app-number-control">
                  <input
                    id="mdl-manual-unit"
                    type="text"
                    value={inputs.u}
                    onChange={(event) => setInputs({ u: event.target.value })}
                    className="app-number-input text-left"
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        {mode === 'raw' ? (
          'error' in rawResult ? (
            <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
              {rawResult.error}
            </div>
          ) : (
            <ResultDisplay
              title="MDL 质控报告"
              standard="MDL = t × s;置信区间为均值的 95% 双侧置信区间"
              items={[
                { label: '有效数据个数', value: rawResult.count },
                { label: '样本均值', value: rawResult.mean.toFixed(6), unit: inputs.u },
                { label: '样本标准差 s', value: rawResult.standardDeviation.toFixed(6), unit: inputs.u },
                { label: 'MDL t 值', value: rawResult.tValue.toFixed(3) },
                { label: '方法检出限 MDL', value: rawResult.methodDetectionLimit.toFixed(6), unit: inputs.u, status: 'success' },
                { label: '95%置信区间下限', value: rawResult.confidenceLower.toFixed(6), unit: inputs.u },
                { label: '95%置信区间上限', value: rawResult.confidenceUpper.toFixed(6), unit: inputs.u },
                { label: '极差', value: rawResult.range.toFixed(6), unit: inputs.u },
              ]}
              details={
                <div className="space-y-2">
                  <p>原始数据:{parsedValues.map((value) => value.toString()).join(', ')}</p>
                  <p>95% CI 使用 t = {rawResult.confidenceTValue.toFixed(3)},n = {rawResult.count}。</p>
                </div>
              }
            />
          )
        ) : (
          'error' in manualResult ? (
            <div className="rounded-[var(--app-radius-lg)] border border-[var(--app-danger)] bg-[var(--app-danger-light)] p-4 text-sm font-medium text-[var(--app-danger)]">
              {manualResult.error}
            </div>
          ) : (
            <ResultDisplay
              title="手动 MDL"
              items={[
                { label: '重复测定标准差 s', value: inputs.sd || '-', unit: inputs.u },
                { label: 't 分布值', value: inputs.t || '-' },
                { label: '方法检出限 MDL', value: manualResult.methodDetectionLimit.toFixed(6), unit: inputs.u, status: 'success' },
              ]}
            />
          )
        )}
      </FormulaModuleShell>
    </CalculatorShell>
  );
}
