/**
 * 溶液稀释方案设计器(v3 —— 实验室可执行性优先)
 *
 * 相对 v2 的核心改动:
 *   - GlasswareKind 细分:flask / volumetric_pipette / graduated_pipette / micropipette。
 *     单标线吸量管(容量吸管)只能移取标称体积,不再参与"自适应任意读数"。
 *   - 最终容量瓶选择:新增 finalVolumeMode(exact-or-nearest / at-least / exact-only)。
 *     默认仅允许"精确命中 V_need"或"最小的 > V_need 规格",
 *     避免了 V_need=100 mL 被推荐 2000 mL 容量瓶的历史问题。
 *   - 新增运行模式 dilutionDesignMode:
 *       standard(默认,CMA/CNAS):纯固定体积组合,总倍数需落在 factorTolerancePercent 内。
 *       smart:在 standard 的基础上,若存在 graduated_pipette/micropipette,
 *             允许最后一级采用自适应读数,并明确标记不确定度来源。
 *   - 母液可用量改为硬约束(vTakeTotal ≤ c0AvailableMl),
 *     分次吸取改由独立字段 maxSingleTakeMl 控制,语义不再混淆。
 *   - 排序:finalVolumePenalty → 级数 → 是否自适应 → 扩展不确定度 → 操作复杂度。
 *   - factorTolerancePercent 真实生效于固定体积组合,默认 2%。
 *
 * 依赖:JJG 196-2006 / JJF 1059.1-2012。
 */

import { CalculationError, requirePositive, roundTo } from './common';
import {
  JJG_196_2006,
  STANDARD_FLASK_SIZES_ML,
  STANDARD_PIPETTE_SIZES_ML,
  getFlaskAllowance,
  getPipetteAllowance,
  type GlasswareAllowance,
} from '../../standards/jjg196-2006';
import {
  combineRelativeUncertainty,
  expandUncertainty,
  halfWidthToStandardUncertainty,
} from '../../standards/jjf1059-2012';

// =========================================================================
//  类型定义
// =========================================================================

/**
 * 器具语义类型。
 *   flask:容量瓶(仅用作定容容器)。
 *   volumetric_pipette:单标线吸量管 / 容量吸管,仅能移取标称体积。
 *   graduated_pipette:分度吸量管,在量程内读数,使用对应允差或校准数据。
 *   micropipette:可调移液器,在量程内取液,应由用户提供 toleranceMl
 *     或 relTolerancePercent(检定/校准数据)。
 */
export type GlasswareKind =
  | 'flask'
  | 'volumetric_pipette'
  | 'graduated_pipette'
  | 'micropipette';

export type GlasswareGrade = 'A' | 'B' | 'vendor';

export interface DilutionGlassware {
  kind: GlasswareKind;
  /** 标称容量 mL */
  volumeMl: number;
  /** 允差 ± (mL)。对 micropipette 可由 relTolerancePercent 推导。 */
  toleranceMl: number;
  grade: GlasswareGrade;
  label: string;
  /** 是否已由 PDF / 检定证书核对 */
  pdfConfirmed: boolean;
  /** 可选:相对允差(%),主要用于可调移液器。提供后优先于 toleranceMl。 */
  relTolerancePercent?: number;
}

export interface DilutionStepPlan {
  /** 第几级(1-based) */
  level: number;
  cFrom: number;
  cTo: number;
  /** 本级实际倍数(自适应最后一级可能非整数) */
  factor: number;
  /** 本级取液工具 */
  pipette: DilutionGlassware;
  /** 本级定容容量瓶 */
  flask: DilutionGlassware;
  /** 实际吸取总量(mL) */
  actualTakeMl: number;
  /** 是否为"非满刻度读数"——仅可能出现在最后一级 + 可调工具场景 */
  isFinalAdjusted: boolean;
  /** 分次吸取次数,≥ 1。正常 = 1;仅当 maxSingleTakeMl 生效时 > 1。 */
  takeTimes: number;
  takeVolumePerTimeMl: number;
  /** 本级合成相对标准不确定度(%) */
  uRelPercent: number;
  instruction: string;
}

export type DilutionRating = 1 | 2 | 3 | 4 | 5;

export interface DilutionProposal {
  id: string;
  levels: number;
  steps: DilutionStepPlan[];
  totalFactor: number;
  /** 实际倍数相对目标倍数的偏差(%)。固定体积组合可能非 0,自适应命中 ≈ 0。 */
  factorDeviationPercent: number;
  dilutionURelPercent: number;
  c0URelPercent: number;
  combinedURelPercent: number;
  expandedUPercent: number;
  rating: DilutionRating;
  /** 是否使用了"非满刻度读数"(仅 smart 模式可能出现) */
  usesAdjustedTake: boolean;
  warnings: string[];
  summary: string;
}

