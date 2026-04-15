import { CalculationError, requirePositive, roundTo } from './common';

export interface SoilMoistureInput {
  wetWeightG: number;
  dryWeightG: number;
}

export interface SoilMoistureResult {
  waterWeightG: number;
  moisturePercent: number;
}

/**
 * 土壤质量含水率 = (湿重 - 干重) / 干重 × 100%。
 */
export function calculateSoilMoisture(input: SoilMoistureInput): SoilMoistureResult | CalculationError {
  const wetError = requirePositive(input.wetWeightG, '湿重');
  if (wetError) return wetError;

  const dryError = requirePositive(input.dryWeightG, '干重');
  if (dryError) return dryError;

  if (input.wetWeightG < input.dryWeightG) return { error: '湿重不能小于干重' };

  const waterWeightG = input.wetWeightG - input.dryWeightG;

  return {
    waterWeightG: roundTo(waterWeightG, 4),
    moisturePercent: roundTo((waterWeightG / input.dryWeightG) * 100, 2),
  };
}
