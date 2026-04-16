import { CalculationError, requireNonNegative, requirePositive, roundTo } from './common';

export interface MdlManualInput {
  standardDeviation: number;
  tValue: number;
}

export interface MdlManualResult {
  methodDetectionLimit: number;
}

export interface MdlReplicateResult {
  count: number;
  mean: number;
  standardDeviation: number;
  tValue: number;
  methodDetectionLimit: number;
  confidenceLevel: number;
  confidenceTValue: number;
  confidenceLower: number;
  confidenceUpper: number;
  min: number;
  max: number;
  range: number;
}

const MDL_T_99_ONE_SIDED: Record<number, number> = {
  6: 3.143,
  7: 2.998,
  8: 2.896,
  9: 2.821,
  10: 2.764,
  11: 2.718,
  12: 2.681,
  13: 2.65,
  14: 2.624,
  15: 2.602,
  16: 2.583,
  17: 2.567,
  18: 2.552,
  19: 2.539,
};

const T_95_TWO_SIDED: Record<number, number> = {
  6: 2.447,
  7: 2.365,
  8: 2.306,
  9: 2.262,
  10: 2.228,
  11: 2.201,
  12: 2.179,
  13: 2.16,
  14: 2.145,
  15: 2.131,
  16: 2.12,
  17: 2.11,
  18: 2.101,
  19: 2.093,
};

export function getMdlTValue(sampleCount: number): number {
  return MDL_T_99_ONE_SIDED[sampleCount - 1] ?? 3.143;
}

export function getConfidenceTValue(sampleCount: number): number {
  return T_95_TWO_SIDED[sampleCount - 1] ?? 2.447;
}

export function calculateMethodDetectionLimit(input: MdlManualInput): MdlManualResult | CalculationError {
  const sdError = requireNonNegative(input.standardDeviation, '重复测定标准差');
  if (sdError) return sdError;

  const tError = requirePositive(input.tValue, 't 分布值');
  if (tError) return tError;

  return {
    methodDetectionLimit: roundTo(input.standardDeviation * input.tValue, 6),
  };
}

export function calculateMdlFromReplicates(values: number[]): MdlReplicateResult | CalculationError {
  const validValues = values.filter(Number.isFinite);
  if (validValues.length < 7) return { error: 'MDL 至少需要 7 个有效平行样数据' };
  if (validValues.length > 20) return { error: 'MDL 原始数据最多支持 20 个有效值' };

  const count = validValues.length;
  const meanRaw = validValues.reduce((sum, value) => sum + value, 0) / count;
  const variance = validValues.reduce((sum, value) => sum + (value - meanRaw) ** 2, 0) / (count - 1);
  const standardDeviationRaw = Math.sqrt(variance);
  const tValue = getMdlTValue(count);
  const confidenceTValue = getConfidenceTValue(count);
  const confidenceMargin = confidenceTValue * standardDeviationRaw / Math.sqrt(count);
  const minRaw = Math.min(...validValues);
  const maxRaw = Math.max(...validValues);

  return {
    count,
    mean: roundTo(meanRaw, 6),
    standardDeviation: roundTo(standardDeviationRaw, 6),
    tValue,
    methodDetectionLimit: roundTo(tValue * standardDeviationRaw, 6),
    confidenceLevel: 95,
    confidenceTValue,
    confidenceLower: roundTo(meanRaw - confidenceMargin, 6),
    confidenceUpper: roundTo(meanRaw + confidenceMargin, 6),
    min: roundTo(minRaw, 6),
    max: roundTo(maxRaw, 6),
    range: roundTo(maxRaw - minRaw, 6),
  };
}