/** 方案运行模式 */
export type DilutionDesignMode = 'standard' | 'smart';

/** 最终容量瓶选择策略 */
export type FinalVolumeMode = 'exact-or-nearest' | 'at-least' | 'exact-only';

export interface DilutionDesignInput {
  c0: number;
  cTarget: number;
  vNeedMl: number;
  /** 母液总可用量(mL)。首级实际消耗总量不得超过该值,否则判定为不可行。 */
  c0AvailableMl?: number;
  /**
   * 单次最大吸取量(mL)。若首级实际总消耗 > 此值,
   * 允许拆分成 N 次并合并,本级不确定度按 √N 倍膨胀。
   * 不再与"母液可用量"混用。
   */
  maxSingleTakeMl?: number;
  availableFlaskSizesMl?: number[];
  flaskGrade?: 'A' | 'B';
  availablePipetteSizesMl?: number[];
  pipetteGrade?: 'A' | 'B';
  /** 用户自备的可调移液器(必须提供 toleranceMl 或 relTolerancePercent) */
  microPipettes?: DilutionGlassware[];
  /** 用户自备的分度吸量管 */
  graduatedPipettes?: DilutionGlassware[];
  maxLevels?: 1 | 2 | 3;
  /** 固定体积组合的总倍数允许偏差(%),默认 2。 */
  factorTolerancePercent?: number;
  /** 母液浓度 C₀ 相对不确定度(%),参与最终扩展不确定度合成。默认 0.5。 */
  uRelC0Percent?: number;
  /** 可调/分度工具读数下限占量程的比例,默认 0.10。 */
  minPipetteUtilization?: number;
  topN?: number;
  /** 方案运行模式,默认 standard。 */
  designMode?: DilutionDesignMode;
  /** 最终容量瓶选择策略,默认 exact-or-nearest。 */
  finalVolumeMode?: FinalVolumeMode;
}

export interface DilutionDesignResult {
  requestedTotalFactor: number;
  proposals: DilutionProposal[];
  searchPoolSize: number;
  message?: string;
}

// =========================================================================
//  内部辅助
// =========================================================================

/** 前 n-1 级离散稀释单元(满标称容量) */
interface StepUnit {
  pipette: DilutionGlassware;
  flask: DilutionGlassware;
  factor: number;
  uRel: number;
}

const EPS = 1e-9;

function glasswareRelativeU(toleranceMl: number, volumeMl: number): number {
  return halfWidthToStandardUncertainty(toleranceMl) / volumeMl;
}

/** 可调移液器在非标称体积下,允差应优先走相对允差;否则回退到标称允差。 */
function toolAbsoluteToleranceAt(
  tool: DilutionGlassware,
  actualVolumeMl: number,
): number {
  if (tool.kind === 'micropipette' && tool.relTolerancePercent !== undefined) {
    return (tool.relTolerancePercent / 100) * actualVolumeMl;
  }
  return tool.toleranceMl;
}

function isAdjustableTool(tool: DilutionGlassware): boolean {
  return tool.kind === 'graduated_pipette' || tool.kind === 'micropipette';
}

/** 判断给定工具能否精确/合理吸取指定体积。 */
export function canTakeVolume(
  tool: DilutionGlassware,
  actualVolumeMl: number,
  minUtilization: number,
): boolean {
  if (tool.kind === 'volumetric_pipette') {
    return Math.abs(actualVolumeMl - tool.volumeMl) < EPS;
  }
  if (tool.kind === 'graduated_pipette' || tool.kind === 'micropipette') {
    return (
      actualVolumeMl <= tool.volumeMl + EPS &&
      actualVolumeMl >= tool.volumeMl * minUtilization - EPS
    );
  }
  return false;
}

/** 最终容量瓶候选选择。严格执行 finalVolumeMode 语义,避免 V_need=100 却推荐 2000 的情况。 */
export function selectFinalFlasks(
  flasks: DilutionGlassware[],
  vNeedMl: number,
  mode: FinalVolumeMode = 'exact-or-nearest',
): DilutionGlassware[] {
  const sorted = [...flasks].sort((a, b) => a.volumeMl - b.volumeMl);
  const exact = sorted.filter((f) => Math.abs(f.volumeMl - vNeedMl) < EPS);

  if (mode === 'exact-only') return exact;
  if (mode === 'at-least') return sorted.filter((f) => f.volumeMl + EPS >= vNeedMl);

  if (exact.length > 0) return exact;
  const nearest = sorted.find((f) => f.volumeMl + EPS >= vNeedMl);
  return nearest ? [nearest] : [];
}

