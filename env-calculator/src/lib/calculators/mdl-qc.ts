import { CalculationError, requireNonNegative, requirePositive, roundTo } from './common';

export interface MdlInput {
  standardDeviation: number;
  tValue: number;
}

export interface MdlResult {
  methodDetectionLimit: number;
}

/**
 * 方法检出限 MDL = t × s。
 * s 与浓度单位一致，t 无量纲，MDL 与 s 单位一致。
 */
export function calculateMethodDetectionLimit(input: MdlInput): MdlResult | CalculationError {
  const sdError = requireNonNegative(input.standardDeviation, '重复测定标准差');
  if (sdError) return sdError;

  const tError = requirePositive(input.tValue, 't 分布值');
  if (tError) return tError;

  return {
    methodDetectionLimit: roundTo(input.standardDeviation * input.tValue, 6),
  };
}
