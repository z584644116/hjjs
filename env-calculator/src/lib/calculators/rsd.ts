import { CalculationError, roundTo } from './common';

export interface RsdResult {
  count: number;
  average: number;
  standardDeviation: number;
  rsdPercent: number;
}

/**
 * 相对标准偏差 RSD = 样本标准偏差 / |平均值| × 100%。
 */
export function calculateRsd(values: number[]): RsdResult | CalculationError {
  const validValues = values.filter(Number.isFinite);
  if (validValues.length < 2) return { error: 'RSD 至少需要 2 个有效测定值' };

  const average = validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
  if (average === 0) return { error: '测定值平均值不能为 0' };

  const variance = validValues.reduce((sum, value) => sum + (value - average) ** 2, 0) / (validValues.length - 1);
  const standardDeviation = Math.sqrt(variance);

  return {
    count: validValues.length,
    average: roundTo(average, 6),
    standardDeviation: roundTo(standardDeviation, 6),
    rsdPercent: roundTo((standardDeviation / Math.abs(average)) * 100, 2),
  };
}
