import { CalculationError, isFiniteNumber, requirePositive, roundTo } from './common';

// =========================================================================
// 1. 溶液稀释 —— 单级 C₁·V₁ = C₂·V₂
// =========================================================================

export type DilutionSolveFor = 'c1' | 'v1' | 'c2' | 'v2';

export interface DilutionSingleInput {
  c1: number;
  v1: number;
  c2: number;
  v2: number;
  /** 求解目标参数,其它三个需填齐 */
  solveFor: DilutionSolveFor;
}

export interface DilutionSingleResult {
  c1: number;
  v1: number;
  c2: number;
  v2: number;
  /** 总稀释倍数 = C₁ / C₂ */
  dilutionFactor: number;
  /** 溶剂加入量 = V₂ − V₁ (mL) */
  solventVolume: number;
}

/**
 * 单级稀释:C₁·V₁ = C₂·V₂
 *   输入其余三个参数,自动求解待求量。浓度/体积单位自洽即可。
 */
export function calculateDilutionSingle(
  input: DilutionSingleInput,
): DilutionSingleResult | CalculationError {
  const { solveFor } = input;
  let { c1, v1, c2, v2 } = input;

  // 非求解项必须为正有限值
  const need: Array<[DilutionSolveFor, number, string]> = [
    ['c1', c1, '母液浓度 C₁'],
    ['v1', v1, '取液量 V₁'],
    ['c2', c2, '目标浓度 C₂'],
    ['v2', v2, '目标体积 V₂'],
  ];
  for (const [key, val, label] of need) {
    if (key === solveFor) continue;
    const err = requirePositive(val, label);
    if (err) return err;
  }

  switch (solveFor) {
    case 'c1':
      c1 = (c2 * v2) / v1;
      break;
    case 'v1':
      v1 = (c2 * v2) / c1;
      break;
    case 'c2':
      c2 = (c1 * v1) / v2;
      break;
    case 'v2':
      v2 = (c1 * v1) / c2;
      break;
  }

  if (
    !isFiniteNumber(c1) ||
    !isFiniteNumber(v1) ||
    !isFiniteNumber(c2) ||
    !isFiniteNumber(v2) ||
    c1 <= 0 ||
    v1 <= 0 ||
    c2 <= 0 ||
    v2 <= 0
  ) {
    return { error: '计算结果非有效正值,请检查输入' };
  }
  if (v1 > v2) {
    return { error: '取液量 V₁ 大于目标体积 V₂,检查稀释方向' };
  }
  if (c2 > c1) {
    return { error: '目标浓度 C₂ 高于母液浓度 C₁,不符合稀释场景' };
  }

  return {
    c1: roundTo(c1, 6),
    v1: roundTo(v1, 3),
    c2: roundTo(c2, 6),
    v2: roundTo(v2, 3),
    dilutionFactor: roundTo(c1 / c2, 3),
    solventVolume: roundTo(v2 - v1, 3),
  };
}

// =========================================================================
// 2. 连续稀释 —— 等比 n 级
// =========================================================================

export interface DilutionSeriesInput {
  c0: number; // 母液浓度
  cFinal: number; // 最终目标浓度
  vFinal: number; // 每级定容体积 mL
  levels: number; // 级数 1 ~ 10
}

export interface DilutionSeriesStep {
  level: number;
  cFrom: number;
  cTo: number;
  vTake: number;
  vFinal: number;
  factor: number;
}

export interface DilutionSeriesResult {
  steps: DilutionSeriesStep[];
  totalFactor: number;
  perStepFactor: number;
}

/**
 * 等比连续稀释:
 *   每级稀释因子 f = (C₀ / C_final)^(1/n)
 *   每级从上一级取 V_final / f,定容至 V_final
 */
export function calculateDilutionSeries(
  input: DilutionSeriesInput,
): DilutionSeriesResult | CalculationError {
  const c0Err = requirePositive(input.c0, '母液浓度 C₀');
  if (c0Err) return c0Err;
  const cFinalErr = requirePositive(input.cFinal, '目标浓度 C_final');
  if (cFinalErr) return cFinalErr;
  const vErr = requirePositive(input.vFinal, '每级定容体积 V_final');
  if (vErr) return vErr;
  if (!Number.isInteger(input.levels) || input.levels < 1 || input.levels > 10) {
    return { error: '稀释级数需为 1 ~ 10 的整数' };
  }
  if (input.cFinal >= input.c0) {
    return { error: '目标浓度应低于母液浓度' };
  }

  const totalFactor = input.c0 / input.cFinal;
  const perStepFactor = Math.pow(totalFactor, 1 / input.levels);
  const vTake = input.vFinal / perStepFactor;

  if (vTake < 0.01) {
    return {
      error: `每级取液量 ${vTake.toFixed(4)} mL 过小,建议增加级数或减小 V_final`,
    };
  }

  const steps: DilutionSeriesStep[] = [];
  let cCur = input.c0;
  for (let i = 1; i <= input.levels; i++) {
    const cNext = cCur / perStepFactor;
    steps.push({
      level: i,
      cFrom: roundTo(cCur, 6),
      cTo: roundTo(cNext, 6),
      vTake: roundTo(vTake, 3),
      vFinal: roundTo(input.vFinal, 3),
      factor: roundTo(perStepFactor, 3),
    });
    cCur = cNext;
  }

  return {
    steps,
    totalFactor: roundTo(totalFactor, 3),
    perStepFactor: roundTo(perStepFactor, 3),
  };
}

