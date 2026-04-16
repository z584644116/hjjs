import { CalculationError, requireNonNegative, requirePositive, roundTo } from './common';

export type AirConcentrationMode = 'ambient-pm' | 'stack-pm';

export interface AirConcentrationInput {
  mode: AirConcentrationMode;
  flowRateLMin: number;
  samplingMinutes: number;
  pressureKPa: number;
  temperatureC: number;
  weightBeforeMg: number;
  weightAfterMg: number;
}

export interface AirConcentrationResult {
  actualVolumeL: number;
  standardVolumeL: number;
  standardVolumeM3: number;
  particleMassMg: number;
  concentrationMgM3: number;
}

/**
 * 空气/废气颗粒物浓度：先按采样条件换算标准体积，再用增重除以标准体积。
 * Q: L/min, t: min, P: kPa, T: ℃, w1/w2: mg, C: mg/m³。
 */
export function calculateAirConcentration(input: AirConcentrationInput): AirConcentrationResult | CalculationError {
  const flowError = requirePositive(input.flowRateLMin, '采样流量');
  if (flowError) return flowError;

  const timeError = requirePositive(input.samplingMinutes, '采样时间');
  if (timeError) return timeError;

  const pressureError = requirePositive(input.pressureKPa, '采样时压力');
  if (pressureError) return pressureError;

  if (!Number.isFinite(input.temperatureC) || input.temperatureC <= -273.15) {
    return { error: '请输入有效的采样温度' };
  }

  const beforeError = requireNonNegative(input.weightBeforeMg, '采样前重量');
  if (beforeError) return beforeError;

  const afterError = requireNonNegative(input.weightAfterMg, '采样后重量');
  if (afterError) return afterError;

  const particleMassMg = input.weightAfterMg - input.weightBeforeMg;
  if (particleMassMg < 0) return { error: '采样后重量不能小于采样前重量' };

  const actualVolumeL = input.flowRateLMin * input.samplingMinutes;
  const standardVolumeL = actualVolumeL * (input.pressureKPa / 101.325) * (273.15 / (273.15 + input.temperatureC));
  const standardVolumeM3 = standardVolumeL / 1000;

  return {
    actualVolumeL: roundTo(actualVolumeL, 3),
    standardVolumeL: roundTo(standardVolumeL, 3),
    standardVolumeM3: roundTo(standardVolumeM3, 6),
    particleMassMg: roundTo(particleMassMg, 4),
    concentrationMgM3: roundTo(particleMassMg / standardVolumeM3, 4),
  };
}
