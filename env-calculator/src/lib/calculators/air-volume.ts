import { CalculationError, requirePositive, roundTo } from './common';

export interface AirVolumeInput {
  flowRateLMin: number;
  samplingMinutes: number;
  pressureKPa: number;
  temperatureC: number;
}

export interface AirVolumeResult {
  actualVolumeL: number;
  standardVolumeL: number;
}

/**
 * 标准状况采样体积换算，单位依据 HJ 194-2017 附录 A。
 * Q: L/min, t: min, P: kPa, temperature: °C, Vn: L。
 */
export function calculateAirStandardVolume(input: AirVolumeInput): AirVolumeResult | CalculationError {
  const flowError = requirePositive(input.flowRateLMin, '采样器工作流量');
  if (flowError) return flowError;

  const timeError = requirePositive(input.samplingMinutes, '累计采样时间');
  if (timeError) return timeError;

  const pressureError = requirePositive(input.pressureKPa, '采样时大气压');
  if (pressureError) return pressureError;

  if (!Number.isFinite(input.temperatureC) || input.temperatureC <= -273.15) {
    return { error: '请输入有效的采样时环境温度' };
  }

  const actualVolumeL = input.flowRateLMin * input.samplingMinutes;
  const standardVolumeL = actualVolumeL * (input.pressureKPa / 101.325) * (273.15 / (273.15 + input.temperatureC));

  return {
    actualVolumeL: roundTo(actualVolumeL, 3),
    standardVolumeL: roundTo(standardVolumeL, 3),
  };
}
