import { CalculationError, requireNonNegative, requirePositive, roundTo } from './common';

export interface PmConcentrationInput {
  weightAfterMg: number;
  weightBeforeMg: number;
  standardVolumeM3: number;
}

export interface PmConcentrationResult {
  massMg: number;
  concentrationMgM3: number;
}

/**
 * 环境空气 PM10/PM2.5 质量浓度。
 * w2/w1: mg, V0: m³, ρ: mg/m³。
 * 需求文档控件单位已将滤膜重量限定为 mg，因此此处直接用 mg / m³。
 */
export function calculatePmConcentration(input: PmConcentrationInput): PmConcentrationResult | CalculationError {
  const afterError = requireNonNegative(input.weightAfterMg, '采样后滤膜重量');
  if (afterError) return afterError;

  const beforeError = requireNonNegative(input.weightBeforeMg, '采样前滤膜重量');
  if (beforeError) return beforeError;

  const volumeError = requirePositive(input.standardVolumeM3, '标准状况采样体积');
  if (volumeError) return volumeError;

  const massMg = input.weightAfterMg - input.weightBeforeMg;
  if (massMg < 0) return { error: '采样后滤膜重量不能小于采样前滤膜重量' };

  return {
    massMg: roundTo(massMg, 4),
    concentrationMgM3: roundTo(massMg / input.standardVolumeM3, 4),
  };
}
