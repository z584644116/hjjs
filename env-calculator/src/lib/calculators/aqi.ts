import { CalculationError, requireNonNegative, roundTo } from './common';
import { CalculationWarning, FormulaMeta } from './types';

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
  /** 统计周期说明，用于前端展示与数据有效性提示 */
  averagingPeriod: string;
  breakpoints: AqiBreakpoint[];
}

export interface AqiResult {
  iaqi: number;
  level: string;
  unit: string;
  averagingPeriod: string;
  pollutantName: string;
  warnings: CalculationWarning[];
  meta: FormulaMeta;
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
  { key: 'PM2_5_24H', name: 'PM2.5 24 小时平均', unit: 'μg/m³', averagingPeriod: '24 小时', breakpoints: makeBreakpoints([0, 35, 75, 115, 150, 250, 350, 500]) },
  { key: 'PM10_24H', name: 'PM10 24 小时平均', unit: 'μg/m³', averagingPeriod: '24 小时', breakpoints: makeBreakpoints([0, 50, 150, 250, 350, 420, 500, 600]) },
  { key: 'SO2_24H', name: 'SO₂ 24 小时平均', unit: 'μg/m³', averagingPeriod: '24 小时', breakpoints: makeBreakpoints([0, 50, 150, 475, 800, 1600, 2100, 2620]) },
  { key: 'NO2_24H', name: 'NO₂ 24 小时平均', unit: 'μg/m³', averagingPeriod: '24 小时', breakpoints: makeBreakpoints([0, 40, 80, 180, 280, 565, 750, 940]) },
  { key: 'CO_24H', name: 'CO 24 小时平均', unit: 'mg/m³', averagingPeriod: '24 小时', breakpoints: makeBreakpoints([0, 2, 4, 14, 24, 36, 48, 60]) },
  { key: 'O3_8H', name: 'O₃ 日最大 8 小时平均', unit: 'μg/m³', averagingPeriod: '日最大 8 小时', breakpoints: makeBreakpoints([0, 100, 160, 215, 265, 800]) },
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

/** 查找断点：首个区间闭区间 [low, high]，后续区间 (low, high]，避免重叠。 */
function findBreakpoint(breakpoints: AqiBreakpoint[], concentration: number): AqiBreakpoint | null {
  for (let i = 0; i < breakpoints.length; i++) {
    const bp = breakpoints[i];
    if (i === 0) {
      if (concentration >= bp.concentrationLow && concentration <= bp.concentrationHigh) return bp;
    } else if (concentration > bp.concentrationLow && concentration <= bp.concentrationHigh) {
      return bp;
    }
  }
  return null;
}

const AQI_META: FormulaMeta = {
  formulaName: '空气质量分指数 IAQI',
  formulaText: 'IAQI = (IAQI_Hi − IAQI_Lo)/(BP_Hi − BP_Lo) × (C − BP_Lo) + IAQI_Lo',
  formulaType: 'standard-method',
  resultLevel: 'internal-check',
  references: ['HJ 633-2012', 'GB 3095-2012'],
  applicability: [
    '城市/区域大气常规污染物小时及日均 AQI 评价',
    '公众健康风险分级辅助参考',
  ],
  limitations: [
    '本模块仅计算分指数 IAQI，不替代数据有效性审核',
    '浓度超出断点表最高值时不应外推',
    '污染物统计周期与单位必须与标准一致，不能随意切换',
  ],
};

/**
 * 空气质量指数分指数 IAQI，单位依据 HJ 633-2012。
 * 首个区间包含低端，后续区间使用 (low, high]，避免边界重复。
 */
export function calculateAqi(pollutant: AqiPollutant, concentration: number): AqiResult | CalculationError {
  const concentrationError = requireNonNegative(concentration, '污染物浓度');
  if (concentrationError) return concentrationError;

  const info = getAqiPollutantInfo(pollutant);
  const breakpoint = findBreakpoint(info.breakpoints, concentration);
  const warnings: CalculationWarning[] = [];

  if (!breakpoint) {
    return { error: `${info.name} 浓度 ${concentration} ${info.unit} 超过 AQI 断点表范围，不进行外推` };
  }

  const iaqi = ((breakpoint.iaqiHigh - breakpoint.iaqiLow) / (breakpoint.concentrationHigh - breakpoint.concentrationLow))
    * (concentration - breakpoint.concentrationLow)
    + breakpoint.iaqiLow;

  // CO 单位提醒
  if (info.unit === 'mg/m³') {
    warnings.push({
      level: 'info',
      message: `${info.name} 使用 mg/m³，与其他污染物 μg/m³ 不可混用`,
    });
  }

  // 靠近断点表上限提示
  const topBreakpoint = info.breakpoints[info.breakpoints.length - 1];
  if (concentration > topBreakpoint.concentrationHigh * 0.9) {
    warnings.push({
      level: 'warning',
      message: `浓度接近 ${info.name} 断点表上限 (${topBreakpoint.concentrationHigh} ${info.unit})`,
      suggestion: '接近表上限时污染已极重，请核对监测值',
    });
  }

  warnings.push({
    level: 'info',
    message: `统计周期：${info.averagingPeriod}`,
    suggestion: '正式评价应确认数据满足 HJ 633 对样本数/时间覆盖率的最低要求',
  });

  return {
    iaqi: roundTo(iaqi, 0),
    level: getAqiLevel(iaqi),
    unit: info.unit,
    averagingPeriod: info.averagingPeriod,
    pollutantName: info.name,
    warnings,
    meta: AQI_META,
  };
}
