import { CalculationError, requireNonNegative, requirePositive, roundTo } from './common';
import { CalculationWarning, FormulaMeta } from './types';

// =========================================================================
// 1. 等效连续 A 声级 Leq
// =========================================================================

export type LeqMode = 'equal-interval' | 'weighted-duration';

export interface LeqEntry {
  /** 单次声级 Li (dB(A)) */
  level: number;
  /** 对应持续时间 ti，weighted-duration 模式必填 */
  durationSeconds?: number;
}

export interface LeqResult {
  mode: LeqMode;
  count: number;
  leq: number;
  lmin: number;
  lmax: number;
  lrange: number;
  warnings: CalculationWarning[];
  meta: FormulaMeta;
}

const LEQ_META: FormulaMeta = {
  formulaName: '等效连续 A 声级 Leq',
  formulaText: '等间隔：Leq=10·lg(1/n·Σ10^(Li/10))；加权：Leq=10·lg(Σti·10^(Li/10)/Σti)',
  formulaType: 'standard-method',
  resultLevel: 'internal-check',
  references: ['GB 3096', 'GB 12348', 'GB 12523'],
  applicability: ['环境噪声/厂界噪声/施工噪声等效声级统计'],
  limitations: [
    '等间隔模式假设每个读数的时间权重相等，不适合波动较大的连续测量',
    '加权模式必须提供每段持续时间，且总时长 > 0',
  ],
};

/**
 * 等效连续 A 声级。
 * - equal-interval：Leq = 10·lg(1/n · Σ 10^(Li/10))
 * - weighted-duration：Leq = 10·lg(Σ ti·10^(Li/10) / Σ ti)
 */
export function calculateLeq(
  values: number[] | LeqEntry[],
  mode: LeqMode = 'equal-interval',
): LeqResult | CalculationError {
  const warnings: CalculationWarning[] = [];

  // 兼容旧签名：直接传 number[] 视作等间隔。
  const entries: LeqEntry[] = Array.isArray(values) && values.length > 0 && typeof values[0] === 'object'
    ? (values as LeqEntry[])
    : (values as number[]).map((v) => ({ level: v }));

  const validEntries = entries.filter((e) => Number.isFinite(e.level));
  if (validEntries.length < 1) return { error: '至少需要 1 个有效声级读数' };

  let leq: number;

  if (mode === 'weighted-duration') {
    const withDuration = validEntries.filter(
      (e) => Number.isFinite(e.durationSeconds) && (e.durationSeconds ?? 0) > 0,
    );
    if (withDuration.length === 0) {
      return { error: 'weighted-duration 模式需要每条记录提供 > 0 的 durationSeconds' };
    }
    if (withDuration.length < validEntries.length) {
      warnings.push({
        level: 'warning',
        message: `${validEntries.length - withDuration.length} 条记录缺少有效时长，已从加权平均中忽略`,
      });
    }
    const totalT = withDuration.reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
    const sumEnergy = withDuration.reduce(
      (s, e) => s + (e.durationSeconds ?? 0) * Math.pow(10, e.level / 10),
      0,
    );
    leq = 10 * Math.log10(sumEnergy / totalT);
  } else {
    const sumEnergy = validEntries.reduce((s, e) => s + Math.pow(10, e.level / 10), 0);
    leq = 10 * Math.log10(sumEnergy / validEntries.length);
  }

  const levels = validEntries.map((e) => e.level);
  const lmin = Math.min(...levels);
  const lmax = Math.max(...levels);

  if (lmax - lmin > 20) {
    warnings.push({
      level: 'info',
      message: `声级最大最小差 ${(lmax - lmin).toFixed(1)} dB 较大`,
      suggestion: '波动较大时等间隔 Leq 可能不代表能量平均，建议改用 weighted-duration 或重新采样',
    });
  }

  return {
    mode,
    count: validEntries.length,
    leq: roundTo(leq, 1),
    lmin: roundTo(lmin, 1),
    lmax: roundTo(lmax, 1),
    lrange: roundTo(lmax - lmin, 1),
    warnings,
    meta: LEQ_META,
  };
}

// =========================================================================
// 2. 统计声级 L10 / L50 / L90
// =========================================================================

export interface StatLevelsResult {
  count: number;
  l10: number;
  l50: number;
  l90: number;
  lmin: number;
  lmax: number;
}

/**
 * 统计声级:L_x = "x% 的测量时间内声级超过此值"。
 * 工程实践中,按读数由高到低排列,取第 n·x% 位的值作为 L_x(百分位近似)。
 */