function toGlassware(
  allowance: GlasswareAllowance,
  kind: 'flask' | 'volumetric_pipette',
  grade: 'A' | 'B',
): DilutionGlassware {
  const labelKind = kind === 'flask' ? '容量瓶' : '单标线吸量管';
  return {
    kind,
    volumeMl: allowance.volumeMl,
    toleranceMl: allowance.toleranceMl,
    grade,
    label: `${allowance.volumeMl} mL ${labelKind}(${grade} 级,±${allowance.toleranceMl} mL)`,
    pdfConfirmed: allowance.pdfConfirmed,
  };
}

/** 离散单级稀释单元:所有工具在"标称体积"下与容量瓶的组合。 */
function buildStepUnits(
  flasks: DilutionGlassware[],
  takers: DilutionGlassware[],
): StepUnit[] {
  const units: StepUnit[] = [];
  for (const flask of flasks) {
    for (const taker of takers) {
      if (taker.volumeMl >= flask.volumeMl) continue;
      const factor = flask.volumeMl / taker.volumeMl;
      if (factor < 1.5 || factor > 500) continue;
      const uRelP = glasswareRelativeU(taker.toleranceMl, taker.volumeMl);
      const uRelF = glasswareRelativeU(flask.toleranceMl, flask.volumeMl);
      const uRel = Math.sqrt(uRelP * uRelP + uRelF * uRelF);
      units.push({ pipette: taker, flask, factor, uRel });
    }
  }
  return units;
}

function enumerateCombos<T>(items: T[], n: number): T[][] {
  if (n === 0) return [[]];
  if (n === 1) return items.map((it) => [it]);
  const out: T[][] = [];
  for (const item of items) {
    const sub = enumerateCombos(items, n - 1);
    for (const s of sub) out.push([item, ...s]);
  }
  return out;
}

function rateByExpandedU(expandedUPercent: number): DilutionRating {
  if (expandedUPercent <= 0.5) return 5;
  if (expandedUPercent <= 1.0) return 4;
  if (expandedUPercent <= 2.0) return 3;
  if (expandedUPercent <= 5.0) return 2;
  return 1;
}

/**
 * 母液"总可用量"硬约束:首级实际消耗总量不得超过 c0AvailableMl。
 * 超过即判定不可行(不再尝试分次吸取绕过总量)。
 */
export function resolveMotherAvailability(
  vTakeTotal: number,
  c0AvailableMl: number | undefined,
): { ok: true } | { ok: false; reason: string } {
  if (c0AvailableMl !== undefined && c0AvailableMl > 0 && vTakeTotal > c0AvailableMl + EPS) {
    return {
      ok: false,
      reason: `首级需消耗母液 ${vTakeTotal.toFixed(3)} mL,超过可用量 ${c0AvailableMl.toFixed(3)} mL`,
    };
  }
  return { ok: true };
}

/**
 * 基于"单次最大吸取量"将首级吸取拆分为 N 次合并。
 * 与 c0AvailableMl 独立,仅当用户显式提供 maxSingleTakeMl 时生效。
 */
function resolveSingleTakeSplit(
  vTakeTotal: number,
  maxSingleTakeMl: number | undefined,
  pipetteMax: number,
  minUtilization: number,
): { takeTimes: number; takeEachMl: number; uInflation: number } | null {
  if (!maxSingleTakeMl || maxSingleTakeMl <= 0 || vTakeTotal <= maxSingleTakeMl + EPS) {
    return { takeTimes: 1, takeEachMl: vTakeTotal, uInflation: 1 };
  }
  const times = Math.ceil(vTakeTotal / maxSingleTakeMl - EPS);
  if (times < 1) return { takeTimes: 1, takeEachMl: vTakeTotal, uInflation: 1 };
  const each = vTakeTotal / times;
  if (each < minUtilization * pipetteMax - EPS) return null;
  if (each > pipetteMax + EPS) return null;
  return { takeTimes: times, takeEachMl: each, uInflation: Math.sqrt(times) };
}

/**
 * 固定体积最后一级:单标线吸量管(或任意工具用于标称体积)。
 * 实际倍数 = flask.V / pipette.V,由 factorTolerancePercent 控制是否接受偏差。
 */
function resolveFixedLevel(
  pipette: DilutionGlassware,
  flask: DilutionGlassware,
): { vPActual: number; actualFactor: number; uRel: number } | null {
  if (pipette.volumeMl >= flask.volumeMl) return null;
  // 仅要求"工具能在标称体积下使用"——对所有 kind 都成立。
  const uRelP = glasswareRelativeU(pipette.toleranceMl, pipette.volumeMl);
  const uRelF = glasswareRelativeU(flask.toleranceMl, flask.volumeMl);
  return {
    vPActual: pipette.volumeMl,
    actualFactor: flask.volumeMl / pipette.volumeMl,
    uRel: Math.sqrt(uRelP * uRelP + uRelF * uRelF),
  };
}

