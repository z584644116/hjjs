import { CalculationError, EPSILON, requireFinite, requireNonNegative, requirePositive, roundTo } from './common';
import { CalculationWarning, FormulaMeta } from './types';

// =========================================================================
// 类型定义
// =========================================================================

export type RecoveryInputMode = 'concentration' | 'volume-dose';

/**
 * 浓度模式（默认）：直接输入原样与加标样测定值及加标量（均为浓度）。
 *   回收率 = (加标样 - 原样) / 加标量 × 100%
 */
export interface RecoveryConcentrationInput {
  mode?: 'concentration';
  /** 原样测定值（浓度，例如 mg/L） */
  originalConcentration: number;
  /** 加标样测定值（浓度，与原样同单位） */
  spikedConcentration: number;
  /** 加标量（浓度增量，与原样同单位）*/
  spikeAmount: number;
}

/**
 * 体积模式：样品浓度 c0、样品体积 V0；加标液浓度 cs、加标液体积 Vs；加标后混合测定浓度 c1。
 *   理论加标增量 = cs × Vs / (V0 + Vs) （按加标后总体积计算）
 *   测得增量   = c1 - c0 × V0 / (V0 + Vs)（稀释后原样贡献）
 *   简化：当 Vs ≪ V0 时等价于浓度模式
 */
export interface RecoveryVolumeDoseInput {
  mode: 'volume-dose';
  originalConcentration: number;   // c0
  sampleVolumeMl: number;           // V0
  spikeStandardConcentration: number; // cs
  spikeVolumeMl: number;             // Vs
  measuredMixedConcentration: number; // c1
}

export type SpikeRecoveryInput = RecoveryConcentrationInput | RecoveryVolumeDoseInput;

export interface SpikeRecoveryResult {
  mode: RecoveryInputMode;
  /** 测得增量（加标样测值 − 原样贡献） */
  recoveredAmount: number;
  /** 理论增量（加标引入的浓度） */
  expectedIncrement: number;
  /** 回收率 % */
  recoveryPercent: number;
  /** 是否落在常规合格范围(默认 50%~150%)内 */
  isWithinStandardRange: boolean;
  standardRange: { min: number; max: number };
  warnings: CalculationWarning[];
  meta: FormulaMeta;
}

// =========================================================================
// 辅助
// =========================================================================

const DEFAULT_STANDARD_RANGE = { min: 50, max: 150 };

const RECOVERY_META: FormulaMeta = {
  formulaName: '加标回收率',
  formulaText: '回收率(%) = (测得加标增量 / 加标引入增量) × 100%',
  formulaType: 'quality-control',
  resultLevel: 'internal-check',
  references: ['HJ 168-2020', 'HJ 91.1-2019', '国家环境监测总站《地表水监测技术规范》'],
  applicability: ['水/大气/土壤方法准确度质控', '基体加标分析'],
  limitations: [
    '当加标量远小于原样浓度时，相对误差放大',
    '基体效应较强时不宜单独以回收率作为准确度判据',
    '有机物/痕量金属需考虑损失、吸附、挥发等影响',
  ],
};

function normalize(input: SpikeRecoveryInput): RecoveryConcentrationInput | RecoveryVolumeDoseInput {
  return { ...input, mode: input.mode ?? 'concentration' } as RecoveryConcentrationInput | RecoveryVolumeDoseInput;
}

function pushCommonWarnings(warnings: CalculationWarning[], params: {
  recoveryPercent: number;
  expectedIncrement: number;
  recoveredAmount: number;
  originalConcentration: number;
  standardRange: { min: number; max: number };
}) {
  const { recoveryPercent, expectedIncrement, recoveredAmount, originalConcentration, standardRange } = params;

  // 加标样 < 原样 (recovered < 0)
  if (recoveredAmount < 0) {
    warnings.push({
      level: 'danger',
      message: `加标样测定值低于原样测定值，测得增量为负 (${roundTo(recoveredAmount, 4)})`,
      suggestion: '请检查加标操作、混匀、取样体积或是否存在基体抑制/分析过程损失',
    });
  }

  if (recoveryPercent < 0) {
    warnings.push({
      level: 'danger',
      message: `回收率为负值(${roundTo(recoveryPercent, 2)}%)，物理上不合理`,
      suggestion: '需复核加标操作、空白扣除和仪器响应，不得直接报出',
    });
  } else if (recoveryPercent > 200) {
    warnings.push({
      level: 'danger',
      message: `回收率 ${roundTo(recoveryPercent, 2)}% 明显偏高`,
      suggestion: '可能存在加标液配制错误、样品污染或背景干扰，请复核',
    });
  }

  // 加标量太小：建议加标量约为原样的 0.5~2 倍
  if (expectedIncrement > 0 && originalConcentration > 0) {
    const ratio = expectedIncrement / originalConcentration;
    if (ratio < 0.3) {
      warnings.push({
        level: 'warning',
        message: `加标引入浓度仅为原样的 ${roundTo(ratio * 100, 1)}%，偏小`,
        suggestion: '建议加标引入浓度约为原样浓度的 0.5~2 倍，以降低相对误差',
      });
    } else if (ratio > 3) {
      warnings.push({
        level: 'info',
        message: `加标引入浓度约为原样的 ${roundTo(ratio * 100, 0)}%，偏大`,
        suggestion: '加标量过大时，加标样浓度可能超出工作曲线范围',
      });
    }
  }

  // 合格范围判定
  if (recoveryPercent >= 0 && recoveryPercent <= 200) {
    if (recoveryPercent < standardRange.min) {
      warnings.push({
        level: 'warning',
        message: `回收率 ${roundTo(recoveryPercent, 2)}% 低于常规合格下限 ${standardRange.min}%`,
        suggestion: '可能存在基体抑制/损失，建议重做或采用基体加标回收校正',
      });
    } else if (recoveryPercent > standardRange.max) {
      warnings.push({
        level: 'warning',
        message: `回收率 ${roundTo(recoveryPercent, 2)}% 高于常规合格上限 ${standardRange.max}%`,
        suggestion: '检查加标液纯度/配制、样品干扰及仪器校准',
      });
    }
  }
}