export function calculateStatLevels(values: number[]): StatLevelsResult | CalculationError {
  const valid = values.filter((x) => Number.isFinite(x));
  if (valid.length < 3) return { error: '统计声级至少需要 3 个读数,建议 ≥100 个' };

  const sorted = [...valid].sort((a, b) => a - b);
  const percentile = (p: number) => {
    const pos = ((100 - p) / 100) * (sorted.length - 1);
    const lower = Math.floor(pos);
    const upper = Math.ceil(pos);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower);
  };

  return {
    count: valid.length,
    l10: roundTo(percentile(10), 1),
    l50: roundTo(percentile(50), 1),
    l90: roundTo(percentile(90), 1),
    lmin: roundTo(sorted[0], 1),
    lmax: roundTo(sorted[sorted.length - 1], 1),
  };
}

// =========================================================================
// 3. 多声源叠加
// =========================================================================

export interface SoundSumResult {
  count: number;
  total: number;
  maxSource: number;
}

/**
 * 多声源叠加:Ltotal = 10·lg(Σ 10^(Li/10))。
 */
export function calculateSoundSum(values: number[]): SoundSumResult | CalculationError {
  const valid = values.filter((x) => Number.isFinite(x));
  if (valid.length < 1) return { error: '至少需要 1 个声源声级' };

  const sumEnergy = valid.reduce((s, l) => s + Math.pow(10, l / 10), 0);
  const total = 10 * Math.log10(sumEnergy);
  const maxSource = Math.max(...valid);

  return {
    count: valid.length,
    total: roundTo(total, 1),
    maxSource: roundTo(maxSource, 1),
  };
}

// =========================================================================
// 4. 距离衰减：点声源 / 线声源 / 未知
// =========================================================================

export type NoiseSourceType = 'point' | 'line' | 'unknown';

export interface DistanceDecayInput {
  sourceLevel: number;
  r1: number;
  r2: number;
  sourceType?: NoiseSourceType;
}

export interface DistanceDecayResult {
  sourceType: NoiseSourceType;
  decay: number;
  targetLevel: number;
  formulaText: string;
  warnings: CalculationWarning[];
}

/**
 * 距离衰减：
 *   点声源 ΔL = 20·lg(r2/r1)
 *   线声源 ΔL = 10·lg(r2/r1)
 *   unknown：使用点声源近似，但要求用户确认声源性质
 */
export function calculateDistanceDecay(input: DistanceDecayInput): DistanceDecayResult | CalculationError {
  const lErr = requireNonNegative(input.sourceLevel, '源声级');
  if (lErr) return lErr;
  const r1Err = requirePositive(input.r1, '参考距离 r1');
  if (r1Err) return r1Err;
  const r2Err = requirePositive(input.r2, '目标距离 r2');
  if (r2Err) return r2Err;

  const sourceType: NoiseSourceType = input.sourceType ?? 'unknown';
  const warnings: CalculationWarning[] = [];
  let coefficient = 20;
  let formulaText = 'ΔL = 20·lg(r2/r1) (点声源)';

  if (sourceType === 'line') {
    coefficient = 10;
    formulaText = 'ΔL = 10·lg(r2/r1) (线声源近似)';
  } else if (sourceType === 'unknown') {
    warnings.push({
      level: 'warning',
      message: '未指定声源类型，默认按点声源计算',
      suggestion: '道路/铁路类线声源应选择 line 模式',
    });
  }

  warnings.push({
    level: 'info',
    message: '距离衰减公式为理想自由场近似',
    suggestion: '实际室外传播还受地面吸收、屏障、气象等影响，必要时按 GB/T 3222 等进行现场校核',
  });

  const decay = coefficient * Math.log10(input.r2 / input.r1);
  return {
    sourceType,
    decay: roundTo(decay, 1),
    targetLevel: roundTo(input.sourceLevel - decay, 1),
    formulaText,
    warnings,
  };
}

// =========================================================================
// 5. 背景值修正(GB 12348 / GB 3096)
// =========================================================================

export interface BackgroundCorrectionInput {
  measured: number;
  background: number;
}

export type BackgroundCorrectionRule = 'invalid' | 'logarithmic' | 'no-correction';

export interface BackgroundCorrectionResult {
  delta: number;
  corrected: number | null;
  rule: BackgroundCorrectionRule;
  ruleText: string;
  warnings: CalculationWarning[];
}

