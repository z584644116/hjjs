import { CalculationError, requireNonNegative, requirePositive, roundTo } from './common';

export interface SoilPrepLossInput {
  beforeWeightG: number;
  afterWeightG: number;
}

export interface SoilPrepLossResult {
  lossWeightG: number;
  lossPercent: number;
}

export interface SoilSieveRateInput {
  passedWeightG: number;
  totalWeightG: number;
}

export interface SoilSieveRateResult {
  sievePercent: number;
}

export function calculateSoilPrepLoss(input: SoilPrepLossInput): SoilPrepLossResult | CalculationError {
  const beforeError = requirePositive(input.beforeWeightG, '制备前重量');
  if (beforeError) return beforeError;

  const afterError = requireNonNegative(input.afterWeightG, '制备后重量');
  if (afterError) return afterError;

  if (input.afterWeightG > input.beforeWeightG) return { error: '制备后重量不能大于制备前重量' };

  const lossWeightG = input.beforeWeightG - input.afterWeightG;

  return {
    lossWeightG: roundTo(lossWeightG, 4),
    lossPercent: roundTo((lossWeightG / input.beforeWeightG) * 100, 2),
  };
}

export function calculateSoilSieveRate(input: SoilSieveRateInput): SoilSieveRateResult | CalculationError {
  const passedError = requireNonNegative(input.passedWeightG, '过筛重量');
  if (passedError) return passedError;

  const totalError = requirePositive(input.totalWeightG, '总重量');
  if (totalError) return totalError;

  if (input.passedWeightG > input.totalWeightG) return { error: '过筛重量不能大于总重量' };

  return {
    sievePercent: roundTo((input.passedWeightG / input.totalWeightG) * 100, 2),
  };
}
