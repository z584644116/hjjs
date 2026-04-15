'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Label,
  Body1,
  Field,
  RadioGroup,
  Radio,
  Dropdown,
  Option,
  MessageBar,
  MessageBarBody,
  Divider,
  Tab,
  TabList,
} from '@fluentui/react-components';
import {
  Calculator24Regular,
  Settings24Regular,
  CheckmarkCircle24Regular,
} from '@fluentui/react-icons';
import { useInstrumentStore } from '@/stores';
import { calculateSamplingMouth } from '@/lib/calculator';
import { CalculationInput, CalculationResult } from '@/types';
import InstrumentManager from '@/components/InstrumentManager';
import CalculatorShell from '@/components/CalculatorShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';

export default function SamplingCalculatorPage() {
  const { instruments, getInstrument } = useInstrumentStore();
  const [activeTab, setActiveTab] = useState<string>('calculator');

  // 表单状态
  const [instrumentId, setInstrumentId] = useState('');
  const [samplingType, setSamplingType] = useState<'normal' | 'low-concentration'>('normal');
  const [smokeVelocity, setSmokeVelocity] = useState('');
  const [moistureContent, setMoistureContent] = useState('');

  // 结果状态
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState('');

  // 自动选择第一个仪器
  useEffect(() => {
    if (instruments.length > 0 && !instrumentId) {
      setInstrumentId(instruments[0].id);
    }
  }, [instruments, instrumentId]);

  const handleCalculate = () => {
    setError('');
    setResult(null);

    // 验证输入
    if (!instrumentId) {
      setError('请选择仪器型号');
      return;
    }

    const velocity = parseFloat(smokeVelocity);
    if (isNaN(velocity) || velocity <= 0) {
      setError('请输入有效的烟气流速');
      return;
    }

    const moisture = parseFloat(moistureContent);
    if (isNaN(moisture) || moisture < 0 || moisture > 100) {
      setError('请输入有效的含湿量（0-100%）');
      return;
    }

    const instrument = getInstrument(instrumentId);
    if (!instrument) {
      setError('选择的仪器不存在');
      return;
    }

    // 计算
    const input: CalculationInput = {
      instrumentId,
      samplingType,
      smokeVelocity: velocity,
      moistureContent: moisture,
    };

    try {
      const calculationResult = calculateSamplingMouth(input, instrument.maxFlowRate);
      setResult(calculationResult);
    } catch {
      setError('计算过程中发生错误，请检查输入参数');
    }
  };

  const handleReset = () => {
    setSmokeVelocity('');
    setMoistureContent('');
    setResult(null);
    setError('');
  };

  const renderCalculator = () => (
    <div className="space-y-5">
      {/* 错误提示 */}
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {/* 仪器选择 */}
      <Card className="p-5 space-y-5">
        <Field label="仪器型号" required>
          <Dropdown
            value={instruments.find(i => i.id === instrumentId)?.model || '选择仪器型号'}
            onOptionSelect={(_, data) => setInstrumentId(data.optionValue || '')}
            placeholder="选择仪器型号"
          >
            {instruments.map((instrument) => (
              <Option
                key={instrument.id}
                value={instrument.id}
                text={`${instrument.model} (最高流量: ${instrument.maxFlowRate} L/min)`}
              >
                {instrument.model} (最高流量: {instrument.maxFlowRate} L/min)
              </Option>
            ))}
          </Dropdown>
          {instruments.length === 0 && (
            <Body1 className="text-[var(--app-ink-tertiary)] mt-2 text-xs">
              暂无仪器数据，请先在&ldquo;仪器管理&rdquo;标签页中添加仪器
            </Body1>
          )}
        </Field>

        {/* 采样类型 */}
        <Field label="采样类型" required>
          <RadioGroup
            value={samplingType}
            onChange={(_, data) => setSamplingType(data.value as 'normal' | 'low-concentration')}
          >
            <Radio value="normal" label="普通颗粒物" />
            <Radio value="low-concentration" label="低浓度颗粒物" />
          </RadioGroup>
        </Field>

        <Divider />

        {/* 参数输入 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberInput
            label="烟气流速"
            unit="m/s"
            value={smokeVelocity}
            onChange={setSmokeVelocity}
            placeholder="请输入烟气流速"
            required
            onSubmit={handleCalculate}
          />
          <NumberInput
            label="含湿量"
            unit="%"
            value={moistureContent}
            onChange={setMoistureContent}
            placeholder="请输入含湿量"
            required
            onSubmit={handleCalculate}
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-3">
          <Button
            appearance="primary"
            size="large"
            onClick={handleCalculate}
            disabled={instruments.length === 0}
            icon={<Calculator24Regular />}
          >
            开始计算
          </Button>
          <Button
            appearance="secondary"
            size="large"
            onClick={handleReset}
          >
            重置
          </Button>
        </div>
      </Card>

      {/* 计算结果 */}
      {result && (
        <ResultDisplay
          title="计算结果"
          items={[
            {
              label: '干烟气流速',
              value: result.dryGasVelocity.toFixed(2),
              unit: 'm/s',
              status: 'success',
            },
            {
              label: '满功率推荐嘴径',
              value: result.fullPowerRecommendedDiameter,
              unit: 'mm',
              status: 'success',
            },
            {
              label: '保护功率推荐嘴径',
              value: result.protectionPowerRecommendedDiameter,
              unit: 'mm',
              status: 'warning',
            },
          ]}
        />
      )}

      {/* 可用嘴径规格 */}
      {result && (
        <Card className="p-4">
          <Label className="block mb-2 text-sm font-medium text-[var(--app-ink-secondary)]">
            系统库嘴径规格
          </Label>
          <div className="flex flex-wrap gap-2">
            {result.availableDiameters.map((diameter) => (
              <span
                key={diameter}
                className="inline-block px-2.5 py-1 rounded-md bg-[var(--app-surface-secondary)] text-sm text-[var(--app-ink)]"
              >
                {diameter} mm
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <CalculatorShell
      title="采样嘴计算"
      description="烟气参数与仪器规格匹配推荐嘴径"
    >
      <TabList
        selectedValue={activeTab}
        onTabSelect={(_, data) => setActiveTab(data.value as string)}
        className="mb-5"
      >
        <Tab value="calculator" icon={<Calculator24Regular />}>
          计算器
        </Tab>
        <Tab value="instruments" icon={<Settings24Regular />}>
          仪器管理
        </Tab>
      </TabList>

      {activeTab === 'calculator' && renderCalculator()}
      {activeTab === 'instruments' && <InstrumentManager />}
    </CalculatorShell>
  );
}
