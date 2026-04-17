import { CalculationError, isFiniteNumber, roundTo } from './common';

// =========================================================================
// 临界值表(全部 α = 0.05)
// =========================================================================

/**
 * Grubbs 极值检验临界值(单侧 α = 0.05)
 * 来源:GB/T 4883-2008 表 A.1
 */
const GRUBBS_CRIT_005: Record<number, number> = {
  3: 1.153,
  4: 1.463,
  5: 1.672,
  6: 1.822,
  7: 1.938,
  8: 2.032,
  9: 2.11,
  10: 2.176,
  11: 2.234,
  12: 2.285,
  13: 2.331,
  14: 2.371,
  15: 2.409,
  16: 2.443,
  17: 2.475,
  18: 2.504,
  19: 2.532,
  20: 2.557,
  21: 2.58,
  22: 2.603,
  23: 2.624,
  24: 2.644,
  25: 2.663,
  30: 2.745,
  40: 2.866,
  50: 2.956,
  60: 3.025,
  80: 3.13,
  100: 3.207,
};

function getGrubbsCritical(n: number): number {
  if (GRUBBS_CRIT_005[n] !== undefined) return GRUBBS_CRIT_005[n];
  // 线性插值
  const keys = Object.keys(GRUBBS_CRIT_005).map(Number).sort((a, b) => a - b);
  if (n < keys[0]) return GRUBBS_CRIT_005[keys[0]];
  if (n > keys[keys.length - 1]) {
    // 大样本用渐近近似:G ≈ √((n-1)²/n · t²/(n-2+t²)),t 为 t_{α/n, n-2}
    // 简化:返回表末值(n=100),提示样本过大
    return GRUBBS_CRIT_005[keys[keys.length - 1]];
  }
  // 插值
  for (let i = 0; i < keys.length - 1; i++) {
    if (n > keys[i] && n < keys[i + 1]) {
      const x1 = keys[i];
      const x2 = keys[i + 1];
      const y1 = GRUBBS_CRIT_005[x1];
      const y2 = GRUBBS_CRIT_005[x2];
      return y1 + ((y2 - y1) * (n - x1)) / (x2 - x1);
    }
  }
  return GRUBBS_CRIT_005[keys[keys.length - 1]];
}

/**
 * Dixon Q 检验临界值(α = 0.05)
 * 来源:GB/T 4883-2008 表 A.4
 * 键 = 样本量,值 = 该样本量对应的 Q 临界值
 */
const DIXON_CRIT_005: Record<number, number> = {
  3: 0.97,
  4: 0.829,
  5: 0.71,
  6: 0.628,
  7: 0.569,
  8: 0.608,
  9: 0.564,
  10: 0.53,
  11: 0.619,
  12: 0.583,
  13: 0.555,
  14: 0.546,
  15: 0.525,
  16: 0.507,
  17: 0.49,
  18: 0.475,
  19: 0.462,
  20: 0.45,
  21: 0.44,
  22: 0.43,
  23: 0.421,
  24: 0.413,
  25: 0.406,
  26: 0.399,
  27: 0.393,
  28: 0.387,
  29: 0.381,
  30: 0.376,
};

/**
 * t 分布双边 α = 0.05 临界值(t₀.₉₇₅)
 * 来源:标准 t 分布表
 */
const T_CRIT_TWO_SIDED_005: Record<number, number> = {
  1: 12.706,
  2: 4.303,
  3: 3.182,
  4: 2.776,
  5: 2.571,
  6: 2.447,
  7: 2.365,
  8: 2.306,
  9: 2.262,
  10: 2.228,
  11: 2.201,
  12: 2.179,
  13: 2.16,
  14: 2.145,
  15: 2.131,
  16: 2.12,
  17: 2.11,
  18: 2.101,
  19: 2.093,
  20: 2.086,
  21: 2.08,
  22: 2.074,
  23: 2.069,
  24: 2.064,
  25: 2.06,
  26: 2.056,
  27: 2.052,
  28: 2.048,
  29: 2.045,
  30: 2.042,
  40: 2.021,
  60: 2.0,
  80: 1.99,
  100: 1.984,
  120: 1.98,
};

