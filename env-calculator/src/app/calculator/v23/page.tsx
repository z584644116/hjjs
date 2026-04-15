'use client';

import React, { useEffect, useMemo, useState } from 'react';
import CalculatorShell from '@/components/CalculatorShell';
import NumberInput from '@/components/NumberInput';
import ResultDisplay from '@/components/ResultDisplay';
import {
  AQI_POLLUTANTS,
  AqiPollutant,
  calculateAirStandardVolume,
  calculateAqi,
  calculateExceedance,
  calculateIsokineticFlow,
  calculateMethodDetectionLimit,
  calculatePmConcentration,
  calculateRsd,
  calculateSampleSize,
  calculateSoilMoisture,
  calculateSoilPrepLoss,
  calculateSoilSieveRate,
  calculateSpikeRecovery,
  calculateStackPmConcentration,
  calculateTitrationAsCaco3,
  getAqiPollutantInfo,
} from '@/lib/calculators';

type ModuleKey =
  | 'air-volume'
  | 'pm-conc'
  | 'stack-pm'
  | 'gas'
  | 'aqi'
  | 'mdl-qc'
  | 'recovery-qc'
  | 'rsd-qc'
  | 'alkalinity-hardness'
  | 'soil-moisture'
  | 'soil-prep-qc'
  | 'sample-size'
  | 'exceedance';

type ModuleCategory = '空气和废气' | '水质' | '通用与质控';

const modules: { key: ModuleKey; title: string; description: string; category: ModuleCategory }[] = [
  { key: 'air-volume', title: '标准状况采样体积', description: 'Q、t、P、温度换算 Vn，结果单位 L', category: '空气和废气' },
  { key: 'pm-conc', title: '环境空气 PM 浓度', description: '滤膜增重与标准采样体积计算 mg/m³', category: '空气和废气' },
  { key: 'stack-pm', title: '固定源颗粒物浓度', description: '捕集质量与标准干烟气体积计算 mg/m³', category: '空气和废气' },
  { key: 'gas', title: '烟气流速与等速验证', description: '动压、压力、温度、皮托管系数计算 m/s 与 L/min', category: '空气和废气' },
  { key: 'aqi', title: '空气质量指数 AQI', description: '按污染物动态切换 μg/m³ 或 mg/m³', category: '空气和废气' },
  { key: 'alkalinity-hardness', title: '滴定法碱度/硬度', description: '滴定体积与浓度换算 mg/L，以 CaCO₃ 计', category: '水质' },
  { key: 'mdl-qc', title: '方法检出限 MDL', description: 'MDL = t × s，结果与 s 单位一致', category: '通用与质控' },
  { key: 'recovery-qc', title: '加标回收率', description: '加标回收率，结果单位 %', category: '通用与质控' },
  { key: 'rsd-qc', title: 'RSD', description: '相对标准偏差，结果单位 %', category: '通用与质控' },
  { key: 'soil-moisture', title: '土壤含水率', description: '湿重、干重计算质量含水率 %', category: '通用与质控' },
  { key: 'soil-prep-qc', title: '土壤制备 QC', description: '制备损失率与过筛率，结果单位 %', category: '通用与质控' },
  { key: 'sample-size', title: '统计样本数', description: '标准差、允许误差和置信系数估算 n', category: '通用与质控' },
  { key: 'exceedance', title: '污染物超标倍数', description: '实测浓度与标准限值计算标准指数', category: '通用与质控' },
];

function parseDecimal(value: string): number {
  return value.trim() === '' ? NaN : Number(value.replace(',', '.'));
}

