import { CalculationError, requirePositive, roundTo } from './common';

export interface SampleSizeInput {
  standardDeviation: number;
  allowableError: number;
  confidenceCoefficient?: number;
}

export interface SampleSizeResult {
  estimatedSampleCount: number;
  rawSampleCount: number;
}

/**
 * 采样方案统计样本数 n = (t × s / E)^2。
 * s 与 E 单位保持一致。
 */
export function calculateSampleSize(input: SampleSizeInput): SampleSizeResult | CalculationError {
  const sdError = requirePositive(input.standardDeviation, '标准差');
  if (sdError) return sdError;

  const errorError = requirePositive(input.allowableError, '允许误差');
  if (errorError) return errorError;

  const confidenceCoefficient = input.confidenceCoefficient ?? 1.96;
  const coefficientError = requirePositive(confidenceCoefficient, '置信系数');
  if (coefficientError) return coefficientError;

  const rawSampleCount = (confidenceCoefficient * input.standardDeviation / input.allowableError) ** 2;

  return {
    rawSampleCount: roundTo(rawSampleCount, 3),
    estimatedSampleCount: Math.ceil(rawSampleCount),
  };
}