function getTCritTwoSided(df: number): number {
  if (df < 1) return T_CRIT_TWO_SIDED_005[1];
  if (T_CRIT_TWO_SIDED_005[df] !== undefined) return T_CRIT_TWO_SIDED_005[df];
  const keys = Object.keys(T_CRIT_TWO_SIDED_005).map(Number).sort((a, b) => a - b);
  if (df > keys[keys.length - 1]) return 1.96; // 正态近似
  for (let i = 0; i < keys.length - 1; i++) {
    if (df > keys[i] && df < keys[i + 1]) {
      const x1 = keys[i];
      const x2 = keys[i + 1];
      const y1 = T_CRIT_TWO_SIDED_005[x1];
      const y2 = T_CRIT_TWO_SIDED_005[x2];
      return y1 + ((y2 - y1) * (df - x1)) / (x2 - x1);
    }
  }
  return T_CRIT_TWO_SIDED_005[keys[keys.length - 1]];
}

// =========================================================================
// 统计小工具
// =========================================================================

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const ss = xs.reduce((s, x) => s + (x - m) ** 2, 0);
  return Math.sqrt(ss / (xs.length - 1));
}

// =========================================================================
// 1. RPD 相对偏差(两个平行样)
// =========================================================================

export interface RpdInput {
  x1: number;
  x2: number;
  /** 合格阈值 %,默认 20%(一般方法),痕量可放到 50 */
  threshold?: number;
}

export interface RpdResult {
  mean: number;
  difference: number;
  rpd: number; // %
  threshold: number;
  passed: boolean;
  level: 'strict' | 'normal' | 'trace' | 'custom';
}

/**
 * 平行样相对偏差:
 *   RPD = |x₁ − x₂| / ((x₁ + x₂) / 2) × 100%
 *
 * 合格阈值一般分级(HJ 168 附录):
 *   严格 ≤ 10%,常规 ≤ 20%,痕量 ≤ 30 ~ 50%
 */
export function calculateRpd(input: RpdInput): RpdResult | CalculationError {
  if (!isFiniteNumber(input.x1)) return { error: '请输入平行样 1' };
  if (!isFiniteNumber(input.x2)) return { error: '请输入平行样 2' };
  const avg = (input.x1 + input.x2) / 2;
  if (avg === 0) return { error: '两平行样均值为 0,无法计算 RPD' };

  const rpd = (Math.abs(input.x1 - input.x2) / Math.abs(avg)) * 100;
  const threshold = input.threshold ?? 20;
  if (threshold <= 0) return { error: '合格阈值必须 > 0' };

  let level: RpdResult['level'] = 'custom';
  if (threshold === 10) level = 'strict';
  else if (threshold === 20) level = 'normal';
  else if (threshold === 30 || threshold === 50) level = 'trace';

  return {
    mean: roundTo(avg, 6),
    difference: roundTo(Math.abs(input.x1 - input.x2), 6),
    rpd: roundTo(rpd, 3),
    threshold,
    passed: rpd <= threshold,
    level,
  };
}

// =========================================================================
// 2. Grubbs 极值检验
// =========================================================================

export interface GrubbsSuspect {
  index: number;
  value: number;
  position: 'min' | 'max';
  g: number;
}

export interface GrubbsResult {
  n: number;
  mean: number;
  stdev: number;
  gCritical: number;
  suspects: GrubbsSuspect[];
  /** 被判定为离群的值(G > G_crit) */
  outliers: GrubbsSuspect[];
  cleanedData: number[];
  cleanedMean: number;
  cleanedStdev: number;
  cleanedRsd: number;
}