// =========================================================================
// 3. 标准曲线线性回归(最小二乘 + 基于回归的 MDL / LOQ)
// =========================================================================

export interface RegressionPoint {
  x: number;
  y: number;
}

export interface RegressionResidual {
  x: number;
  y: number;
  yHat: number;
  residual: number;
}

export interface LinearRegressionResult {
  slope: number; // a
  intercept: number; // b
  rSquared: number; // R²
  sResidual: number; // s(y/x),残差标准偏差
  mdl: number; // 3.3·s / |a| (ICH 回归法)
  loq: number; // 10·s / |a|
  n: number;
  equation: string;
  residuals: RegressionResidual[];
}

/**
 * 最小二乘线性回归:
 *   y = a·x + b
 *   R² = 1 − SS_res / SS_tot
 *   s(y/x) = √(SS_res / (n−2))
 *   MDL = 3.3·s(y/x) / |a|  (ICH Q2(R1) / HJ 168-2020 回归法)
 *   LOQ = 10·s(y/x) / |a|
 *
 * 注:基于回归的 MDL 适用于"仪器检出限 IDL"或"方法检出限初步估算",
 *    正式 MDL 应按 HJ 168 粘贴 7~20 个实际样品平行数据走 `calculateMdl`。
 */
export function calculateLinearRegression(
  points: RegressionPoint[],
): LinearRegressionResult | CalculationError {
  const valid = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (valid.length < 3) return { error: '至少需要 3 个有效 (x, y) 数据点' };

  const n = valid.length;
  const sumX = valid.reduce((s, p) => s + p.x, 0);
  const sumY = valid.reduce((s, p) => s + p.y, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of valid) {
    const dx = p.x - meanX;
    const dy = p.y - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }

  if (sxx === 0) return { error: '所有 x 值相同,无法拟合直线' };

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  const residuals: RegressionResidual[] = [];
  for (const p of valid) {
    const yHat = slope * p.x + intercept;
    const r = p.y - yHat;
    ssRes += r * r;
    residuals.push({
      x: p.x,
      y: p.y,
      yHat: roundTo(yHat, 6),
      residual: roundTo(r, 6),
    });
  }

  const ssTot = syy;
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  const sResidual = Math.sqrt(ssRes / (n - 2));
  const absSlope = Math.abs(slope);
  const mdl = absSlope > 0 ? (3.3 * sResidual) / absSlope : 0;
  const loq = absSlope > 0 ? (10 * sResidual) / absSlope : 0;

  const sign = intercept >= 0 ? '+' : '−';
  const equation = `y = ${slope.toFixed(6)}·x ${sign} ${Math.abs(intercept).toFixed(6)}`;

  return {
    slope: roundTo(slope, 6),
    intercept: roundTo(intercept, 6),
    rSquared: roundTo(rSquared, 5),
    sResidual: roundTo(sResidual, 6),
    mdl: roundTo(mdl, 6),
    loq: roundTo(loq, 6),
    n,
    equation,
    residuals,
  };
}

// =========================================================================
// 4. 样品浓度回算(液体 → mg/L;固体 → mg/kg 干重)
// =========================================================================

export type SampleMatrix = 'liquid' | 'solid';

export interface SampleRecalcInput {
  matrix: SampleMatrix;
  cInstrument: number; // 仪器测定浓度(上清/消化液),mg/L
  cBlank: number; // 方法空白,mg/L,默认 0
  vFinal: number; // 定容体积 mL
  dilutionFactor: number; // 额外稀释倍数,默认 1
  vSample?: number; // 液体取样体积 mL
  mSample?: number; // 固体取样质量 g
  moisture?: number; // 含水率 %,固体干重基础用
}

export interface SampleRecalcResult {
  netReading: number;
  effectiveFactor: number;
  sampleConcentration: number;
  unit: string;
  driedMass?: number;
}

/**
 * 样品浓度回算:
 *   液体(mg/L)        = (C_inst − C_blank) · V_final · f / V_sample
 *   固体(mg/kg 干重)  = (C_inst − C_blank) · V_final · f / [m_sample·(1 − w/100)]
 *
 * 单位自洽:
 *   mg/L × mL / mL = mg/L
 *   mg/L × mL / g = μg/g = mg/kg  (因 1 mg/L × 1 mL = 1 μg,1 μg/g = 1 mg/kg)
 */
