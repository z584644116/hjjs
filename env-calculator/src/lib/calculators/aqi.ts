import { CalculationError, requireNonNegative, roundTo } from './common';

export type AqiPollutant = 'PM2_5_24H' | 'PM10_24H' | 'SO2_24H' | 'NO2_24H' | 'CO_24H' | 'O3_8H';

export interface AqiBreakpoint {
  iaqiLow: number;
  iaqiHigh: number;
  concentrationLow: number;
  concentrationHigh: number;
}

export interface AqiPollutantInfo {
  key: AqiPollutant;
  name: string;
  unit: 'μg/m³' | 'mg/m³';
  breakpoints: AqiBreakpoint[];
}

export interface AqiResult {
  iaqi: number;
  level: string;
  unit: string;
}

const IAQI_LEVELS = [0, 50, 100, 150, 200, 300, 400, 500];

function makeBreakpoints(values: number[]): AqiBreakpoint[] {
  return values.slice(0, -1).map((low, index) => ({
    iaqiLow: IAQI_LEVELS[index],
    iaqiHigh: IAQI_LEVELS[index + 1],
    concentrationLow: low,
    concentrationHigh: values[index + 1],
  }));
}

export const AQI_POLLUTANTS: AqiPollutantInfo[] = [
  { key: 'PM2_5_24H', name: 'PM2.5 24小时平均', unit: 'μg/m³', breakpoints: makeBreakpoints([0, 35, 75, 115, 150, 250, 350, 500]) },
  { key: 'PM10_24H', name: 'PM10 24小时平均', unit: 'μg/m³', breakpoints: makeBreakpoints([0, 50, 150, 250, 350, 420, 500, 600]) },
  { key: 'SO2_24H', name: 'SO₂ 24小时平均', unit: 'μg/m³', breakpoints: makeBreakpoints([0, 50, 150, 475, 800, 1600, 2100, 2620]) },
  { key: 'NO2_24H', name: 'NO₂ 24小时平均', unit: 'μg/m³', breakpoints: makeBreakpoints([0, 40, 80, 180, 280, 565, 750, 940]) },
  { key: 'CO_24H', name: 'CO 24小时平均', unit: 'mg/m³', breakpoints: makeBreakpoints([0, 2, 4, 14, 24, 36, 48, 60]) },
  { key: 'O3_8H', name: 'O₃ 日最大8小时平均', unit: 'μg/m³', breakpoints: makeBreakpoints([0, 100, 160, 215, 265, 800]) },
];

export function getAqiPollutantInfo(key: AqiPollutant): AqiPollutantInfo {
  const info = AQI_POLLUTANTS.find(item => item.key === key);
  if (!info) throw new Error(`Unknown AQI pollutant: ${key}`);
  return info;
}

function getAqiLevel(iaqi: number): string {
  if (iaqi <= 50) return '一级 优';
  if (iaqi <= 100) return '二级 良';
  if (iaqi <= 150) return '三级 轻度污染';
  if (iaqi <= 200) return '四级 中度污染';
  if (iaqi <= 300) return '五级 重度污染';
  return '六级 严重污染';
}

/**
 * 空气质量指数分指数 IAQI，单位依据 HJ 633-2012。
 */
export function calculateAqi(pollutant: AqiPollutant, concentration: number): AqiResult | CalculationError {
  const concentrationError = requireNonNegative(concentration, '污染物浓度');
  if (concentrationError) return concentrationError;

  const info = getAqiPollutantInfo(pollutant);
  const breakpoint = info.breakpoints.find(item => concentration >= item.concentrationLow && concentration <= item.concentrationHigh);
  if (!breakpoint) {
    return { error: `浓度超过当前 ${info.name} AQI 表范围` };
  }

  const iaqi = ((breakpoint.iaqiHigh - breakpoint.iaqiLow) / (breakpoint.concentrationHigh - breakpoint.concentrationLow))
    * (concentration - breakpoint.concentrationLow)
    + breakpoint.iaqiLow;

  return {
    iaqi: roundTo(iaqi, 0),
    level: getAqiLevel(iaqi),
    unit: info.unit,
  };
}