/**
 * Grubbs 极值检验(单侧 α = 0.05):
 *   G = |x_extreme − x̄| / s
 *   若 G > G_crit(n, α),判定该极值为离群值。
 *
 * 实现:
 *   同时检验最大值和最小值,将超临界者剔除(每轮最多剔 1 个)。
 *   返回"剔除后数据 + 统计量",便于质控工作流。
 *
 * 注意:Grubbs 适用于正态数据,且每次只能剔 1 个。本函数做的是单轮检验,
 *      多轮迭代请人工判断是否继续。
 */
export function calculateGrubbs(values: number[]): GrubbsResult | CalculationError {
  const valid = values.filter(Number.isFinite);
  if (valid.length < 3) return { error: 'Grubbs 检验至少需要 3 个数据' };
  if (valid.length > 100) return { error: '样本量 > 100,建议用其他稳健方法' };

  const n = valid.length;
  const m = mean(valid);
  const s = stdev(valid);
  if (s === 0) return { error: '所有数据完全相同,无离群可检' };

  const gCrit = getGrubbsCritical(n);

  // 找最大值和最小值的索引
  let maxIdx = 0;
  let minIdx = 0;
  for (let i = 1; i < n; i++) {
    if (valid[i] > valid[maxIdx]) maxIdx = i;
    if (valid[i] < valid[minIdx]) minIdx = i;
  }
  const gMax = (valid[maxIdx] - m) / s;
  const gMin = (m - valid[minIdx]) / s;

  const suspects: GrubbsSuspect[] = [
    { index: maxIdx, value: valid[maxIdx], position: 'max', g: roundTo(gMax, 4) },
    { index: minIdx, value: valid[minIdx], position: 'min', g: roundTo(gMin, 4) },
  ];

  // 被判定为离群的点
  const outlierIdxs = new Set<number>();
  const outliers: GrubbsSuspect[] = [];
  if (gMax > gCrit) {
    outlierIdxs.add(maxIdx);
    outliers.push(suspects[0]);
  }
  if (gMin > gCrit) {
    outlierIdxs.add(minIdx);
    outliers.push(suspects[1]);
  }

  const cleaned = valid.filter((_, i) => !outlierIdxs.has(i));
  const cleanedMean = cleaned.length > 0 ? mean(cleaned) : 0;
  const cleanedStdev = cleaned.length >= 2 ? stdev(cleaned) : 0;
  const cleanedRsd =
    cleanedMean !== 0 && cleaned.length >= 2 ? (cleanedStdev / Math.abs(cleanedMean)) * 100 : 0;

  return {
    n,
    mean: roundTo(m, 6),
    stdev: roundTo(s, 6),
    gCritical: roundTo(gCrit, 4),
    suspects,
    outliers,
    cleanedData: cleaned.map((v) => roundTo(v, 6)),
    cleanedMean: roundTo(cleanedMean, 6),
    cleanedStdev: roundTo(cleanedStdev, 6),
    cleanedRsd: roundTo(cleanedRsd, 3),
  };
}

// =========================================================================
// 3. Dixon Q 检验
// =========================================================================

export type DixonStatistic = 'r10' | 'r11' | 'r21' | 'r22';

export interface DixonSuspect {
  value: number;
  position: 'min' | 'max';
  q: number;
  formula: string;
}

export interface DixonResult {
  n: number;
  statistic: DixonStatistic;
  qCritical: number;
  sorted: number[];
  suspects: DixonSuspect[];
  outliers: DixonSuspect[];
  cleanedData: number[];
}

function pickDixonStat(n: number): DixonStatistic {
  if (n <= 7) return 'r10';
  if (n <= 10) return 'r11';
  if (n <= 13) return 'r21';
  return 'r22';
}

