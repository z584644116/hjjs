import { CalculationError, requireNonNegative, requirePositive, roundTo } from './common';

export interface TitrationAsCaco3Input {
  titrantVolumeMl: number;
  blankVolumeMl?: number;
  titrantConcentrationMolL: number;
  sampleVolumeMl: number;
}

export interface TitrationAsCaco3Result {
  netTitrantVolumeMl: number;
  concentrationMgLAsCaco3: number;
}

/**
 * 滴定法碱度/硬度，以 CaCO3 计。
 * 结果 mg/L = (V - V0) × C × 50000 / Vs。
 */
export function calculateTitrationAsCaco3(input: TitrationAsCaco3Input): TitrationAsCaco3Result | CalculationError {
  const volumeError = requireNonNegative(input.titrantVolumeMl, '滴定体积');
  if (volumeError) return volumeError;

  const blankVolumeMl = input.blankVolumeMl ?? 0;
  const blankError = requireNonNegative(blankVolumeMl, '空白滴定体积');
  if (blankError) return blankError;

  const concentrationError = requirePositive(input.titrantConcentrationMolL, '滴定液浓度');
  if (concentrationError) return concentrationError;

  const sampleError = requirePositive(input.sampleVolumeMl, '样品体积');
  if (sampleError) return sampleError;

  const netTitrantVolumeMl = input.titrantVolumeMl - blankVolumeMl;
  if (netTitrantVolumeMl < 0) return { error: '滴定体积不能小于空白滴定体积' };

  return {
    netTitrantVolumeMl: roundTo(netTitrantVolumeMl, 3),
    concentrationMgLAsCaco3: roundTo((netTitrantVolumeMl * input.titrantConcentrationMolL * 50000) / input.sampleVolumeMl, 3),
  };
}