/**
 * 自适应最后一级:分度吸量管 / 可调移液器。
 * vPActual = flask.V / remainingF,要求落在工具可读区间。
 * 允差优先使用 relTolerancePercent(若提供),否则退化为 toleranceMl(悲观)。
 */
function resolveAdjustableFinalLevel(
  pipette: DilutionGlassware,
  flask: DilutionGlassware,
  remainingF: number,
  minUtilization: number,
): { vPActual: number; actualFactor: number; uRel: number; isAdjusted: boolean } | null {
  if (!isAdjustableTool(pipette)) return null;
  if (!(remainingF > 0 && Number.isFinite(remainingF))) return null;
  const vPActual = flask.volumeMl / remainingF;
  if (!canTakeVolume(pipette, vPActual, minUtilization)) return null;
  const absTol = toolAbsoluteToleranceAt(pipette, vPActual);
  const uRelP = halfWidthToStandardUncertainty(absTol) / vPActual;
  const uRelF = glasswareRelativeU(flask.toleranceMl, flask.volumeMl);
  return {
    vPActual,
    actualFactor: flask.volumeMl / vPActual,
    uRel: Math.sqrt(uRelP * uRelP + uRelF * uRelF),
    isAdjusted: Math.abs(vPActual - pipette.volumeMl) > 1e-6,
  };
}

function buildInstruction(step: DilutionStepPlan, levelsTotal: number): string {
  const src = step.level === 1 ? '母液' : `第 ${step.level - 1} 级稀释液`;
  const dst = step.level === levelsTotal ? '工作液' : '中间液';
  let takeDesc: string;
  if (step.takeTimes > 1) {
    takeDesc = `分 ${step.takeTimes} 次,每次精确吸取 ${roundTo(step.takeVolumePerTimeMl, 3)} mL,合并共 ${roundTo(step.actualTakeMl, 3)} mL`;
  } else if (step.isFinalAdjusted) {
    const tool =
      step.pipette.kind === 'micropipette' ? '可调移液器' : '分度吸量管';
    takeDesc = `用 ${step.pipette.volumeMl} mL ${tool}精确取 ${roundTo(step.actualTakeMl, 3)} mL(非满刻度读数,应按该器具检定/校准数据核对不确定度)`;
  } else {
    takeDesc = `用 ${step.pipette.label} 精确移取 ${step.pipette.volumeMl} mL`;
  }
  return `第 ${step.level} 级:${takeDesc},从${src}中取出 → 转入 ${step.flask.label} → 用稀释剂定容至刻度,摇匀,得${dst}。`;
}

function proposalSignature(
  firstN_minus_1: StepUnit[],
  lastFlaskV: number,
  lastPipetteV: number,
  lastKindTag: string,
): string {
  const first = firstN_minus_1
    .map((u) => `${u.pipette.kind}:${u.pipette.volumeMl}-${u.flask.volumeMl}`)
    .sort()
    .join('|');
  return `${first}||${lastKindTag}:${lastPipetteV}-${lastFlaskV}`;
}

function summarize(steps: DilutionStepPlan[]): string {
  return steps
    .map((s) => {
      const factorStr = Number.isInteger(s.factor)
        ? `${s.factor}×`
        : `${s.factor.toFixed(3)}×`;
      return `${factorStr}(${roundTo(s.actualTakeMl, 3)}→${s.flask.volumeMl})`;
    })
    .join(' → ');
}

// =========================================================================
//  排序:finalVolumePenalty → 级数 → 是否自适应 → U → 操作复杂度
// =========================================================================

function getFinalVolumePenalty(p: DilutionProposal, vNeedMl: number): number {
  const finalFlask = p.steps[p.steps.length - 1].flask.volumeMl;
  if (Math.abs(finalFlask - vNeedMl) < EPS) return 0;
  return Math.max(0, (finalFlask - vNeedMl) / vNeedMl);
}

function getOperationPenalty(p: DilutionProposal): number {
  let penalty = 0;
  penalty += (p.levels - 1) * 0.5;
  for (const step of p.steps) {
    if (step.isFinalAdjusted) penalty += 0.5;
    if (step.actualTakeMl < 0.5) penalty += 2.0;
    else if (step.actualTakeMl < 1) penalty += 1.0;
    const utilization = step.actualTakeMl / step.pipette.volumeMl;
    if (step.pipette.kind !== 'volumetric_pipette' && utilization < 0.2) {
      penalty += 0.8;
    }
  }
  return penalty;
}

// =========================================================================
//  主函数
// =========================================================================

