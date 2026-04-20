import { CalculationError, EPSILON, roundTo } from './common';
import { CalculationWarning, FormulaMeta } from './types';

export interface RsdResult {
  count: number;
  average: number;
  standardDeviation: number;
  /** 相对标准偏差 %，当平均值 ≈ 0 时为 null */
  rsdPercent: number | null;
  warnings: CalculationWarning[];
  meta: FormulaMeta;
}

/**
 * 相对标准偏差 RSD = 样本标准偏差 / |平均值| × 100%。
 * 当平均值接近 0 时，RSD 不适用，仅返回平均值与样本标准偏差。
 */
export function calculateRsd(values: number[]): RsdResult | CalculationError {
  const validValues = values.filter(Number.isFinite);
  if (validValues.length < 2) return { error: 'RSD 至少需要 2 个有效测定值' };

  const warnings: CalculationWarning[] = [];
  const average = validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
  const variance = validValues.reduce((sum, value) => sum + (value - average) ** 2, 0) / (validValues.length - 1);
  const standardDeviation = Math.sqrt(variance);

  if (validValues.length < 6) {
    warnings.push({
      level: 'info',
      message: `样本量 ${validValues.length} 偏少（建议 ≥6）`,
      suggestion: '样本量较少时 RSD 估计不稳定，建议增加平行测定次数',
    });
  }

  // 平均值接近 0：RSD 不适用，降级为仅显示 s
  let rsdPercent: number | null = null;
  if (Math.abs(average) < EPSILON) {
    warnings.push({
      level: 'warning',
      message: '平均值接近 0，相对标准偏差不适用',
      suggestion: '请改用绝对标准偏差 s 评估精密度，或检查数据是否合理',
    });
  } else {
    rsdPercent = roundTo((standardDeviation / Math.abs(average)) * 100, 2);
    if (rsdPercent > 30) {
      warnings.push({
        level: 'warning',
        message: `RSD = ${rsdPercent}% 偏大`,
        suggestion: '一般水质/大气常规分析 RSD 宜 <10%，痕量或生物参数可适当放宽',
      });
    }
  }

  const meta: FormulaMeta = {
    formulaName: '相对标准偏差 RSD',
    formulaText: 'RSD(%) = s / |mean| × 100, s = √[Σ(xi - mean)² / (n - 1)]',
    formulaType: 'quality-control',
    resultLevel: 'internal-check',
    references: ['HJ 168-2020', 'GB/T 27025'],
    applicability: ['平行样精密度评价', '方法比对质控', '标准曲线分析'],
    limitations: [
      '仅适用于同一真值附近的重复测定',
      '平均值接近 0 时 RSD 不适用',
      '样本量建议 ≥6，否则估计不稳定',
    ],
  };

  return {
    count: validValues.length,
    average: roundTo(average, 6),
    standardDeviation: roundTo(standardDeviation, 6),
    rsdPercent,
    warnings,
    meta,
  };
}