/**
 * Dixon Q 检验(α = 0.05):
 *   按 n 选用不同统计量,对最小 / 最大候选值计算 Q,对比 Q_crit。
 *
 *   n=3~7   r₁₀:(x₂−x₁)/(xₙ−x₁) 或 (xₙ−x_{n−1})/(xₙ−x₁)
 *   n=8~10  r₁₁:(x₂−x₁)/(x_{n−1}−x₁) 或 (xₙ−x_{n−1})/(xₙ−x₂)
 *   n=11~13 r₂₁:(x₃−x₁)/(x_{n−1}−x₁) 或 (xₙ−x_{n−2})/(xₙ−x₂)
 *   n=14~30 r₂₂:(x₃−x₁)/(x_{n−2}−x₁) 或 (xₙ−x_{n−2})/(xₙ−x₃)
 *
 * 依据:GB/T 4883-2008 表 A.4。
 */
export function calculateDixon(values: number[]): DixonResult | CalculationError {
  const valid = values.filter(Number.isFinite);
  if (valid.length < 3) return { error: 'Dixon 检验至少需要 3 个数据' };
  if (valid.length > 30) return { error: 'Dixon 适用 n ≤ 30,请用 Grubbs 或其他方法' };

  const sorted = [...valid].sort((a, b) => a - b);
  const n = sorted.length;
  const stat = pickDixonStat(n);
  const qCrit = DIXON_CRIT_005[n];

  const range = sorted[n - 1] - sorted[0];
  if (range === 0) return { error: '所有数据完全相同,无离群可检' };

  let qMin = 0;
  let qMax = 0;
  let formulaMin = '';
  let formulaMax = '';

  // 注意:索引从 1 开始(x₁ 即 sorted[0]),代码中用 0-based
  switch (stat) {
    case 'r10': {
      qMin = (sorted[1] - sorted[0]) / (sorted[n - 1] - sorted[0]);
      qMax = (sorted[n - 1] - sorted[n - 2]) / (sorted[n - 1] - sorted[0]);
      formulaMin = '(x₂ − x₁) / (xₙ − x₁)';
      formulaMax = '(xₙ − x_{n−1}) / (xₙ − x₁)';
      break;
    }
    case 'r11': {
      qMin = (sorted[1] - sorted[0]) / (sorted[n - 2] - sorted[0]);
      qMax = (sorted[n - 1] - sorted[n - 2]) / (sorted[n - 1] - sorted[1]);
      formulaMin = '(x₂ − x₁) / (x_{n−1} − x₁)';
      formulaMax = '(xₙ − x_{n−1}) / (xₙ − x₂)';
      break;
    }
    case 'r21': {
      qMin = (sorted[2] - sorted[0]) / (sorted[n - 2] - sorted[0]);
      qMax = (sorted[n - 1] - sorted[n - 3]) / (sorted[n - 1] - sorted[1]);
      formulaMin = '(x₃ − x₁) / (x_{n−1} − x₁)';
      formulaMax = '(xₙ − x_{n−2}) / (xₙ − x₂)';
      break;
    }
    case 'r22': {
      qMin = (sorted[2] - sorted[0]) / (sorted[n - 3] - sorted[0]);
      qMax = (sorted[n - 1] - sorted[n - 3]) / (sorted[n - 1] - sorted[2]);
      formulaMin = '(x₃ − x₁) / (x_{n−2} − x₁)';
      formulaMax = '(xₙ − x_{n−2}) / (xₙ − x₃)';
      break;
    }
  }

  const suspects: DixonSuspect[] = [
    { value: sorted[0], position: 'min', q: roundTo(qMin, 4), formula: formulaMin },
    { value: sorted[n - 1], position: 'max', q: roundTo(qMax, 4), formula: formulaMax },
  ];

  const outliers: DixonSuspect[] = [];
  const outlierValues = new Set<number>();
  if (qMin > qCrit) {
    outliers.push(suspects[0]);
    outlierValues.add(sorted[0]);
  }
  if (qMax > qCrit) {
    outliers.push(suspects[1]);
    outlierValues.add(sorted[n - 1]);
  }

  // 从原数据按值剔除(若重复值,仅剔一个出现)
  const cleaned: number[] = [];
  const toRemove = new Map<number, number>();
  for (const v of outlierValues) toRemove.set(v, 1);
  for (const v of valid) {
    const remaining = toRemove.get(v);
    if (remaining && remaining > 0) {
      toRemove.set(v, remaining - 1);
      continue;
    }
    cleaned.push(v);
  }

  return {
    n,
    statistic: stat,
    qCritical: roundTo(qCrit, 4),
    sorted: sorted.map((v) => roundTo(v, 6)),
    suspects,
    outliers,
    cleanedData: cleaned.map((v) => roundTo(v, 6)),
  };
}

