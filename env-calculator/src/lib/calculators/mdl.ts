/**
 * MDL方法检出限计算
 * 公式: MDL = s × t(α=0.01, n-1, one-sided)
 *
 * 依据: HJ 168-2020 / EPA MDL方法 / ICH Q2(R1)
 */

import { requireNonNegative, requirePositive, roundTo } from './common';
import { CalculationWarning, FormulaMeta } from './types';

// =========================================================================
// 类型定义
// =========================================================================

export type MdlConfidenceMode = 'one-sided-99' | 'one-sided-95';

export interface MdlManualInput {
  standardDeviation: number;
  tValue: number;
}

export interface MdlManualResult {
  methodDetectionLimit: number;
  meta: FormulaMeta;
}

export interface MdlReplicateResult {
  // 基础统计
  count: number;
  degreesOfFreedom: number;
  mean: number;
  standardDeviation: number;
  // MDL计算
  tValue: number;
  methodDetectionLimit: number;
  tValueSource: string;
  // 置信区间
  confidenceLevel: number;
  confidenceTValue: number;
  confidenceLower: number;
  confidenceUpper: number;
  // 数据范围
  min: number;
  max: number;
  range: number;
  // 警告和建议
  warnings: CalculationWarning[];
  assumptions: string[];
  // 公式元数据
  meta: FormulaMeta;
}

// =========================================================================
// t分布临界值表
// =========================================================================

/**
 * MDL t值表 (α=0.01 单侧)
 * 来源: EPA MDL方法 / HJ 168-2020 附录
 */
const MDL_T_99_ONE_SIDED: Record<number, number> = {
  6: 3.143, 7: 2.998, 8: 2.896, 9: 2.821, 10: 2.764,
  11: 2.718, 12: 2.681, 13: 2.65, 14: 2.624, 15: 2.602,
  16: 2.583, 17: 2.567, 18: 2.552, 19: 2.539,
};

/**
 * 置信区间t值表 (α=0.05 双侧)
 */
const T_95_TWO_SIDED: Record<number, number> = {
  6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
  11: 2.201, 12: 2.179, 13: 2.16, 14: 2.145, 15: 2.131,
  16: 2.12, 17: 2.11, 18: 2.101, 19: 2.093,
};

/**
 * 获取MDL t值
 */
export function getMdlTValue(sampleCount: number): number {
  if (sampleCount < 7) {
    return MDL_T_99_ONE_SIDED[6]; // 使用n=7的近似值
  }
  return MDL_T_99_ONE_SIDED[Math.min(sampleCount, 19)] ?? 3.143;
}

/**
 * 获取置信区间t值
 */
export function getConfidenceTValue(sampleCount: number): number {
  if (sampleCount < 7) {
    return T_95_TWO_SIDED[6];
  }
  return T_95_TWO_SIDED[Math.min(sampleCount, 19)] ?? 2.447;
}

// =========================================================================
// 计算函数
// =========================================================================

/**
 * 手动输入标准差计算MDL
 */
export function calculateMethodDetectionLimit(
  input: MdlManualInput
): MdlManualResult {
  const methodDetectionLimit = input.standardDeviation * input.tValue;

  return {
    methodDetectionLimit: roundTo(methodDetectionLimit, 6),
    meta: {
      formulaName: 'MDL(手动输入s和t)',
      formulaText: 'MDL = s × t(α=0.01, n-1, one-sided)',
      formulaType: 'quality-control',
      resultLevel: 'internal-check',
      references: ['EPA MDL方法', 'HJ 168-2020'],
      limitations: ['需人工提供标准差和t值'],
    },
  };
}

/**
 * 从平行样数据计算MDL
 *
 * 注意: 本模块仅进行MDL统计计算，不等于完整的方法检出限确认程序。
 * 正式MDL应按现行有效标准、作业指导书和实验室质量体系执行。
 */
