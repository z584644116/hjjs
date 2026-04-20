/**
 * 烟气折算计算器
 * 将实测污染物浓度折算到基准氧含量下的浓度
 * 公式: C_ref = C_measured × (21 - O2_ref) / (21 - O2_measured)
 *
 * 依据: GB 9078 / GB 13271 / GB 16171 等固定污染源排放标准
 */

import { roundHalfToEven } from './calculators/common';
import { CalculationWarning, FormulaMeta } from './calculators/types';

// =========================================================================
// 类型定义
// =========================================================================

export interface FlueGasConversionInput {
  measuredConcentration: number;
  measuredO2: number;
  referenceO2: number;
  /** 浓度基准: dry=干基, wet=湿基, unknown=未确定 */
  concentrationBasis?: 'dry' | 'wet' | 'unknown';
  /** 氧含量基准说明 */
  oxygenBasisNote?: string;
}

export interface FlueGasConversionResult {
  // 核心结果
  convertedConcentration: number;
  conversionFactor: number;
  rawConversionFactor: number;
  // 输入回显
  measuredConcentration: number;
  measuredO2: number;
  referenceO2: number;
  // 警告列表
  warnings: CalculationWarning[];
  // 干湿基提示
  basisNote: string;
  // 公式元数据
  meta: FormulaMeta;
}

/**
 * 烟气氧折算计算
 */
export function calculateFlueGasConversion(
  input: FlueGasConversionInput
): FlueGasConversionResult | { error: string } {
  const warnings: CalculationWarning[] = [];
  const { measuredConcentration, measuredO2, referenceO2 } = input;

  // 输入校验
  if (measuredConcentration == null || Number.isNaN(measuredConcentration)) {
    return { error: '请输入实测污染物浓度' };
  }

  if (referenceO2 == null || Number.isNaN(referenceO2)) {
    return { error: '请输入基准氧含量(%)' };
  }

  if (measuredO2 == null || Number.isNaN(measuredO2)) {
    return { error: '请输入实测氧含量(%)' };
  }

  // 氧含量范围校验
  if (referenceO2 < 0 || referenceO2 > 21) {
    return { error: '基准氧含量必须在 0~21% 之间' };
  }

  if (measuredO2 < 0 || measuredO2 > 21) {
    return { error: '实测氧含量必须在 0~21% 之间' };
  }

  // 浓度非负校验
  if (measuredConcentration < 0) {
    return { error: '实测污染物浓度不能为负值' };
  }

  // 危险校验：实测氧接近21%
  if (measuredO2 >= 20.5) {
    return {
      error: `实测氧含量 ${measuredO2}% 接近空气氧含量(21%)，折算系数异常，结果不可靠。请核查测量数据。`,
    };
  }

  // 分母为零校验
  if (measuredO2 >= 21) {
    return { error: '实测氧含量必须小于 21%(否则公式分母为零或负值)' };
  }

  // 高氧警告
  if (measuredO2 > 19) {
    warnings.push({
      level: 'warning',
      message: `实测氧含量较高 (${measuredO2}%)，氧折算会显著放大浓度`,
      suggestion: '请核查工况和氧含量数据，确保测量准确性',
    });
  }

  // 氧差过小警告
  const o2Difference = 21 - measuredO2;
  if (Math.abs(o2Difference) < 0.5) {
    warnings.push({
      level: 'danger',
      message: `氧差过小 (${o2Difference.toFixed(2)}%)，折算结果可能失真`,
      suggestion: '请确认实测氧含量数据无误',
    });
  }

  // 计算折算系数
  const numerator = 21 - referenceO2;
  const denominator = 21 - measuredO2;
  const rawConversionFactor = numerator / denominator;
  const conversionFactor = roundHalfToEven(rawConversionFactor, 4);

  // 计算折算浓度
  const rawConverted = measuredConcentration * rawConversionFactor;
  const convertedConcentration = roundHalfToEven(rawConverted, 2);

  // 干湿基提示
  let basisNote = '';
  const basis = input.concentrationBasis || 'unknown';
  switch (basis) {
    case 'dry':
      basisNote = '浓度为干基浓度，适用标准为干基折算';
      break;
    case 'wet':
      basisNote = '浓度为湿基浓度，湿基折算需注意标准是否允许';
      warnings.push({
        level: 'info',
        message: '湿基浓度折算需确认排放标准是否允许湿基折算',
      });
      break;
    case 'unknown':
    default:
      basisNote = '浓度基准未确定，需按排放标准确认是干基还是湿基';
      warnings.push({
        level: 'warning',
        message: '浓度基准未确定，应按排放标准明确是干基还是湿基',
      });
  }

  const meta: FormulaMeta = {
    formulaName: '烟气氧折算公式',
    formulaText: 'C_ref = C_measured × (21 - O2_ref) / (21 - O2_measured)',
    formulaType: 'standard-method',
    resultLevel: 'internal-check',
    references: ['GB 9078', 'GB 13271', 'GB 16171', 'HJ/T 397'],
    applicability: [
      '固定污染源废气排放浓度折算',
      '有组织排放监测',
    ],
    limitations: [
      '仅适用于氧折算，不含工况、湿度等其他修正',
      '需确认浓度基准(干基/湿基)与排放标准一致',
      '实测氧含量接近21%时折算结果不可靠',
    ],
  };

  return {
    convertedConcentration,
    conversionFactor,
    rawConversionFactor,
    measuredConcentration,
    measuredO2,
    referenceO2,
    warnings,
    basisNote,
    meta,
  };
}

// =========================================================================
// 导出旧版接口以兼容
// =========================================================================

export interface LegacyFlueGasConversionResult {
  convertedConcentration: number;
  conversionFactor: number;
}

/**
 * @deprecated 请使用 calculateFlueGasConversion(input: FlueGasConversionInput)
 */
export function calculateFlueGasConversionLegacy(
  measuredConcentration: number,
  referenceO2: number,
  measuredO2: number
): LegacyFlueGasConversionResult | { error: string } {
  const result = calculateFlueGasConversion({
    measuredConcentration,
    measuredO2,
    referenceO2,
  });

  if ('error' in result) {
    return result;
  }

  return {
    convertedConcentration: result.convertedConcentration,
    conversionFactor: result.conversionFactor,
  };
}
