'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Input,
  Label,
  Title1,
  Title2,
  Body1,
  Field,
  RadioGroup,
  Radio,
  Dropdown,
  Option,
  MessageBar,
  MessageBarBody,
  Divider,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbButton,
  Tab,
  TabList,
} from '@fluentui/react-components';
import {
  Calculator24Regular,
  Settings24Regular,
  ArrowLeft24Regular,
  CheckmarkCircle24Regular,
} from '@fluentui/react-icons';
import Link from 'next/link';
import { useInstrumentStore } from '@/stores';
import { calculateSamplingMouth } from '@/lib/calculator';
import { CalculationInput, CalculationResult } from '@/types';
import InstrumentManager from '@/components/InstrumentManager';

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

  const renderCalculator = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card style={{ padding: '24px' }}>
        <Title2 style={{ marginBottom: '20px' }}>参数输入</Title2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <MessageBar intent="error">
              <MessageBarBody>{error}</MessageBarBody>
            </MessageBar>
          )}

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
              <Body1 style={{ color: 'var(--colorNeutralForeground2)', marginTop: '8px' }}>
                暂无仪器数据，请先在&ldquo;仪器管理&rdquo;标签页中添加仪器
              </Body1>
            )}
          </Field>

          <Field label="采样类型" required>
            <RadioGroup
              value={samplingType}
              onChange={(_, data) => setSamplingType(data.value as 'normal' | 'low-concentration')}
            >
              <Radio value="normal" label="普通颗粒物" />
              <Radio value="low-concentration" label="低浓度颗粒物" />
            </RadioGroup>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <Field label="烟气流速 (m/s)" required>
              <Input
                type="number"
                value={smokeVelocity}
                onChange={(e) => setSmokeVelocity(e.target.value)}
                placeholder="请输入烟气流速"
                min="0"
                step="0.1"
              />
            </Field>

            <Field label="含湿量 (%)" required>
              <Input
                type="number"
                value={moistureContent}
                onChange={(e) => setMoistureContent(e.target.value)}
                placeholder="请输入含湿量"
                min="0"
                max="100"
                step="0.1"
              />
            </Field>
          </div>

          <div>
            <Button
              appearance="primary"
              size="large"
              onClick={handleCalculate}
              disabled={instruments.length === 0}
              icon={<Calculator24Regular />}
            >
              开始计算
            </Button>
          </div>
        </div>
      </Card>

      {result && (
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <CheckmarkCircle24Regular style={{ color: 'var(--colorPaletteGreenForeground1)' }} />
            <Title2>计算结果</Title2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px',
              marginBottom: '16px'
            }}>
              <div>
                <Label>干烟气流速</Label>
                <Body1 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--colorBrandForeground1)' }}>
                  {result.dryGasVelocity.toFixed(2)} m/s
                </Body1>
              </div>
            </div>

            <Divider />

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '20px' 
            }}>
              <Card appearance="filled-alternative" style={{ padding: '16px' }}>
                <Title2 style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--colorPaletteGreenForeground1)' }}>
                  满功率推荐嘴径
                </Title2>
                <Body1 style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {result.fullPowerRecommendedDiameter} mm
                </Body1>
                <Body1 style={{ color: 'var(--colorNeutralForeground2)', fontSize: '14px' }}>
                  基于100%最高流量
                </Body1>
              </Card>

              <Card appearance="filled-alternative" style={{ padding: '16px' }}>
                <Title2 style={{ fontSize: '16px', marginBottom: '8px', color: 'var(--colorPaletteRedForeground1)' }}>
                  保护功率推荐嘴径
                </Title2>
                <Body1 style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {result.protectionPowerRecommendedDiameter} mm
                </Body1>
                <Body1 style={{ color: 'var(--colorNeutralForeground2)', fontSize: '14px' }}>
                  基于85%最高流量
                </Body1>
              </Card>
            </div>

            <div>
              <Label style={{ marginBottom: '8px', display: 'block' }}>
                系统库嘴径规格
              </Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {result.availableDiameters.map((diameter) => (
                  <div
                    key={diameter}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'var(--colorNeutralBackground2)',
                      borderRadius: '4px',
                      fontSize: '14px',
                    }}
                  >
                    {diameter} mm
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <div className="page-container">
      <Breadcrumb style={{ marginBottom: '20px' }}>
        <BreadcrumbItem>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <ArrowLeft24Regular />
            返回首页
          </Link>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbButton current>采样嘴计算</BreadcrumbButton>
        </BreadcrumbItem>
      </Breadcrumb>

      <Title1 style={{ marginBottom: '24px' }}>采样嘴计算</Title1>

      <TabList
        selectedValue={activeTab}
        onTabSelect={(_, data) => setActiveTab(data.value as string)}
        style={{ marginBottom: '24px' }}
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
    </div>
  );
}