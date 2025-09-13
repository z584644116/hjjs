import { SAMPLING_MOUTH_SPECS, PROTECTION_POWER_FACTOR } from '@/constants';
import { CalculationInput, CalculationResult } from '@/types';

export const calculateSamplingMouth = (input: CalculationInput, maxFlowRate: number): CalculationResult => {
  const { smokeVelocity, moistureContent, samplingType } = input;
  
  // 计算干烟气流速: V_d = V_w × (1 - X_w)
  const dryGasVelocity = smokeVelocity * (1 - moistureContent / 100);
  
  // 获取对应采样类型的嘴径库
  const availableDiameters = samplingType === 'normal' 
    ? SAMPLING_MOUTH_SPECS.normal 
    : SAMPLING_MOUTH_SPECS.lowConcentration;
  
  // 满功率推荐嘴径计算 (基于100%最高流量)
  const fullPowerFlowRate = maxFlowRate;
  const fullPowerDiameter = calculateDiameter(fullPowerFlowRate, dryGasVelocity);
  const fullPowerRecommendedDiameter = findRecommendedDiameter(fullPowerDiameter, availableDiameters);
  
  // 保护功率推荐嘴径计算 (基于85%最高流量)
  const protectionPowerFlowRate = maxFlowRate * PROTECTION_POWER_FACTOR;
  const protectionPowerDiameter = calculateDiameter(protectionPowerFlowRate, dryGasVelocity);
  const protectionPowerRecommendedDiameter = findRecommendedDiameter(protectionPowerDiameter, availableDiameters);
  
  return {
    dryGasVelocity,
    fullPowerRecommendedDiameter,
    protectionPowerRecommendedDiameter,
    availableDiameters,
  };
};

// 根据流量和流速计算理论嘴径
const calculateDiameter = (flowRate: number, velocity: number): number => {
  // 流量转换: L/min -> m³/s
  const flowRateM3s = flowRate / 60000;
  
  // 根据流量方程: Q = A × v, A = π × (d/2)²
  // 求解直径: d = 2 × √(Q / (π × v))
  const area = flowRateM3s / velocity;
  const radius = Math.sqrt(area / Math.PI);
  const diameter = radius * 2 * 1000; // 转换为mm
  
  return diameter;
};

// 从可用嘴径中选择≤计算值的最大嘴径
const findRecommendedDiameter = (calculatedDiameter: number, availableDiameters: number[]): number => {
  const suitableDiameters = availableDiameters.filter(d => d <= calculatedDiameter);
  return suitableDiameters.length > 0 
    ? Math.max(...suitableDiameters)
    : Math.min(...availableDiameters);
};