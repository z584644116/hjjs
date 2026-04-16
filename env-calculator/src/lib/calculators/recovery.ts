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