/**
 * 背景值修正(GB 12348):
 *   ΔL = L_测 - L_背
 *   ΔL < 3 dB：测量不可靠，需要降低背景后重测
 *   3 ≤ ΔL < 10 dB：对数修正 L_源 = 10·lg(10^(L_测/10) - 10^(L_背/10))
 *   ΔL ≥ 10 dB：无需修正，测量值即为声源值
 */
export function calculateBackgroundCorrection(input: BackgroundCorrectionInput): BackgroundCorrectionResult | CalculationError {
  const mErr = requireNonNegative(input.measured, '测量声级');
  if (mErr) return mErr;
  const bErr = requireNonNegative(input.background, '背景声级');
  if (bErr) return bErr;
  if (input.measured < input.background) {
    return { error: '测量声级必须大于等于背景声级' };
  }

  const delta = input.measured - input.background;
  const warnings: CalculationWarning[] = [];

  if (delta < 3) {
    warnings.push({
      level: 'danger',
      message: `测量值与背景差 ${delta.toFixed(1)} dB < 3 dB`,
      suggestion: '背景影响过大，应先降低背景（停机/换时段）后重测；不应强行修正',
    });
    return {
      delta: roundTo(delta, 1),
      corrected: null,
      rule: 'invalid',
      ruleText: 'ΔL < 3 dB，测量不可靠，应在背景声级降低后重测。',
      warnings,
    };
  }

  if (delta >= 10) {
    return {
      delta: roundTo(delta, 1),
      corrected: roundTo(input.measured, 1),
      rule: 'no-correction',
      ruleText: 'ΔL ≥ 10 dB，无需修正，测量值即为声源声级。',
      warnings,
    };
  }

  const sourceLevel = 10 * Math.log10(
    Math.pow(10, input.measured / 10) - Math.pow(10, input.background / 10),
  );

  warnings.push({
    level: 'info',
    message: `3 ≤ ΔL(${delta.toFixed(1)}) < 10 dB，按对数修正公式计算`,
    suggestion: '建议保留原始读数与背景读数，便于审核',
  });

  return {
    delta: roundTo(delta, 1),
    corrected: roundTo(sourceLevel, 1),
    rule: 'logarithmic',
    ruleText: `ΔL = ${delta.toFixed(1)} dB，使用对数修正公式。`,
    warnings,
  };
}

// =========================================================================
// 6. Sabine 混响时间
// =========================================================================

export interface SabineInput {
  volume: number;
  absorption: number;
}

export interface SabineResult {
  t60: number;
  equivalentArea: number;
}

/**
 * Sabine 混响时间公式:T60 = 0.161·V/A
 */
export function calculateSabineReverb(input: SabineInput): SabineResult | CalculationError {
  const vErr = requirePositive(input.volume, '房间体积');
  if (vErr) return vErr;
  const aErr = requirePositive(input.absorption, '总吸声量');
  if (aErr) return aErr;

  return {
    t60: roundTo(0.161 * input.volume / input.absorption, 2),
    equivalentArea: roundTo(input.absorption, 2),
  };
}

// =========================================================================
// 7. 声屏障 Maekawa 插入损失(Kurze-Anderson 简化)
// =========================================================================

export interface BarrierInput {
  pathDifference: number;
  frequency: number;
}

export interface BarrierResult {
  fresnelN: number;
  insertionLoss: number;
}

/**
 * 声屏障 Maekawa-Kurze-Anderson 插入损失。
 */
export function calculateBarrierLoss(input: BarrierInput): BarrierResult | CalculationError {
  const dErr = requireNonNegative(input.pathDifference, '衍射程差');
  if (dErr) return dErr;
  const fErr = requirePositive(input.frequency, '中心频率');
  if (fErr) return fErr;

  const c = 340;
  const lambda = c / input.frequency;
  const N = 2 * input.pathDifference / lambda;

  let il: number;
  if (N <= -0.1924) {
    il = 0;
  } else if (N >= 12.5) {
    il = 24;
  } else {
    const absN = Math.abs(N);
    const x = Math.sqrt(2 * Math.PI * absN);
    let ratio: number;
    if (N > 0) {
      const tanhX = Math.tanh(x);
      ratio = tanhX === 0 ? 1 : x / tanhX;
    } else {
      const tanX = Math.tan(x);
      ratio = tanX <= 0 ? 0 : x / tanX;
    }
    il = ratio > 0 ? 5 + 20 * Math.log10(ratio) : 0;
    if (il < 0) il = 0;
    if (il > 24) il = 24;
  }

  return {
    fresnelN: roundTo(N, 3),
    insertionLoss: roundTo(il, 1),
  };
}