export function calculateMdlFromReplicates(
  values: number[]
): MdlReplicateResult | { error: string } {
  const warnings: CalculationWarning[] = [];
  const assumptions: string[] = [];

  const validValues = values.filter(Number.isFinite);

  // 样本量校验
  if (validValues.length < 2) {
    return { error: 'MDL计算至少需要2个有效平行样数据' };
  }

  // 样本量警告
  if (validValues.length < 7) {
    warnings.push({
      level: 'warning',
      message: `样本量较小 (n=${validValues.length})，MDL统计可靠性较低`,
      suggestion: '建议按HJ 168-2020要求使用至少7个平行样数据',
    });
  }

  if (validValues.length > 20) {
    return { error: 'MDL原始数据最多支持20个有效值' };
  }

  const count = validValues.length;
  const degreesOfFreedom = count - 1;

  // 检查是否所有值相同
  const meanRaw = validValues.reduce((sum, value) => sum + value, 0) / count;
  const allSame = validValues.every(v => Math.abs(v - validValues[0]) < 1e-10);

  if (allSame) {
    return {
      error: `所有平行样测定值完全相同 (${validValues[0]})，无法计算有效MDL`,
    };
  }

  // 计算方差和标准差(样本标准差)
  const variance = validValues.reduce(
    (sum, value) => sum + (value - meanRaw) ** 2, 0
  ) / (count - 1);
  const standardDeviationRaw = Math.sqrt(variance);

  if (standardDeviationRaw === 0) {
    return {
      error: '标准差为0，无法计算有效MDL',
    };
  }

  // 获取t值
  const tValue = getMdlTValue(count);
  const confidenceTValue = getConfidenceTValue(count);

  // 计算MDL
  const methodDetectionLimit = tValue * standardDeviationRaw;

  // 置信区间
  const confidenceMargin = (confidenceTValue * standardDeviationRaw) / Math.sqrt(count);

  // 数据范围
  const minRaw = Math.min(...validValues);
  const maxRaw = Math.max(...validValues);

  // 假设条件
  assumptions.push('数据服从正态分布');
  assumptions.push('各次测定相互独立');
  assumptions.push('测定条件(仪器、试剂、操作者等)保持一致');

  // 检出限水平提示
  const meanToMdlRatio = meanRaw / methodDetectionLimit;
  if (meanToMdlRatio < 2) {
    warnings.push({
      level: 'info',
      message: '平行样均值接近MDL，检出限附近数据波动较大属于正常现象',
    });
  }

  // 警告:本模块仅统计计算
  warnings.push({
    level: 'warning',
    message: '本模块仅进行MDL统计计算，不等于完整的方法检出限确认程序',
    suggestion: '正式MDL应按现行有效标准、作业指导书和实验室质量体系执行',
  });

  const meta: FormulaMeta = {
    formulaName: 'MDL(平行样法)',
    formulaText: 'MDL = s × t(α=0.01, n-1, one-sided)',
    formulaType: 'quality-control',
    resultLevel: 'internal-check',
    references: ['HJ 168-2020', 'EPA MDL方法', 'ISO 11971'],
    applicability: ['实验室方法检出限统计', '方法验证'],
    limitations: [
      '仅完成MDL统计计算，不含完整方法确认程序',
      '需使用实际样品或与实际样品基体相同的模拟样品',
      '检出限附近数据不应用于定量报告',
      '需定期核查MDL有效性',
    ],
  };

  return {
    count,
    degreesOfFreedom,
    mean: roundTo(meanRaw, 6),
    standardDeviation: roundTo(standardDeviationRaw, 6),
    tValue,
    methodDetectionLimit: roundTo(methodDetectionLimit, 6),
    tValueSource: `t(α=0.01, df=${degreesOfFreedom}, one-sided)`,
    confidenceLevel: 95,
    confidenceTValue,
    confidenceLower: roundTo(meanRaw - confidenceMargin, 6),
    confidenceUpper: roundTo(meanRaw + confidenceMargin, 6),
    min: roundTo(minRaw, 6),
    max: roundTo(maxRaw, 6),
    range: roundTo(maxRaw - minRaw, 6),
    warnings,
    assumptions,
    meta,
  };
}

// =========================================================================
// 辅助函数
// =========================================================================

/**
 * 获取t值表信息
 */
export function getMdlTValueInfo(sampleCount: number): {
  tValue: number;
  confidenceTValue: number;
  isEstimate: boolean;
} {
  const isEstimate = sampleCount < 7 || sampleCount > 19;
  return {
    tValue: getMdlTValue(sampleCount),
    confidenceTValue: getConfidenceTValue(sampleCount),
    isEstimate,
  };
}
