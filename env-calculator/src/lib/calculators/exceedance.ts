import { CalculationError, requireNonNegative, requirePositive, roundTo } from './common';

export interface ExceedanceInput {
  concentration: number;
  standardLimit: number;
}

export interface ExceedanceResult {
  standardIndex: number;
  exceedanceMultiple: number;
  isExceeded: boolean;
}

/**
 * 污染物超标倍数。
 * 标准指数 = 实测浓度 / 标准限值；超标倍数 = 标准指数 - 1。
 */
export function calculateExceedance(input: ExceedanceInput): ExceedanceResult | CalculationError {
  const concentrationError = requireNonNegative(input.concentration, '实测浓度');
  if (concentrationError) return concentrationError;

  const limitError = requirePositive(input.standardLimit, '标准限值');
  if (limitError) return limitError;

  const standardIndex = input.concentration / input.standardLimit;
  const exceedanceMultiple = Math.max(0, standardIndex - 1);

  return {
    standardIndex: roundTo(standardIndex, 4),
    exceedanceMultiple: roundTo(exceedanceMultiple, 4),
    isExceeded: standardIndex > 1,
  };
}