// =========================================================================
// 主函数
// =========================================================================

/**
 * 加标回收率计算（支持浓度模式与体积-加标液模式）。
 * @param input 输入
 * @param standardRange 自定义合格范围，默认 50~150%
 */
export function calculateSpikeRecovery(
  input: SpikeRecoveryInput,
  standardRange: { min: number; max: number } = DEFAULT_STANDARD_RANGE,
): SpikeRecoveryResult | CalculationError {
  const norm = normalize(input);
  const warnings: CalculationWarning[] = [];

  // ---------- 体积-加标液模式 ----------
  if (norm.mode === 'volume-dose') {
    const p = norm;
    const errV0 = requirePositive(p.sampleVolumeMl, '样品体积 V₀');
    if (errV0) return errV0;
    const errVs = requirePositive(p.spikeVolumeMl, '加标液体积 Vₛ');
    if (errVs) return errVs;
    const errCs = requirePositive(p.spikeStandardConcentration, '加标液浓度 cₛ');
    if (errCs) return errCs;
    const errC0 = requireFinite(p.originalConcentration, '原样测定值 c₀');
    if (errC0) return errC0;
    const errC1 = requireFinite(p.measuredMixedConcentration, '加标样测定值 c₁');
    if (errC1) return errC1;
    if (p.originalConcentration < 0) {
      warnings.push({ level: 'warning', message: '原样测定值为负，可能低于方法检出限，结果仅供参考' });
    }

    const totalVol = p.sampleVolumeMl + p.spikeVolumeMl;
    const expectedIncrement = (p.spikeStandardConcentration * p.spikeVolumeMl) / totalVol;
    const originalContribution = (p.originalConcentration * p.sampleVolumeMl) / totalVol;
    const recoveredAmount = p.measuredMixedConcentration - originalContribution;

    if (Math.abs(expectedIncrement) < EPSILON) {
      return { error: '理论加标增量接近 0，无法计算回收率' };
    }

    // 体积比警告
    const volumeRatio = p.spikeVolumeMl / p.sampleVolumeMl;
    if (volumeRatio > 0.1) {
      warnings.push({
        level: 'info',
        message: `加标液体积占样品体积 ${roundTo(volumeRatio * 100, 1)}%，已按稀释计算`,
        suggestion: '一般建议 Vₛ/V₀ ≤ 1/10 以减小体积效应',
      });
    }

    const recoveryPercent = (recoveredAmount / expectedIncrement) * 100;
    const isWithinStandardRange = recoveryPercent >= standardRange.min && recoveryPercent <= standardRange.max;

    pushCommonWarnings(warnings, {
      recoveryPercent,
      expectedIncrement,
      recoveredAmount,
      originalConcentration: p.originalConcentration,
      standardRange,
    });

    return {
      mode: 'volume-dose',
      recoveredAmount: roundTo(recoveredAmount, 6),
      expectedIncrement: roundTo(expectedIncrement, 6),
      recoveryPercent: roundTo(recoveryPercent, 2),
      isWithinStandardRange,
      standardRange,
      warnings,
      meta: RECOVERY_META,
    };
  }

  // ---------- 浓度模式 ----------
  const p = norm;
  const errOriginal = requireFinite(p.originalConcentration, '原样测定值');
  if (errOriginal) return errOriginal;
  const errSpiked = requireFinite(p.spikedConcentration, '加标样测定值');
  if (errSpiked) return errSpiked;
  const errAmount = requireNonNegative(p.spikeAmount, '加标量');
  if (errAmount) return errAmount;
  if (p.spikeAmount <= EPSILON) {
    return { error: '加标量必须大于 0' };
  }
  if (p.originalConcentration < 0) {
    warnings.push({ level: 'warning', message: '原样测定值为负，可能低于方法检出限，结果仅供参考' });
  }

  const recoveredAmount = p.spikedConcentration - p.originalConcentration;
  const expectedIncrement = p.spikeAmount;
  const recoveryPercent = (recoveredAmount / expectedIncrement) * 100;
  const isWithinStandardRange = recoveryPercent >= standardRange.min && recoveryPercent <= standardRange.max;

  pushCommonWarnings(warnings, {
    recoveryPercent,
    expectedIncrement,
    recoveredAmount,
    originalConcentration: p.originalConcentration,
    standardRange,
  });

  return {
    mode: 'concentration',
    recoveredAmount: roundTo(recoveredAmount, 6),
    expectedIncrement: roundTo(expectedIncrement, 6),
    recoveryPercent: roundTo(recoveryPercent, 2),
    isWithinStandardRange,
    standardRange,
    warnings,
    meta: RECOVERY_META,
  };
}
