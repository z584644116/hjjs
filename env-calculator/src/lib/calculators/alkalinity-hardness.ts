import { CalculationError, EPSILON, requireNonNegative, requirePositive, roundTo } from './common';
import { CalculationWarning, FormulaMeta } from './types';

// =========================================================================
// 类型定义
// =========================================================================

/**
 * 滴定类型（用于结果描述与 endpointNote 提示）。
 *   - alkalinity-total      总碱度（以 CaCO₃ 计，甲基橙终点，pH ≈ 4.2~4.5）
 *   - alkalinity-phenolphthalein 酚酞碱度（酚酞终点，pH ≈ 8.2~8.3）
 *   - hardness-total        总硬度（EDTA 络合滴定，铬黑 T 终点）
 *   - hardness-calcium      钙硬度（EDTA 络合滴定，钙指示剂终点）
 *   - generic               通用 (V×C×K/Vs)，由用户自定义因子
 */
export type TitrationType =
  | 'alkalinity-total'
  | 'alkalinity-phenolphthalein'
  | 'hardness-total'
  | 'hardness-calcium'
  | 'generic';

export interface TitrationAsCaco3Input {
  titrationType?: TitrationType;
  /** 滴定液消耗体积 V (mL) */
  titrantVolumeMl: number;
  /** 空白滴定消耗体积 V0 (mL)，默认 0 */
  blankVolumeMl?: number;
  /** 滴定液浓度 C (mol/L) */
  titrantConcentrationMolL: number;
  /** 样品体积 Vs (mL) */
  sampleVolumeMl: number;
  /**
   * 当量换算因子 K (mg/mmol)。
   * - 以 CaCO₃ 计，滴定反应 1:1（如 HCl 中和 CaCO₃）：K = 100 mg/mmol ÷ 2 = 50（常用 50）
   * - EDTA 络合硬度：K = 100.09 mg/mmol（MgCO₃/CaCO₃）
   * 不传则按 titrationType 给出默认：碱度=50，硬度=100.09，generic 必须显式给出
   */
  equivalentFactor?: number;
  /**
   * 稀释倍数 f（样品预先稀释时），默认 1。
   * 最终浓度 = 计算值 × f
   */
  dilutionFactor?: number;
}

export interface TitrationAsCaco3Result {
  titrationType: TitrationType;
  netTitrantVolumeMl: number;
  /** 等效浓度，单位 mg/L（按 equivalentFactor 表达，常用以 CaCO₃ 计） */
  concentrationMgLAsCaco3: number;
  /** 等效浓度，单位 mmol/L */
  concentrationMmolL: number;
  /** 使用的当量因子 K(mg/mmol) */
  equivalentFactor: number;
  /** 使用的稀释倍数 */
  dilutionFactor: number;
  /** 终点说明 */
  endpointNote: string;
  warnings: CalculationWarning[];
  meta: FormulaMeta;
}

// =========================================================================
// 缺省参数
// =========================================================================

const DEFAULT_EQUIVALENT_FACTOR: Record<TitrationType, number | null> = {
  'alkalinity-total': 50,                 // 以 CaCO₃ 计，1:1 反应的常用因子
  'alkalinity-phenolphthalein': 50,
  'hardness-total': 100.09,               // EDTA 1:1 络合，以 CaCO₃ 计
  'hardness-calcium': 100.09,
  generic: null,
};

const ENDPOINT_NOTE: Record<TitrationType, string> = {
  'alkalinity-total': '总碱度：甲基橙（或溴甲酚绿-甲基红）终点，pH ≈ 4.2~4.5，颜色由黄转橙红',
  'alkalinity-phenolphthalein': '酚酞碱度：酚酞终点，pH ≈ 8.2~8.3，颜色由红转无色',
  'hardness-total': '总硬度：EDTA 络合滴定，铬黑 T 指示剂，颜色由葡萄红转纯蓝',
  'hardness-calcium': '钙硬度：EDTA 络合滴定，钙指示剂(或钙红)，颜色由红转蓝紫',
  generic: '通用滴定：请根据实际指示剂确认终点 pH / 颜色变化',
};

const TITRATION_LABEL: Record<TitrationType, string> = {
  'alkalinity-total': '总碱度(以 CaCO₃ 计)',
  'alkalinity-phenolphthalein': '酚酞碱度(以 CaCO₃ 计)',
  'hardness-total': '总硬度(以 CaCO₃ 计)',
  'hardness-calcium': '钙硬度(以 CaCO₃ 计)',
  generic: '滴定浓度',
};

// =========================================================================
// 主函数
// =========================================================================

/**
 * 通用酸碱/络合滴定法：浓度(mg/L) = (V − V₀) × C × K × f / Vs
 * 默认 K=50 时结果以 CaCO₃ 计。
 */
