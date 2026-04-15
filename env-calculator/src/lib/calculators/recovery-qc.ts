import { CalculationError, requirePositive, roundTo } from './common';

export interface SpikeRecoveryInput {
  originalConcentration: number;
  spikedConcentration: number;
  spikeAmount: number;
}

export interface SpikeRecoveryResult {
  recoveredAmount: number;
  recoveryPercent: number;
}

export interface RsdResult {
  average: number;
  standardDeviation: number;
  rsdPercent: number;
}

/**
 * 加标回收率 = (加标样测定值 - 原样测定值) / 加标量 × 100%。
 */
export function calculateSpikeRecovery(input: SpikeRecoveryInput): SpikeRecoveryResult | CalculationError {
  if (!Number.isFinite(input.originalConcentration)) return { error: '请输入有效的原样测定值' };
  if (!Number.isFinite(input.spikedConcentration)) return { error: '请输入有效的加标样测定值' };

  const spikeError = requirePositive(input.spikeAmount, '加标量');
  if (spikeError) return spikeError;

  const recoveredAmount = input.spikedConcentration - input.originalConcentration;

  return {
    recoveredAmount: roundTo(recoveredAmount, 6),
    recoveryPercent: roundTo((recoveredAmount / input.spikeAmount) * 100, 2),
  };
}

/**
 * 相对标准偏差 RSD = 标准偏差 / 平均值 × 100%。
 */
export function calculateRsd(values: number[]): RsdResult | CalculationError {
  const validValues = values.filter(Number.isFinite);
  if (validValues.length < 2) return { error: 'RSD 至少需要 2 个有效测定值' };

  const average = validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
  if (average === 0) return { error: '测定值平均值不能为 0' };

  const variance = validValues.reduce((sum, value) => sum + (value - average) ** 2, 0) / (validValues.length - 1);
  const standardDeviation = Math.sqrt(variance);

  return {
    average: roundTo(average, 6),
    standardDeviation: roundTo(standardDeviation, 6),
    rsdPercent: roundTo((standardDeviation / average) * 100, 2),
  };
}
