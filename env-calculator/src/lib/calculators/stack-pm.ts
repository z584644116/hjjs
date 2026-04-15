import { CalculationError, requireNonNegative, requirePositive, roundTo } from './common';

export interface StackPmInput {
  particleMassMg: number;
  standardDryGasVolumeL: number;
}

export interface StackPmResult {
  concentrationMgM3: number;
}

/**
 * 固定污染源颗粒物浓度。
 * m: mg, Vnd: L, C: mg/m³。Vnd 从 L 换算到 m³。
 */
export function calculateStackPmConcentration(input: StackPmInput): StackPmResult | CalculationError {
  const massError = requireNonNegative(input.particleMassMg, '捕集颗粒物质量');
  if (massError) return massError;

  const volumeError = requirePositive(input.standardDryGasVolumeL, '标准干烟气采样体积');
  if (volumeError) return volumeError;

  return {
    concentrationMgM3: roundTo((input.particleMassMg / input.standardDryGasVolumeL) * 1000, 4),
  };
}