export function designDilution(
  input: DilutionDesignInput,
): DilutionDesignResult | CalculationError {
  const c0Err = requirePositive(input.c0, '母液浓度 C₀');
  if (c0Err) return c0Err;
  const cErr = requirePositive(input.cTarget, '目标浓度 C');
  if (cErr) return cErr;
  const vErr = requirePositive(input.vNeedMl, '需要配制体积 V_need');
  if (vErr) return vErr;
  if (input.cTarget >= input.c0) {
    return { error: '目标浓度应低于母液浓度' };
  }

  const F = input.c0 / input.cTarget;
  const maxLevels = input.maxLevels ?? 2;
  const topN = input.topN ?? 5;
  const flaskGrade = input.flaskGrade ?? 'A';
  const pipetteGrade = input.pipetteGrade ?? 'A';
  const uRelC0Percent = input.uRelC0Percent ?? 0.5;
  const minUtilization = input.minPipetteUtilization ?? 0.1;
  const designMode: DilutionDesignMode = input.designMode ?? 'standard';
  const finalVolumeMode: FinalVolumeMode =
    input.finalVolumeMode ?? 'exact-or-nearest';
  const factorTolerancePercent = input.factorTolerancePercent ?? 2;

  // ---- 构造可用玻璃器具 ----
  const flaskSizes = input.availableFlaskSizesMl ?? [...STANDARD_FLASK_SIZES_ML];
  const pipetteSizes = input.availablePipetteSizesMl ?? [...STANDARD_PIPETTE_SIZES_ML];

  const flasks: DilutionGlassware[] = [];
  for (const size of flaskSizes) {
    const a = getFlaskAllowance(size, flaskGrade);
    if (a) flasks.push(toGlassware(a, 'flask', flaskGrade));
  }
  const volumetricPipettes: DilutionGlassware[] = [];
  for (const size of pipetteSizes) {
    const a = getPipetteAllowance(size, pipetteGrade);
    if (a) volumetricPipettes.push(toGlassware(a, 'volumetric_pipette', pipetteGrade));
  }
  const graduatedPipettes = input.graduatedPipettes ?? [];
  const microPipettes = input.microPipettes ?? [];
  const adjustableTools = [...graduatedPipettes, ...microPipettes];
  const allTakers = [...volumetricPipettes, ...adjustableTools];

  if (flasks.length === 0 || allTakers.length === 0) {
    return { error: '请至少选择一个容量瓶和一个吸管/移液器' };
  }

  // ---- 最终容量瓶候选 ----
  const finalFlasks = selectFinalFlasks(flasks, input.vNeedMl, finalVolumeMode);
  if (finalFlasks.length === 0) {
    return {
      error:
        '当前可用容量瓶中没有满足最终配制体积要求的规格。' +
        '请增加容量瓶规格、调整 V_need,或将"最终体积策略"切换为"允许更大体积(高级)"。',
    };
  }

  // ---- 前 n-1 级离散单元池 ----
  const stepUnits = buildStepUnits(flasks, allTakers);

  const proposals: DilutionProposal[] = [];
  const seen = new Set<string>();
  const uC0 = uRelC0Percent / 100;
  const allowAdjustable = designMode === 'smart' && adjustableTools.length > 0;
  const factorTolFraction = factorTolerancePercent / 100;

  // ---- 级数循环 ----
  for (let n = 1; n <= maxLevels; n++) {
    if (n === 1) {
      // ========= 1 级 =========
      // (a) 固定体积组合:任意工具在标称体积下
      for (const flask of finalFlasks) {
        for (const pipette of allTakers) {
          const fixed = resolveFixedLevel(pipette, flask);
          if (!fixed) continue;
          const deviation = (fixed.actualFactor - F) / F;
          if (Math.abs(deviation) > factorTolFraction + EPS) continue;

          const motherOk = resolveMotherAvailability(
            fixed.vPActual,
            input.c0AvailableMl,
          );
          if (!motherOk.ok) continue;
          const split = resolveSingleTakeSplit(
            fixed.vPActual,
            input.maxSingleTakeMl,
            pipette.volumeMl,
            minUtilization,
          );
          if (!split) continue;

          const uRelLevel = fixed.uRel * split.uInflation;
          const step: DilutionStepPlan = {
            level: 1,
            cFrom: input.c0,
            cTo: input.c0 / fixed.actualFactor,
            factor: fixed.actualFactor,
            pipette,
            flask,
            actualTakeMl: fixed.vPActual,
            isFinalAdjusted: false,
            takeTimes: split.takeTimes,
            takeVolumePerTimeMl: split.takeEachMl,
            uRelPercent: uRelLevel * 100,
            instruction: '',
          };
          step.instruction = buildInstruction(step, 1);

          const sig = proposalSignature([], flask.volumeMl, pipette.volumeMl, `fixed-${pipette.kind}`);
          if (seen.has(sig)) continue;
          seen.add(sig);

          const uDilution = combineRelativeUncertainty([uRelLevel]);
          const uTotal = Math.sqrt(uDilution * uDilution + uC0 * uC0);
          const expandedU = expandUncertainty(uTotal) * 100;
          const rating = rateByExpandedU(expandedU);
          const warnings = buildWarnings([step], 1, designMode, split);
          proposals.push({
            id: sig,
            levels: 1,
            steps: [step],
            totalFactor: roundTo(fixed.actualFactor, 4),
            factorDeviationPercent: roundTo(deviation * 100, 3),
            dilutionURelPercent: roundTo(uDilution * 100, 4),
            c0URelPercent: roundTo(uC0 * 100, 4),
            combinedURelPercent: roundTo(uTotal * 100, 4),
            expandedUPercent: roundTo(expandedU, 4),
            rating,
            usesAdjustedTake: false,
            warnings,
            summary: summarize([step]),
          });
        }
      }

      // (b) 自适应组合:仅 smart 模式 + 可调工具
      if (allowAdjustable) {
        for (const flask of finalFlasks) {
          for (const pipette of adjustableTools) {
            const adj = resolveAdjustableFinalLevel(pipette, flask, F, minUtilization);
            if (!adj) continue;

            const motherOk = resolveMotherAvailability(
              adj.vPActual,
              input.c0AvailableMl,
            );
            if (!motherOk.ok) continue;
            const split = resolveSingleTakeSplit(
              adj.vPActual,
              input.maxSingleTakeMl,
              pipette.volumeMl,
              minUtilization,
            );
            if (!split) continue;

            const uRelLevel = adj.uRel * split.uInflation;
            const step: DilutionStepPlan = {
              level: 1,
              cFrom: input.c0,
              cTo: input.c0 / adj.actualFactor,
              factor: adj.actualFactor,
              pipette,
              flask,
              actualTakeMl: adj.vPActual,
              isFinalAdjusted: adj.isAdjusted,
              takeTimes: split.takeTimes,
              takeVolumePerTimeMl: split.takeEachMl,
              uRelPercent: uRelLevel * 100,
              instruction: '',
            };
            step.instruction = buildInstruction(step, 1);

            const sig = proposalSignature(
              [],
              flask.volumeMl,
              pipette.volumeMl,
              `adj-${pipette.kind}`,
            );
            if (seen.has(sig)) continue;
            seen.add(sig);

            const uDilution = combineRelativeUncertainty([uRelLevel]);
            const uTotal = Math.sqrt(uDilution * uDilution + uC0 * uC0);
            const expandedU = expandUncertainty(uTotal) * 100;
            const rating = rateByExpandedU(expandedU);
            const warnings = buildWarnings([step], 1, designMode, split);
            proposals.push({
              id: sig,
              levels: 1,
              steps: [step],
              totalFactor: roundTo(adj.actualFactor, 4),
              factorDeviationPercent: 0,
              dilutionURelPercent: roundTo(uDilution * 100, 4),
              c0URelPercent: roundTo(uC0 * 100, 4),
              combinedURelPercent: roundTo(uTotal * 100, 4),
              expandedUPercent: roundTo(expandedU, 4),
              rating,
              usesAdjustedTake: adj.isAdjusted,
              warnings,
              summary: summarize([step]),
            });
          }
        }
      }
    } else {
      // ========= n ≥ 2 =========
      const firstCombos = enumerateCombos(stepUnits, n - 1);
      for (const firstCombo of firstCombos) {
        const totalFBefore = firstCombo.reduce((p, u) => p * u.factor, 1);
        const remainingF = F / totalFBefore;
        if (remainingF < 1) continue;

        // 前 n-1 级按 factor 降序:大倍数先,中间液更稀,降低污染 / 挥发风险
        const sortedFirst = [...firstCombo].sort((a, b) => b.factor - a.factor);
        const firstPipette = sortedFirst[0].pipette;

        const motherOk = resolveMotherAvailability(
          firstPipette.volumeMl,
          input.c0AvailableMl,
        );
        if (!motherOk.ok) continue;
        const split = resolveSingleTakeSplit(
          firstPipette.volumeMl,
          input.maxSingleTakeMl,
          firstPipette.volumeMl,
          minUtilization,
        );
        if (!split) continue;

        for (const lastFlask of finalFlasks) {
          // (a) 固定体积最后一级
          for (const lastPipette of allTakers) {
            const fixed = resolveFixedLevel(lastPipette, lastFlask);
            if (!fixed) continue;
            const totalFactor = totalFBefore * fixed.actualFactor;
            const deviation = (totalFactor - F) / F;
            if (Math.abs(deviation) > factorTolFraction + EPS) continue;

            const sig = proposalSignature(
              firstCombo,
              lastFlask.volumeMl,
              lastPipette.volumeMl,
              `fixed-${lastPipette.kind}`,
            );
            if (seen.has(sig)) continue;
            seen.add(sig);

            pushMultiLevelProposal({
              proposals,
              input,
              n,
              sortedFirst,
              split,
              last: {
                pipette: lastPipette,
                flask: lastFlask,
                vPActual: fixed.vPActual,
                actualFactor: fixed.actualFactor,
                uRel: fixed.uRel,
                isAdjusted: false,
              },
              uC0,
              sig,
              designMode,
              deviationPercent: deviation * 100,
            });
          }

          // (b) 自适应最后一级(仅 smart 模式)
          if (allowAdjustable) {
            for (const lastPipette of adjustableTools) {
              const adj = resolveAdjustableFinalLevel(
                lastPipette,
                lastFlask,
                remainingF,
                minUtilization,
              );
              if (!adj) continue;

              const sig = proposalSignature(
                firstCombo,
                lastFlask.volumeMl,
                lastPipette.volumeMl,
                `adj-${lastPipette.kind}`,
              );
              if (seen.has(sig)) continue;
              seen.add(sig);

              pushMultiLevelProposal({
                proposals,
                input,
                n,
                sortedFirst,
                split,
                last: {
                  pipette: lastPipette,
                  flask: lastFlask,
                  vPActual: adj.vPActual,
                  actualFactor: adj.actualFactor,
                  uRel: adj.uRel,
                  isAdjusted: adj.isAdjusted,
                },
                uC0,
                sig,
                designMode,
                deviationPercent: 0,
              });
            }
          }
        }
      }
    }
  }

  if (proposals.length === 0) {
    return {
      requestedTotalFactor: roundTo(F, 4),
      proposals: [],
      searchPoolSize: stepUnits.length,
      message:
        `当前器具组合下无法配出 ${roundTo(F, 2)}× 的稀释方案。` +
        `可尝试:放宽"总倍数允许偏差"、切换到 smart 模式、增加可用容量瓶/吸管规格、` +
        `或提供可调移液器 / 分度吸量管。`,
    };
  }

  // 排序
  proposals.sort((a, b) => {
    const aFinalPenalty = getFinalVolumePenalty(a, input.vNeedMl);
    const bFinalPenalty = getFinalVolumePenalty(b, input.vNeedMl);
    if (Math.abs(aFinalPenalty - bFinalPenalty) > EPS) {
      return aFinalPenalty - bFinalPenalty;
    }
    if (a.levels !== b.levels) return a.levels - b.levels;
    if (a.usesAdjustedTake !== b.usesAdjustedTake) {
      return a.usesAdjustedTake ? 1 : -1;
    }
    if (Math.abs(a.expandedUPercent - b.expandedUPercent) > EPS) {
      return a.expandedUPercent - b.expandedUPercent;
    }
    return getOperationPenalty(a) - getOperationPenalty(b);
  });

  return {
    requestedTotalFactor: roundTo(F, 4),
    proposals: proposals.slice(0, topN),
    searchPoolSize: stepUnits.length,
  };
}

