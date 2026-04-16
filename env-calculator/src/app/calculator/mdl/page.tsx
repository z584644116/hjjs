'use client';

import React, { useCallback, useMemo, useState } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import FormulaModuleShell, { FormulaModuleOption } from '@/components/FormulaModuleShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
import {
  calculateMdlFromReplicates,
  calculateMethodDetectionLimit,
  parseDecimalInput,
} from '@/lib/calculators';

type MdlMode = 'raw' | 'manual';

const mdlModules: FormulaModuleOption[] = [
  {
    key: 'raw',
    title: '原始平行样',
    group: '推荐方式',
    description: '粘贴 7~20 个平行样数据，自动输出完整 MDL 质控报告。',
    formula: 'MDL = t × s；CI95 = mean ± t × s / √n',
  },
  {
    key: 'manual',
    title: '手动 s 与 t',
    group: '兼容方式',
    description: '沿用已知标准差和 t 值，快速计算方法检出限。',
    formula: 'MDL = t × s',
  },
];

function parseRawValues(value: string) {
  const tokens = value.split(/[\s,，;；、]+/).map((item) => item.trim()).filter(Boolean);
  const values = tokens.map(parseDecimalInput);
  const validValues = values.filter(Number.isFinite);

  return {
    tokens,
    validValues,
    invalidCount: values.length - validValues.length,
  };
}

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function MdlPage() {
  const [mode, setMode] = useState<MdlMode>('raw');
  const [rawValues, setRawValues] = useState('0.051, 0.049, 0.053, 0.050, 0.052, 0.048, 0.054');
  const [manualSd, setManualSd] = useState('0.012');
  const [manualT, setManualT] = useState('3.143');
  const [unit, setUnit] = useState('mg/L');
  const [clipboardMessage, setClipboardMessage] = useState('');

  const parsed = useMemo(() => parseRawValues(rawValues), [rawValues]);
  const rawResult = useMemo(
    () => calculateMdlFromReplicates(parsed.validValues),
    [parsed.validValues],
  );
  const manualResult = useMemo(
    () => calculateMethodDetectionLimit({
      standardDeviation: parseDecimalInput(manualSd),
      tValue: parseDecimalInput(manualT),
    }),
    [manualSd, manualT],
  );

  const activeRawResult = mode === 'raw' ? rawResult : null;

  const handleClipboardPaste = useCallback(async () => {
    setClipboardMessage('');

    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setClipboardMessage('剪贴板没有可用文本');
        return;
      }
      setRawValues(text);
      setMode('raw');
      setClipboardMessage('已从剪贴板粘贴');
    } catch {
      setClipboardMessage('浏览器未允许读取剪贴板，可直接粘贴到文本框');
    }
  }, []);

  const handleReset = useCallback(() => {
    setMode('raw');
    setRawValues('');
    setManualSd('');
    setManualT('3.143');
    setClipboardMessage('');
  }, []);

  const handleExportCsv = useCallback(() => {
    if (!activeRawResult || 'error' in activeRawResult) return;

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
      ...parsed.validValues.map((value, index) => [index + 1, value, unit]),
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
  }, [activeRawResult, parsed.validValues, unit]);

  const canExport = activeRawResult && !('error' in activeRawResult);
  const actions = (
    <>
      <button type="button" onClick={handleClipboardPaste} className="app-action-secondary flex-1 md:flex-none">
        一键粘贴
      </button>
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
        onChange={(key) => setMode(key as MdlMode)}
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
              <div className="app-number-field">
                <label className="app-number-label" htmlFor="mdl-values">原始平行样数据</label>
                <textarea
                  id="mdl-values"
                  value={rawValues}
                  onChange={(event) => setRawValues(event.target.value)}
                  placeholder="粘贴 7~20 个数据，可用空格、逗号、分号或换行分隔"
                  className="min-h-36 w-full resize-y rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-transparent px-3 py-2 text-base text-[var(--app-ink)] outline-none transition-colors focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-primary-light)]"
                />
                <span className="app-number-helper">
                  已识别 {parsed.validValues.length} 个有效值{parsed.invalidCount > 0 ? `，忽略 ${parsed.invalidCount} 个无效片段` : ''}。
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="app-number-field">
                  <label className="app-number-label" htmlFor="mdl-unit">浓度单位</label>
                  <div className="app-number-control">
                    <input
                      id="mdl-unit"
                      type="text"
                      value={unit}
                      onChange={(event) => setUnit(event.target.value)}
                      className="app-number-input text-left"
                    />
                  </div>
                </div>
              </div>

              {clipboardMessage && <p className="text-xs font-medium text-[var(--app-ink-tertiary)]">{clipboardMessage}</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberInput label="重复测定标准差 s" unit={unit} value={manualSd} onChange={setManualSd} required />
              <NumberInput label="t 分布值" value={manualT} onChange={setManualT} required />
              <div className="app-number-field">
                <label className="app-number-label" htmlFor="mdl-manual-unit">浓度单位</label>
                <div className="app-number-control">
                  <input
                    id="mdl-manual-unit"
                    type="text"
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
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
              standard="MDL = t × s；置信区间为均值的 95% 双侧置信区间"
              items={[
                { label: '有效数据个数', value: rawResult.count },
                { label: '样本均值', value: rawResult.mean.toFixed(6), unit },
                { label: '样本标准差 s', value: rawResult.standardDeviation.toFixed(6), unit },
                { label: 'MDL t 值', value: rawResult.tValue.toFixed(3) },
                { label: '方法检出限 MDL', value: rawResult.methodDetectionLimit.toFixed(6), unit, status: 'success' },
                { label: '95%置信区间下限', value: rawResult.confidenceLower.toFixed(6), unit },
                { label: '95%置信区间上限', value: rawResult.confidenceUpper.toFixed(6), unit },
                { label: '极差', value: rawResult.range.toFixed(6), unit },
              ]}
              details={
                <div className="space-y-2">
                  <p>原始数据：{parsed.validValues.map((value) => value.toString()).join('，')}</p>
                  <p>95% CI 使用 t = {rawResult.confidenceTValue.toFixed(3)}，n = {rawResult.count}。</p>
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
                { label: '重复测定标准差 s', value: manualSd || '-', unit },
                { label: 't 分布值', value: manualT || '-' },
                { label: '方法检出限 MDL', value: manualResult.methodDetectionLimit.toFixed(6), unit, status: 'success' },
              ]}
            />
          )
        )}
      </FormulaModuleShell>
    </CalculatorShell>
  );
}
