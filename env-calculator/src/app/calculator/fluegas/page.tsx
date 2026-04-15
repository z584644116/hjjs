'use client';

import React, { useMemo, useState } from 'react';
import { Card, Divider } from '@fluentui/react-components';
import { calculateFlueGasConversion } from '@/lib/fluegas';
import CalculatorShell from '@/components/CalculatorShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';

export default function FlueGasCalculatorPage() {
  // 输入状态
  const [measuredConcentrationStr, setMeasuredConcentrationStr] = useState<string>('');
  const [referenceO2Str, setReferenceO2Str] = useState<string>('');
  const [measuredO2Str, setMeasuredO2Str] = useState<string>('');

  // 使用 useMemo 计算结果
  const result = useMemo(() => {
    const measuredConc = measuredConcentrationStr === ''
      ? NaN
      : parseFloat(measuredConcentrationStr.replace(',', '.'));

    const refO2 = referenceO2Str === ''
      ? NaN
      : parseFloat(referenceO2Str.replace(',', '.'));

    const measO2 = measuredO2Str === ''
      ? NaN
      : parseFloat(measuredO2Str.replace(',', '.'));

    return calculateFlueGasConversion(measuredConc, refO2, measO2);
  }, [measuredConcentrationStr, referenceO2Str, measuredO2Str]);

  const hasError = 'error' in result;

  return (
    <CalculatorShell
      title="烟气折算计算"
      description="根据烟气排放标准，将实测污染物浓度折算为基准氧含量下的污染物浓度"
    >
      {/* 公式提示 */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
        <span className="font-semibold">计算公式：</span>
        折算后浓度 = 实测浓度 × (21 - 基准氧含量) / (21 - 实测氧含量)
      </div>

      {/* 输入参数 */}
      <Card className="p-5">
        <h2 className="text-base font-semibold text-[var(--app-ink)] mb-4">输入参数</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumberInput
            label="实测污染物浓度"
            value={measuredConcentrationStr}
            onChange={setMeasuredConcentrationStr}
            placeholder="例如 150"
            required
            hint="输入数值（无需单位，输出与输入单位一致）"
          />
          <NumberInput
            label="基准氧含量"
            unit="%"
            value={referenceO2Str}
            onChange={setReferenceO2Str}
            placeholder="例如 6"
            required
            hint="范围：0-21%"
          />
          <NumberInput
            label="实测氧含量"
            unit="%"
            value={measuredO2Str}
            onChange={setMeasuredO2Str}
            placeholder="例如 13.09"
            required
            hint="范围：0-21%（必须小于21%）"
          />
        </div>
      </Card>

      {/* 计算结果分隔线 */}
      <Divider>计算结果</Divider>

      {/* 结果展示 */}
      {hasError ? (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {result.error}
        </div>
      ) : (
        <ResultDisplay
          items={[
            {
              label: '折算后污染物浓度',
              value: result.convertedConcentration.toFixed(2),
              status: 'success',
            },
            {
              label: '折算系数',
              value: result.conversionFactor.toFixed(4),
              status: 'neutral',
            },
            {
              label: '实测浓度',
              value: measuredConcentrationStr || '-',
              status: 'neutral',
            },
            {
              label: '基准氧含量',
              value: referenceO2Str ? `${referenceO2Str}%` : '-',
              status: 'neutral',
            },
            {
              label: '实测氧含量',
              value: measuredO2Str ? `${measuredO2Str}%` : '-',
              status: 'neutral',
            },
          ]}
          details="结果已按四舍六入五成双规则修约至小数点后两位"
        />
      )}
    </CalculatorShell>
  );
}