// =========================================================================
//  多级方案组装(fixed/adjustable 共享逻辑)
// =========================================================================

interface LastLevelInfo {
  pipette: DilutionGlassware;
  flask: DilutionGlassware;
  vPActual: number;
  actualFactor: number;
  uRel: number;
  isAdjusted: boolean;
}

function pushMultiLevelProposal(args: {
  proposals: DilutionProposal[];
  input: DilutionDesignInput;
  n: number;
  sortedFirst: StepUnit[];
  split: { takeTimes: number; takeEachMl: number; uInflation: number };
  last: LastLevelInfo;
  uC0: number;
  sig: string;
  designMode: DilutionDesignMode;
  deviationPercent: number;
}): void {
  const {
    proposals,
    input,
    n,
    sortedFirst,
    split,
    last,
    uC0,
    sig,
    designMode,
    deviationPercent,
  } = args;

  const steps: DilutionStepPlan[] = [];
  const uRelList: number[] = [];
  let cCur = input.c0;

  for (let i = 0; i < sortedFirst.length; i++) {
    const u = sortedFirst[i];
    const isFirst = i === 0;
    const uInfl = isFirst ? split.uInflation : 1;
    const uLevel = u.uRel * uInfl;
    const step: DilutionStepPlan = {
      level: i + 1,
      cFrom: cCur,
      cTo: cCur / u.factor,
      factor: u.factor,
      pipette: u.pipette,
      flask: u.flask,
      actualTakeMl: u.pipette.volumeMl,
      isFinalAdjusted: false,
      takeTimes: isFirst ? split.takeTimes : 1,
      takeVolumePerTimeMl: isFirst ? split.takeEachMl : u.pipette.volumeMl,
      uRelPercent: uLevel * 100,
      instruction: '',
    };
    step.instruction = buildInstruction(step, n);
    cCur = step.cTo;
    steps.push(step);
    uRelList.push(uLevel);
  }

  const lastStep: DilutionStepPlan = {
    level: n,
    cFrom: cCur,
    cTo: cCur / last.actualFactor,
    factor: last.actualFactor,
    pipette: last.pipette,
    flask: last.flask,
    actualTakeMl: last.vPActual,
    isFinalAdjusted: last.isAdjusted,
    takeTimes: 1,
    takeVolumePerTimeMl: last.vPActual,
    uRelPercent: last.uRel * 100,
    instruction: '',
  };
  lastStep.instruction = buildInstruction(lastStep, n);
  steps.push(lastStep);
  uRelList.push(last.uRel);

  const totalFactor = steps.reduce((p, s) => p * s.factor, 1);
  const uDilution = combineRelativeUncertainty(uRelList);
  const uTotal = Math.sqrt(uDilution * uDilution + uC0 * uC0);
  const expandedU = expandUncertainty(uTotal) * 100;
  const rating = rateByExpandedU(expandedU);
  const warnings = buildWarnings(steps, n, designMode, split);
  proposals.push({
    id: sig,
    levels: n,
    steps,
    totalFactor: roundTo(totalFactor, 4),
    factorDeviationPercent: roundTo(deviationPercent, 3),
    dilutionURelPercent: roundTo(uDilution * 100, 4),
    c0URelPercent: roundTo(uC0 * 100, 4),
    combinedURelPercent: roundTo(uTotal * 100, 4),
    expandedUPercent: roundTo(expandedU, 4),
    rating,
    usesAdjustedTake: last.isAdjusted,
    warnings,
    summary: summarize(steps),
  });
}