// =========================================================================
// 4. 双样本 t 检验(Welch,不假设方差齐性)
// =========================================================================

export interface TwoSampleTInput {
  group1: number[];
  group2: number[];
  label1?: string;
  label2?: string;
}

export interface TwoSampleTResult {
  n1: number;
  n2: number;
  mean1: number;
  mean2: number;
  sd1: number;
  sd2: number;
  tStat: number;
  df: number;
  tCritical: number;
  significantDifference: boolean;
  meanDifference: number;
  conclusion: string;
  label1: string;
  label2: string;
}

/**
 * 双样本 Welch t 检验(双边 α = 0.05,不假设方差齐性):
 *   t = (x̄₁ − x̄₂) / √(s₁²/n₁ + s₂²/n₂)
 *   df = (s₁²/n₁ + s₂²/n₂)² / [(s₁²/n₁)²/(n₁−1) + (s₂²/n₂)²/(n₂−1)]
 *
 * 若 |t| > t_{α/2, df},判定两组均值存在显著差异。
 *
 * 典型场景:
 *   新/旧方法比对、两操作员平行样比对、标样重复稳定性。
 */
export function calculateTwoSampleT(input: TwoSampleTInput): TwoSampleTResult | CalculationError {
  const g1 = input.group1.filter(Number.isFinite);
  const g2 = input.group2.filter(Number.isFinite);
  if (g1.length < 2) return { error: '第 1 组至少需 2 个数据' };
  if (g2.length < 2) return { error: '第 2 组至少需 2 个数据' };

  const n1 = g1.length;
  const n2 = g2.length;
  const m1 = mean(g1);
  const m2 = mean(g2);
  const s1 = stdev(g1);
  const s2 = stdev(g2);

  if (s1 === 0 && s2 === 0) {
    return { error: '两组数据方差均为 0,无需 t 检验' };
  }

  const v1 = (s1 * s1) / n1;
  const v2 = (s2 * s2) / n2;
  const seDiff = Math.sqrt(v1 + v2);
  if (seDiff === 0) return { error: '标准误为 0,无法计算 t' };

  const tStat = (m1 - m2) / seDiff;

  // Welch-Satterthwaite df
  const df =
    (v1 + v2) ** 2 /
    ((v1 * v1) / (n1 - 1) + (v2 * v2) / (n2 - 1));

  const dfRounded = Math.max(1, Math.floor(df));
  const tCrit = getTCritTwoSided(dfRounded);
  const significant = Math.abs(tStat) > tCrit;

  const conclusion = significant
    ? `|t| = ${Math.abs(tStat).toFixed(3)} > t_crit = ${tCrit.toFixed(3)},两组均值存在显著差异(α=0.05)`
    : `|t| = ${Math.abs(tStat).toFixed(3)} ≤ t_crit = ${tCrit.toFixed(3)},未检出显著差异`;

  return {
    n1,
    n2,
    mean1: roundTo(m1, 6),
    mean2: roundTo(m2, 6),
    sd1: roundTo(s1, 6),
    sd2: roundTo(s2, 6),
    tStat: roundTo(tStat, 4),
    df: roundTo(df, 2),
    tCritical: roundTo(tCrit, 4),
    significantDifference: significant,
    meanDifference: roundTo(m1 - m2, 6),
    conclusion,
    label1: input.label1 || '第 1 组',
    label2: input.label2 || '第 2 组',
  };
}