export function calculateSampleRecalc(
  input: SampleRecalcInput,
): SampleRecalcResult | CalculationError {
  if (!isFiniteNumber(input.cInstrument)) return { error: '请输入仪器读数 C_inst' };
  const vfErr = requirePositive(input.vFinal, '定容体积 V_final');
  if (vfErr) return vfErr;
  const fErr = requirePositive(input.dilutionFactor, '稀释倍数 f');
  if (fErr) return fErr;

  const cBlank = isFiniteNumber(input.cBlank) ? input.cBlank : 0;
  const netReading = input.cInstrument - cBlank;
  if (netReading <= 0) {
    return { error: '扣空白后读数 ≤ 0,样品低于空白水平' };
  }

  if (input.matrix === 'liquid') {
    if (
      input.vSample === undefined ||
      !isFiniteNumber(input.vSample) ||
      input.vSample <= 0
    ) {
      return { error: '液体样品需填取样体积 V_sample' };
    }
    const effFactor = (input.vFinal * input.dilutionFactor) / input.vSample;
    return {
      netReading: roundTo(netReading, 6),
      effectiveFactor: roundTo(effFactor, 3),
      sampleConcentration: roundTo(netReading * effFactor, 6),
      unit: 'mg/L',
    };
  }

  // 固体 —— 干重基础
  if (
    input.mSample === undefined ||
    !isFiniteNumber(input.mSample) ||
    input.mSample <= 0
  ) {
    return { error: '固体样品需填取样质量 m_sample' };
  }
  const w = input.moisture ?? 0;
  if (!isFiniteNumber(w) || w < 0 || w >= 100) {
    return { error: '含水率需在 [0, 100) % 区间' };
  }

  const driedMass = input.mSample * (1 - w / 100);
  if (driedMass <= 0) return { error: '干重 ≤ 0,含水率填写异常' };

  const effFactor = (input.vFinal * input.dilutionFactor) / driedMass;
  return {
    netReading: roundTo(netReading, 6),
    effectiveFactor: roundTo(effFactor, 3),
    sampleConcentration: roundTo(netReading * effFactor, 6),
    unit: 'mg/kg(干重)',
    driedMass: roundTo(driedMass, 4),
  };
}

// =========================================================================
// 5. 滴定计算(酸碱 / 络合 / 氧化还原通用模板)
// =========================================================================

export interface TitrationInput {
  cTitrant: number; // 滴定剂浓度 mol/L
  vTitrant: number; // 消耗体积 mL
  vBlank: number; // 空白消耗 mL,默认 0
  vSample: number; // 取样体积 mL
  /**
   * 反应计量比 n_T / n_S:
   *   HCl 滴 NaOH:1:1 → 1
   *   NaOH 滴 H₂SO₄:2 mol NaOH 对 1 mol H₂SO₄ → 2
   *   KMnO₄ 滴 Fe²⁺:1 mol MnO₄⁻ 对 5 mol Fe²⁺ → 0.2
   */
  reactionRatio: number;
  molarMass?: number; // 样品摩尔质量 g/mol,可选;填入后输出 mg/L
  dilutionFactor: number; // 样品稀释倍数,默认 1
}

export interface TitrationResult {
  netVolume: number; // 扣空白后 mL
  molarConcentration: number; // mol/L
  massConcentration: number | null; // mg/L
}

/**
 * 滴定计算:
 *   c_x = (c_T · V_net / n_reaction) · f / V_sample
 *   V_net = V_T − V_blank
 *   其中 c_T、V_net/V_sample 同单位(mL),结果得 mol/L
 *   质量浓度 ρ = c_x · M  (mol/L × g/mol × 1000 = mg/L)
 */
export function calculateTitration(
  input: TitrationInput,
): TitrationResult | CalculationError {
  const cErr = requirePositive(input.cTitrant, '滴定剂浓度 c_T');
  if (cErr) return cErr;
  const vtErr = requirePositive(input.vTitrant, '滴定剂消耗 V_T');
  if (vtErr) return vtErr;
  const vsErr = requirePositive(input.vSample, '取样体积 V_sample');
  if (vsErr) return vsErr;
  const nErr = requirePositive(input.reactionRatio, '反应计量比 n_reaction');
  if (nErr) return nErr;
  const fErr = requirePositive(input.dilutionFactor, '稀释倍数 f');
  if (fErr) return fErr;

  const vBlank = isFiniteNumber(input.vBlank) ? input.vBlank : 0;
  if (vBlank < 0) return { error: '空白消耗体积不能为负' };
  const netVolume = input.vTitrant - vBlank;
  if (netVolume <= 0) return { error: '扣空白后滴定体积 ≤ 0,请检查' };

  const molarConcentration =
    ((input.cTitrant * netVolume) / input.reactionRatio / input.vSample) *
    input.dilutionFactor;

  let massConcentration: number | null = null;
  if (
    input.molarMass !== undefined &&
    isFiniteNumber(input.molarMass) &&
    input.molarMass > 0
  ) {
    // mol/L × g/mol = g/L → ×1000 = mg/L
    massConcentration = roundTo(molarConcentration * input.molarMass * 1000, 4);
  }

  return {
    netVolume: roundTo(netVolume, 3),
    molarConcentration: roundTo(molarConcentration, 6),
    massConcentration,
  };
}