// =========================================================================
//  警告规则
// =========================================================================

function buildWarnings(
  steps: DilutionStepPlan[],
  n: number,
  designMode: DilutionDesignMode,
  motherInfo: { takeTimes: number; uInflation: number },
): string[] {
  const ws: string[] = [];
  if (n >= 3) {
    ws.push('级数 ≥ 3,操作时间与污染风险增大,易挥发/易氧化物质慎用');
  }
  const finalStep = steps[steps.length - 1];
  if (finalStep.actualTakeMl < 0.5) {
    ws.push(
      `最后一级实际取液量 ${finalStep.actualTakeMl.toFixed(3)} mL < 0.5 mL,建议改用 A 级检定过的可调微量移液器,并按厂家/检定证书允差替代标称值重新评估不确定度`,
    );
  }
  if (finalStep.isFinalAdjusted) {
    const util = finalStep.actualTakeMl / finalStep.pipette.volumeMl;
    const toolLabel =
      finalStep.pipette.kind === 'micropipette' ? '可调移液器' : '分度吸量管';
    ws.push(
      `最后一级使用${toolLabel}非满刻度读数(实际 ${finalStep.actualTakeMl.toFixed(3)} mL / 量程 ${finalStep.pipette.volumeMl} mL,利用率 ${(util * 100).toFixed(1)}%)。` +
        `不确定度来源应按该器具的检定证书或校准数据核算,不能直接套用单标线吸量管允差。`,
    );
    if (util < 0.2) {
      ws.push(
        `最后一级取液量仅占量程 ${(util * 100).toFixed(1)}%,精度显著下降,建议换用更小量程的工具`,
      );
    }
    if (designMode === 'smart') {
      ws.push('当前为 smart 模式输出,正式报告 / 作业指导书建议切换到 standard 模式以确保可追溯性');
    }
  }
  if (motherInfo.takeTimes > 1) {
    ws.push(
      `首级已按 maxSingleTakeMl 拆分为 ${motherInfo.takeTimes} 次吸取合并,本级相对不确定度按 √${motherInfo.takeTimes} 倍膨胀(约 ${((motherInfo.uInflation - 1) * 100).toFixed(1)}% 额外)`,
    );
  }
  const unconfirmedTools = steps.filter(
    (s) => !s.pipette.pdfConfirmed || !s.flask.pdfConfirmed,
  );
  if (unconfirmedTools.length > 0) {
    ws.push(
      '方案中部分器具允差尚未经 PDF / 检定证书核对(B 级 JJG 196-2006 及自备可调工具多为占位或推算值)。' +
        '正式报告或作业指导书使用前,请核对 JJG 196-2006 原文或该器具的检定证书。',
    );
  }
  return ws;
}

// =========================================================================
//  元数据导出
// =========================================================================

export const DILUTION_STANDARD_REFS = {
  jjg196: {
    id: JJG_196_2006.id,
    tables: {
      flaskA: JJG_196_2006.clauses.volumetricFlaskA.pageRef,
      pipetteA: JJG_196_2006.clauses.singleMarkPipetteA.pageRef,
    },
  },
  jjf1059: {
    id: 'JJF 1059.1-2012',
    clauses: [
      '均匀分布 u = a / √3(4.3.2.2)',
      '扩展不确定度 U = k·u_c,k=2(5.3)',
    ],
  },
} as const;