function parseNumberList(value: string): number[] {
  return value
    .split(/[\s,，;；]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .map(parseDecimal);
}

function isModuleKey(value: string | null): value is ModuleKey {
  return modules.some((item) => item.key === value);
}

export default function V23CalculatorPage() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('air-volume');

  const [air, setAir] = useState({ q: '16.7', t: '60', p: '101.3', temp: '25' });
  const [pm, setPm] = useState({ after: '152.34', before: '150.20', volume: '24' });
  const [stackPm, setStackPm] = useState({ mass: '12.5', volume: '500' });
  const [gas, setGas] = useState({ pd: '60', ba: '101.3', ps: '-1.2', temp: '120', kp: '0.84', density: '', nozzle: '8', actualFlow: '12' });
  const [aqi, setAqi] = useState<{ pollutant: AqiPollutant; concentration: string }>({ pollutant: 'PM2_5_24H', concentration: '55' });
  const [mdl, setMdl] = useState({ sd: '0.012', t: '3.143', unit: 'mg/L' });
  const [recovery, setRecovery] = useState({ original: '1.00', spiked: '1.45', spike: '0.50' });
  const [rsdValues, setRsdValues] = useState('1.02, 1.01, 1.04, 1.03');
  const [titration, setTitration] = useState({ volume: '12.30', blank: '0.05', concentration: '0.0100', sample: '100' });
  const [moisture, setMoisture] = useState({ wet: '125.4', dry: '103.2' });
  const [soilPrep, setSoilPrep] = useState({ before: '500', after: '496', passed: '480', total: '500' });
  const [sampleSize, setSampleSize] = useState({ sd: '3.2', error: '1', coefficient: '1.96' });
  const [exceedance, setExceedance] = useState({ concentration: '1.2', limit: '1.0', unit: 'mg/L' });

  const activeInfo = modules.find(item => item.key === activeModule) ?? modules[0];

  useEffect(() => {
    const moduleParam = new URLSearchParams(window.location.search).get('module');
    if (isModuleKey(moduleParam)) {
      setActiveModule(moduleParam);
    }
  }, []);

  const content = useMemo(() => {
    switch (activeModule) {
      case 'air-volume': {
        const result = calculateAirStandardVolume({
          flowRateLMin: parseDecimal(air.q),
          samplingMinutes: parseDecimal(air.t),
          pressureKPa: parseDecimal(air.p),
          temperatureC: parseDecimal(air.temp),
        });
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberInput label="采样器工作流量 Q" unit="L/min" value={air.q} step="0.1" onChange={q => setAir(prev => ({ ...prev, q }))} />
              <NumberInput label="累计采样时间 t" unit="min" value={air.t} onChange={t => setAir(prev => ({ ...prev, t }))} />
              <NumberInput label="采样时大气压 P" unit="kPa" value={air.p} step="0.1" onChange={p => setAir(prev => ({ ...prev, p }))} />
              <NumberInput label="采样时环境温度 ts" unit="°C" value={air.temp} step="0.1" onChange={temp => setAir(prev => ({ ...prev, temp }))} />
            </div>
            {'error' in result ? (
              <div className="mt-4 p-3 rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] text-[var(--app-danger)] text-sm">{result.error}</div>
            ) : (
              <div className="mt-4">
                <ResultDisplay
                  items={[
                    { label: '实际采样体积', value: result.actualVolumeL.toFixed(3), unit: 'L' },
                    { label: '标准状况采样体积 Vn', value: result.standardVolumeL.toFixed(3), unit: 'L' },
                  ]}
                />
              </div>
            )}
          </>
        );
      }
      case 'pm-conc': {
        const result = calculatePmConcentration({
          weightAfterMg: parseDecimal(pm.after),
          weightBeforeMg: parseDecimal(pm.before),
          standardVolumeM3: parseDecimal(pm.volume),
        });
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberInput label="采样后滤膜重量 w2" unit="mg" value={pm.after} step="0.01" onChange={after => setPm(prev => ({ ...prev, after }))} />
              <NumberInput label="采样前滤膜重量 w1" unit="mg" value={pm.before} step="0.01" onChange={before => setPm(prev => ({ ...prev, before }))} />
              <NumberInput label="标准状况采样体积 V0" unit="m³" value={pm.volume} step="0.1" onChange={volume => setPm(prev => ({ ...prev, volume }))} />
            </div>
            {'error' in result ? (
              <div className="mt-4 p-3 rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] text-[var(--app-danger)] text-sm">{result.error}</div>
            ) : (
              <div className="mt-4">
                <ResultDisplay
                  items={[
                    { label: '颗粒物质量', value: result.massMg.toFixed(4), unit: 'mg' },
                    { label: '质量浓度 ρ', value: result.concentrationMgM3.toFixed(4), unit: 'mg/m³' },
                  ]}
                />
              </div>
            )}
          </>
        );
      }
      case 'stack-pm': {
        const result = calculateStackPmConcentration({
          particleMassMg: parseDecimal(stackPm.mass),
          standardDryGasVolumeL: parseDecimal(stackPm.volume),
        });
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberInput label="捕集颗粒物质量 m" unit="mg" value={stackPm.mass} onChange={mass => setStackPm(prev => ({ ...prev, mass }))} />
              <NumberInput label="标准干烟气采样体积 Vnd" unit="L" value={stackPm.volume} onChange={volume => setStackPm(prev => ({ ...prev, volume }))} />
            </div>
            {'error' in result ? (
              <div className="mt-4 p-3 rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] text-[var(--app-danger)] text-sm">{result.error}</div>
            ) : (
              <div className="mt-4">
                <ResultDisplay
                  items={[
                    { label: '颗粒物浓度 C', value: result.concentrationMgM3.toFixed(4), unit: 'mg/m³' },
                  ]}
                />
              </div>
            )}
          </>
        );
      }
      case 'gas': {
        const density = parseDecimal(gas.density);
        const result = calculateIsokineticFlow({
          dynamicPressurePa: parseDecimal(gas.pd),
          atmosphericPressureKPa: parseDecimal(gas.ba),
          staticPressureKPa: parseDecimal(gas.ps),
          temperatureC: parseDecimal(gas.temp),
          pitotCoefficient: parseDecimal(gas.kp),
          gasDensityKgM3: Number.isFinite(density) ? density : undefined,
          nozzleDiameterMm: parseDecimal(gas.nozzle),
          actualFlowLMin: parseDecimal(gas.actualFlow),
        });
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberInput label="动压 Pd" unit="Pa" value={gas.pd} onChange={pd => setGas(prev => ({ ...prev, pd }))} />
              <NumberInput label="大气压 Ba" unit="kPa" value={gas.ba} step="0.1" onChange={ba => setGas(prev => ({ ...prev, ba }))} />
              <NumberInput label="静压 Ps" unit="kPa" value={gas.ps} step="0.1" onChange={ps => setGas(prev => ({ ...prev, ps }))} />
              <NumberInput label="烟气温度 ts" unit="°C" value={gas.temp} step="0.1" onChange={temp => setGas(prev => ({ ...prev, temp }))} />
              <NumberInput label="皮托管系数 Kp" value={gas.kp} step="0.01" onChange={kp => setGas(prev => ({ ...prev, kp }))} />
              <NumberInput label="烟气密度 ρs（可选）" unit="kg/m³" value={gas.density} placeholder="留空则按空气估算" onChange={densityValue => setGas(prev => ({ ...prev, density: densityValue }))} />
              <NumberInput label="采样嘴直径" unit="mm" value={gas.nozzle} onChange={nozzle => setGas(prev => ({ ...prev, nozzle }))} />
              <NumberInput label="实际采样流量" unit="L/min" value={gas.actualFlow} onChange={actualFlow => setGas(prev => ({ ...prev, actualFlow }))} />
            </div>
            {'error' in result ? (
              <div className="mt-4 p-3 rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] text-[var(--app-danger)] text-sm">{result.error}</div>
            ) : (
              <div className="mt-4">
                <ResultDisplay
                  items={[
                    { label: '绝对压力', value: result.absolutePressureKPa.toFixed(3), unit: 'kPa' },
                    { label: '烟气密度', value: result.gasDensityKgM3.toFixed(4), unit: 'kg/m³' },
                    { label: '烟气流速 Vs', value: result.velocityMS.toFixed(2), unit: 'm/s' },
                    { label: '理论等速流量', value: result.theoreticalFlowLMin.toFixed(2), unit: 'L/min' },
                    { label: '流量偏差', value: result.deviationPercent.toFixed(2), unit: '%' },
                    { label: '等速判定', value: result.isWithinTolerance ? '符合 ±10%' : '超出 ±10%', status: result.isWithinTolerance ? 'success' : 'danger' },
                  ]}
                />
              </div>
            )}
          </>
        );
      }
      case 'aqi': {
        const info = getAqiPollutantInfo(aqi.pollutant);
        const result = calculateAqi(aqi.pollutant, parseDecimal(aqi.concentration));
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--app-ink-secondary)]">污染物</label>
                <select
                  className="w-full min-h-[42px] px-3 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm"
                  value={aqi.pollutant}
                  onChange={event => setAqi(prev => ({ ...prev, pollutant: event.target.value as AqiPollutant }))}
                >
                  {AQI_POLLUTANTS.map(item => (
                    <option key={item.key} value={item.key}>{item.name}</option>
                  ))}
                </select>
              </div>
              <NumberInput label="污染物浓度" unit={info.unit} value={aqi.concentration} onChange={concentration => setAqi(prev => ({ ...prev, concentration }))} />
            </div>
            <p className="mt-2 text-xs text-[var(--app-ink-tertiary)]">当前输入单位：{info.unit}</p>
            {'error' in result ? (
              <div className="mt-4 p-3 rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] text-[var(--app-danger)] text-sm">{result.error}</div>
            ) : (
              <div className="mt-4">
                <ResultDisplay
                  items={[
                    { label: 'IAQI', value: result.iaqi.toFixed(0) },
                    { label: '空气质量级别', value: result.level },
                  ]}
                />
              </div>
            )}
          </>
        );
      }
      case 'mdl-qc': {
        const result = calculateMethodDetectionLimit({
          standardDeviation: parseDecimal(mdl.sd),
          tValue: parseDecimal(mdl.t),
        });
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberInput label="重复测定标准差 s" unit={mdl.unit} value={mdl.sd} onChange={sd => setMdl(prev => ({ ...prev, sd }))} />
              <NumberInput label="t 分布值" value={mdl.t} onChange={t => setMdl(prev => ({ ...prev, t }))} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--app-ink-secondary)]">浓度单位</label>
                <input
                  type="text"
                  value={mdl.unit}
                  onChange={event => setMdl(prev => ({ ...prev, unit: event.target.value }))}
                  className="w-full min-h-[38px] px-3 py-2 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] hover:border-[var(--app-line-strong)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm placeholder:text-[var(--app-ink-tertiary)] transition-colors outline-none focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)]"
                />
              </div>
            </div>
            {'error' in result ? (
              <div className="mt-4 p-3 rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] text-[var(--app-danger)] text-sm">{result.error}</div>
            ) : (
              <div className="mt-4">
                <ResultDisplay
                  items={[
                    { label: '方法检出限 MDL', value: result.methodDetectionLimit.toFixed(6), unit: mdl.unit },
                  ]}
                />
              </div>
            )}
          </>
        );
      }
      case 'recovery-qc': {
        const spikeResult = calculateSpikeRecovery({
          originalConcentration: parseDecimal(recovery.original),
          spikedConcentration: parseDecimal(recovery.spiked),
          spikeAmount: parseDecimal(recovery.spike),
        });
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberInput label="原样测定值" unit="mg/L 或 μg" value={recovery.original} onChange={original => setRecovery(prev => ({ ...prev, original }))} />
              <NumberInput label="加标样测定值" unit="mg/L 或 μg" value={recovery.spiked} onChange={spiked => setRecovery(prev => ({ ...prev, spiked }))} />
              <NumberInput label="加标量" unit="mg/L 或 μg" value={recovery.spike} onChange={spike => setRecovery(prev => ({ ...prev, spike }))} />
            </div>
            {'error' in spikeResult ? (
              <div className="mt-4 p-3 rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] text-[var(--app-danger)] text-sm">{spikeResult.error}</div>
            ) : (
              <div className="mt-4">
                <ResultDisplay
                  items={[
                    { label: '回收量', value: spikeResult.recoveredAmount.toFixed(6) },
                    { label: '加标回收率', value: spikeResult.recoveryPercent.toFixed(2), unit: '%' },
                  ]}
                />
              </div>
            )}
          </>
        );
      }
      case 'rsd-qc': {
        const rsdResult = calculateRsd(parseNumberList(rsdValues));
        return (
          <>
            <div className="grid grid-cols-1 gap-3">
              <div className="app-number-field">
                <label className="app-number-label" htmlFor="rsd-values">测定值</label>
                <div className="app-number-control">
                  <input
                    id="rsd-values"
                    type="text"
                    value={rsdValues}
                    onChange={event => setRsdValues(event.target.value)}
                    placeholder="用逗号或空格分隔"
                    className="app-number-input text-left"
                  />
                </div>
              </div>
            </div>
            {'error' in rsdResult ? (
              <div className="mt-4 p-3 rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] text-[var(--app-danger)] text-sm">{rsdResult.error}</div>
            ) : (
              <div className="mt-4">
                <ResultDisplay
                  items={[
                    { label: '平均值', value: rsdResult.average.toFixed(6) },
                    { label: '标准偏差', value: rsdResult.standardDeviation.toFixed(6) },
                    { label: 'RSD', value: rsdResult.rsdPercent.toFixed(2), unit: '%' },
                  ]}
                />
              </div>
            )}
          </>
        );
      }
      case 'alkalinity-hardness': {
        const result = calculateTitrationAsCaco3({
          titrantVolumeMl: parseDecimal(titration.volume),
          blankVolumeMl: parseDecimal(titration.blank),
          titrantConcentrationMolL: parseDecimal(titration.concentration),
          sampleVolumeMl: parseDecimal(titration.sample),
        });
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberInput label="滴定体积" unit="mL" value={titration.volume} onChange={volume => setTitration(prev => ({ ...prev, volume }))} />
              <NumberInput label="空白滴定体积" unit="mL" value={titration.blank} onChange={blank => setTitration(prev => ({ ...prev, blank }))} />
              <NumberInput label="滴定液浓度" unit="mol/L" value={titration.concentration} onChange={concentration => setTitration(prev => ({ ...prev, concentration }))} />
              <NumberInput label="样品体积" unit="mL" value={titration.sample} onChange={sample => setTitration(prev => ({ ...prev, sample }))} />
            </div>
            {'error' in result ? (
              <div className="mt-4 p-3 rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] text-[var(--app-danger)] text-sm">{result.error}</div>
            ) : (
              <div className="mt-4">
                <ResultDisplay
                  items={[
                    { label: '净滴定体积', value: result.netTitrantVolumeMl.toFixed(3), unit: 'mL' },
                    { label: '结果', value: result.concentrationMgLAsCaco3.toFixed(3), unit: 'mg/L (以 CaCO₃ 计)' },
                  ]}
                />
              </div>
            )}
          </>
        );
      }
      case 'soil-moisture': {
        const result = calculateSoilMoisture({
          wetWeightG: parseDecimal(moisture.wet),
          dryWeightG: parseDecimal(moisture.dry),
        });
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberInput label="湿重" unit="g" value={moisture.wet} onChange={wet => setMoisture(prev => ({ ...prev, wet }))} />
              <NumberInput label="干重" unit="g" value={moisture.dry} onChange={dry => setMoisture(prev => ({ ...prev, dry }))} />
            </div>
            {'error' in result ? (
              <div className="mt-4 p-3 rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] text-[var(--app-danger)] text-sm">{result.error}</div>
            ) : (
              <div className="mt-4">
                <ResultDisplay
                  items={[
                    { label: '水分质量', value: result.waterWeightG.toFixed(4), unit: 'g' },
                    { label: '含水率', value: result.moisturePercent.toFixed(2), unit: '%' },
                  ]}
                />
              </div>
            )}
          </>
        );
      }
      case 'soil-prep-qc': {
        const lossResult = calculateSoilPrepLoss({
          beforeWeightG: parseDecimal(soilPrep.before),
          afterWeightG: parseDecimal(soilPrep.after),
        });
        const sieveResult = calculateSoilSieveRate({
          passedWeightG: parseDecimal(soilPrep.passed),
          totalWeightG: parseDecimal(soilPrep.total),
        });
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberInput label="制备前重量" unit="g" value={soilPrep.before} onChange={before => setSoilPrep(prev => ({ ...prev, before }))} />
              <NumberInput label="制备后重量" unit="g" value={soilPrep.after} onChange={after => setSoilPrep(prev => ({ ...prev, after }))} />
              <NumberInput label="过筛重量" unit="g" value={soilPrep.passed} onChange={passed => setSoilPrep(prev => ({ ...prev, passed }))} />
              <NumberInput label="总重量" unit="g" value={soilPrep.total} onChange={total => setSoilPrep(prev => ({ ...prev, total }))} />
            </div>
            {'error' in lossResult ? (
              <div className="mt-4 p-3 rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] text-[var(--app-danger)] text-sm">{lossResult.error}</div>
            ) : 'error' in sieveResult ? (
              <div className="mt-4 p-3 rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] text-[var(--app-danger)] text-sm">{sieveResult.error}</div>
            ) : (
              <div className="mt-4">
                <ResultDisplay
                  items={[
                    { label: '损失重量', value: lossResult.lossWeightG.toFixed(4), unit: 'g' },
                    { label: '损失率', value: lossResult.lossPercent.toFixed(2), unit: '%' },
                    { label: '过筛率', value: sieveResult.sievePercent.toFixed(2), unit: '%' },
                  ]}
                />
              </div>
            )}
          </>
        );
      }
      case 'sample-size': {
        const result = calculateSampleSize({
          standardDeviation: parseDecimal(sampleSize.sd),
          allowableError: parseDecimal(sampleSize.error),
          confidenceCoefficient: parseDecimal(sampleSize.coefficient),
        });
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberInput label="标准差 s" value={sampleSize.sd} onChange={sd => setSampleSize(prev => ({ ...prev, sd }))} />
              <NumberInput label="允许误差 E" value={sampleSize.error} onChange={error => setSampleSize(prev => ({ ...prev, error }))} />
              <NumberInput label="置信系数" value={sampleSize.coefficient} onChange={coefficient => setSampleSize(prev => ({ ...prev, coefficient }))} />
            </div>
            {'error' in result ? (
              <div className="mt-4 p-3 rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] text-[var(--app-danger)] text-sm">{result.error}</div>
            ) : (
              <div className="mt-4">
                <ResultDisplay
                  items={[
                    { label: '原始样本数', value: result.rawSampleCount.toFixed(3) },
                    { label: '建议样本数 n', value: result.estimatedSampleCount },
                  ]}
                />
              </div>
            )}
          </>
        );
      }
      case 'exceedance': {
        const result = calculateExceedance({
          concentration: parseDecimal(exceedance.concentration),
          standardLimit: parseDecimal(exceedance.limit),
        });
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <NumberInput label="实测浓度" unit={exceedance.unit} value={exceedance.concentration} onChange={concentration => setExceedance(prev => ({ ...prev, concentration }))} />
              <NumberInput label="标准限值" unit={exceedance.unit} value={exceedance.limit} onChange={limit => setExceedance(prev => ({ ...prev, limit }))} />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--app-ink-secondary)]">浓度单位</label>
                <input
                  type="text"
                  value={exceedance.unit}
                  onChange={event => setExceedance(prev => ({ ...prev, unit: event.target.value }))}
                  className="w-full min-h-[38px] px-3 py-2 rounded-[var(--app-radius-sm)] border border-[var(--app-line)] hover:border-[var(--app-line-strong)] bg-[var(--app-surface)] text-[var(--app-ink)] text-sm placeholder:text-[var(--app-ink-tertiary)] transition-colors outline-none focus:ring-2 focus:ring-[var(--app-primary)] focus:border-[var(--app-primary)]"
                />
              </div>
            </div>
            {'error' in result ? (
              <div className="mt-4 p-3 rounded-[var(--app-radius-sm)] bg-[var(--app-danger-light)] text-[var(--app-danger)] text-sm">{result.error}</div>
            ) : (
              <div className="mt-4">
                <ResultDisplay
                  items={[
                    { label: '标准指数', value: result.standardIndex.toFixed(4) },
                    { label: '超标倍数', value: result.exceedanceMultiple.toFixed(4) },
                    { label: '判定', value: result.isExceeded ? '超标' : '未超标', status: result.isExceeded ? 'danger' : 'success' },
                  ]}
                />
              </div>
            )}
          </>
        );
      }
      default:
        return null;
    }
  }, [activeModule, air, pm, stackPm, gas, aqi, mdl, recovery, rsdValues, titration, moisture, soilPrep, sampleSize, exceedance]);

  return (
    <CalculatorShell title={activeInfo.title}>
      <section className="app-panel p-4 md:p-5">
        {content}
      </section>
    </CalculatorShell>
  );
}
