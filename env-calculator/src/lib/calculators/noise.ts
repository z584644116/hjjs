import { CalculationError, requireNonNegative, requirePositive, roundTo } from './common';

// =========================================================================
// 1. 等效连续 A 声级 Leq
// =========================================================================

export interface LeqResult {
  count: number;
  leq: number;
  lmin: number;
  lmax: number;
  lrange: number;
}

/**
 * 等效连续 A 声级 Leq = 10·lg(1/n · Σ 10^(Li/10))
 * 依据:GB 3096 / GB 12348 / GB 12523。
 */
export function calculateLeq(values: number[]): LeqResult | CalculationError {
  const valid = values.filter((x) => Number.isFinite(x));
  if (valid.length < 1) return { error: '至少需要 1 个声级读数' };

  const n = valid.length;
  const sumEnergy = valid.reduce((s, l) => s + Math.pow(10, l / 10), 0);
  const leq = 10 * Math.log10(sumEnergy / n);
  const lmin = Math.min(...valid);
  const lmax = Math.max(...valid);

  return {
    count: n,
    leq: roundTo(leq, 1),
    lmin: roundTo(lmin, 1),
    lmax: roundTo(lmax, 1),
    lrange: roundTo(lmax - lmin, 1),
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

  // 升序:index 0 是最小值;从低到高排。
  // L_x = 第 "(100-x)/100 · (n-1)" 位的值(线性插值)
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
 * 示例:两个 80 dB 点声源叠加为 83 dB。
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
// 4. 距离衰减(点声源自由场)
// =========================================================================

export interface DistanceDecayInput {
  sourceLevel: number;
  r1: number;
  r2: number;
}

export interface DistanceDecayResult {
  decay: number;
  targetLevel: number;
}

/**
 * 点声源自由场距离衰减:ΔL = 20·lg(r2/r1),L2 = L1 - ΔL。
 * 线声源按 10·lg(r2/r1) 使用,这里只做点声源。
 */
export function calculateDistanceDecay(input: DistanceDecayInput): DistanceDecayResult | CalculationError {
  const lErr = requireNonNegative(input.sourceLevel, '源声级');
  if (lErr) return lErr;
  const r1Err = requirePositive(input.r1, '参考距离 r1');
  if (r1Err) return r1Err;
  const r2Err = requirePositive(input.r2, '目标距离 r2');
  if (r2Err) return r2Err;

  const decay = 20 * Math.log10(input.r2 / input.r1);
  return {
    decay: roundTo(decay, 1),
    targetLevel: roundTo(input.sourceLevel - decay, 1),
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
}

/**
 * 背景值修正(GB 12348):
 *   ΔL = L_测 - L_背
 *   ΔL < 3 dB:测量不可靠,需要降低背景后重测
 *   3 ≤ ΔL < 10 dB:对数修正 L_源 = 10·lg(10^(L_测/10) - 10^(L_背/10))
 *   ΔL ≥ 10 dB:无需修正,测量值即为声源值
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

  if (delta < 3) {
    return {
      delta: roundTo(delta, 1),
      corrected: null,
      rule: 'invalid',
      ruleText: 'ΔL < 3 dB,测量不可靠,应在背景声级降低后重测。',
    };
  }

  if (delta >= 10) {
    return {
      delta: roundTo(delta, 1),
      corrected: roundTo(input.measured, 1),
      rule: 'no-correction',
      ruleText: 'ΔL ≥ 10 dB,无需修正,测量值即为声源声级。',
    };
  }

  const sourceLevel = 10 * Math.log10(
    Math.pow(10, input.measured / 10) - Math.pow(10, input.background / 10),
  );
  return {
    delta: roundTo(delta, 1),
    corrected: roundTo(sourceLevel, 1),
    rule: 'logarithmic',
    ruleText: `ΔL = ${delta.toFixed(1)} dB,使用对数修正公式。`,
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
 *   V 房间体积(m³),A 总吸声量 = Σ αi·Si(m² Sabins)
 * 参考:建声 JGJ/T 131 经验公式。
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
  /** 衍射程差 δ (m):声绕射过障碍物边缘的实际路径与直线距离之差。 */
  pathDifference: number;
  /** 关心的中心频率(Hz),默认 500 Hz(交通噪声常用)。 */
  frequency: number;
}

export interface BarrierResult {
  fresnelN: number;
  insertionLoss: number;
}

/**
 * 声屏障 Maekawa-Kurze-Anderson 插入损失:
 *   菲涅尔数 N = 2δ/λ
 *   IL = 5 + 20·lg[√(2πN)/tanh(√(2πN))]  (N > 0)
 *   IL = 5 + 20·lg[√(2π|N|)/tan(√(2π|N|))]  (-0.1924 < N < 0)
 *   IL = 0  (N ≤ -0.1924)
 *   顶值钳 24 dB(理论极限,一般按 20~24 dB 取)
 */
export function calculateBarrierLoss(input: BarrierInput): BarrierResult | CalculationError {
  const dErr = requireNonNegative(input.pathDifference, '衍射程差');
  if (dErr) return dErr;
  const fErr = requirePositive(input.frequency, '中心频率');
  if (fErr) return fErr;

  const c = 340; // 声速 m/s
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