export function calculateTitrationAsCaco3(input: TitrationAsCaco3Input): TitrationAsCaco3Result | CalculationError {
  const titrationType: TitrationType = input.titrationType ?? 'alkalinity-total';
  const warnings: CalculationWarning[] = [];

  const volumeError = requireNonNegative(input.titrantVolumeMl, '滴定体积 V');
  if (volumeError) return volumeError;

  const blankVolumeMl = input.blankVolumeMl ?? 0;
  const blankError = requireNonNegative(blankVolumeMl, '空白滴定体积 V₀');
  if (blankError) return blankError;

  const concentrationError = requirePositive(input.titrantConcentrationMolL, '滴定液浓度 C');
  if (concentrationError) return concentrationError;

  const sampleError = requirePositive(input.sampleVolumeMl, '样品体积 Vs');
  if (sampleError) return sampleError;

  // 当量因子：优先采用显式输入，否则按类型取默认
  let equivalentFactor = input.equivalentFactor;
  if (equivalentFactor == null || !Number.isFinite(equivalentFactor)) {
    const def = DEFAULT_EQUIVALENT_FACTOR[titrationType];
    if (def == null) return { error: '通用滴定必须显式提供当量换算因子 K (mg/mmol)' };
    equivalentFactor = def;
  }
  if (equivalentFactor <= 0) return { error: '当量换算因子 K 必须大于 0' };

  const dilutionFactor = input.dilutionFactor ?? 1;
  if (!(dilutionFactor > 0) || !Number.isFinite(dilutionFactor)) {
    return { error: '稀释倍数 f 必须为大于 0 的有效数' };
  }

  const netTitrantVolumeMl = input.titrantVolumeMl - blankVolumeMl;
  if (netTitrantVolumeMl < 0) return { error: '滴定体积不能小于空白滴定体积' };
  if (netTitrantVolumeMl < EPSILON) {
    warnings.push({
      level: 'warning',
      message: '扣除空白后滴定体积 ≈ 0',
      suggestion: '可能样品浓度低于方法定量下限，或空白过大，建议复测',
    });
  }

  // 常规消耗量提示（建议 3~20 mL 之间，落在移液管量程中部）
  if (netTitrantVolumeMl > 0 && netTitrantVolumeMl < 1) {
    warnings.push({
      level: 'warning',
      message: `滴定体积 ${netTitrantVolumeMl.toFixed(3)} mL 过小`,
      suggestion: '建议加大取样量或降低滴定液浓度，使消耗量落在 3~20 mL 区间',
    });
  } else if (netTitrantVolumeMl > 25) {
    warnings.push({
      level: 'info',
      message: `滴定体积 ${netTitrantVolumeMl.toFixed(2)} mL 偏大`,
      suggestion: '建议减少取样量或提高滴定液浓度，以避免超出 25 mL 滴定管容量',
    });
  }

  // 空白占比偏大：提示
  if (input.titrantVolumeMl > 0 && blankVolumeMl / input.titrantVolumeMl > 0.3) {
    warnings.push({
      level: 'warning',
      message: `空白消耗占比 ${((blankVolumeMl / input.titrantVolumeMl) * 100).toFixed(1)}% 偏高`,
      suggestion: '检查试剂/超纯水质量，或重新做空白',
    });
  }

  // 稀释倍数提示
  if (dilutionFactor > 1) {
    warnings.push({
      level: 'info',
      message: `结果已按稀释倍数 f = ${dilutionFactor} 还原为原样品浓度`,
    });
  }

  // 浓度（mmol/L） = (V − V₀) × C × f / Vs
  const concentrationMmolL = (netTitrantVolumeMl * input.titrantConcentrationMolL * dilutionFactor) / input.sampleVolumeMl * 1000;
  // 浓度（mg/L） = mmol/L × K
  const concentrationMgLAsCaco3 = concentrationMmolL * equivalentFactor;

  const meta: FormulaMeta = {
    formulaName: `${TITRATION_LABEL[titrationType]}`,
    formulaText: 'ρ(mg/L) = (V − V₀) × C × K × f × 1000 / Vs',
    formulaType: 'standard-method',
    resultLevel: 'reportable-check',
    references: [
      'GB/T 15451-2006 (工业循环冷却水总碱度)',
      'HJ 535-2009 / HJ 537-2009',
      'GB/T 7477-1987 (水质 钙和镁总量的测定 EDTA 滴定法)',
    ],
    applicability: [
      '地表水/地下水/饮用水 碱度与硬度常规分析',
      '实验室内部质控与校准',
    ],
    limitations: [
      '样品含高浓度有机酸/络合剂时终点不清晰',
      '滴定液浓度需定期标定',
      '高色度/浊度样品建议采用电位滴定',
    ],
  };

  return {
    titrationType,
    netTitrantVolumeMl: roundTo(netTitrantVolumeMl, 3),
    concentrationMgLAsCaco3: roundTo(concentrationMgLAsCaco3, 3),
    concentrationMmolL: roundTo(concentrationMmolL, 4),
    equivalentFactor,
    dilutionFactor,
    endpointNote: ENDPOINT_NOTE[titrationType],
    warnings,
    meta,
  };
}
