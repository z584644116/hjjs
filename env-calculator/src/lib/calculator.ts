/**
 * 采样嘴径计算器
 * 根据烟气流速和仪器流量范围，推荐合适的采样嘴直径
 *
 * 依据: GB/T 16157 / HJ/T 397
 */

import { SAMPLING_MOUTH_SPECS, PROTECTION_POWER_FACTOR } from '@/constants';
import { CalculationInput, CalculationResult } from '@/types';
import { roundTo } from './calculators/common';
import { CalculationWarning, FormulaMeta } from './calculators/types';

// =========================================================================
// 类型定义
// =========================================================================

export type MouthRecommendLevel = 'recommended' | 'acceptable' | 'not-recommended';

export interface MouthCandidate {
  diameterMm: number;
  requiredFlowLMin: number;
  isInRange: boolean;
  deviationFromTarget: number; // 偏离目标流量的百分比
  level: MouthRecommendLevel;
  reason: string;
}

export interface SamplingMouthResult {
  // 基础数据
  dryGasVelocity: number;
  // 推荐嘴径
  recommendedDiameter: number;
  recommendedFlowLMin: number;
  recommendedLevel: MouthRecommendLevel;
  // 全部候选嘴径
  candidates: MouthCandidate[];
  // 仪器流量范围
  instrumentFlowRange: { min: number; max: number };
  // 警告列表
  warnings: CalculationWarning[];
  // 公式元数据
  meta: FormulaMeta;
}

// =========================================================================
// 计算函数
// =========================================================================

/**
 * 计算采样嘴径推荐
 *
 * 改进: 不再简单选择"≤计算值的最大嘴径"，
 * 而是遍历所有候选嘴径，计算所需流量，评估是否在仪器范围内，
 * 并推荐最优方案。
 */
export function calculateSamplingMouth(
  input: CalculationInput,
  maxFlowRate: number,
  minFlowRate?: number
): SamplingMouthResult {
  const { smokeVelocity, moistureContent, samplingType } = input;
  const warnings: CalculationWarning[] = [];

  // 干烟气流速计算: V_d = V_w × (1 - X_w)
  const dryGasVelocity = smokeVelocity * (1 - moistureContent / 100);

  // 湿度校验
  if (moistureContent < 0 || moistureContent > 100) {
    warnings.push({
      level: 'warning',
      message: `含湿量 ${moistureContent}% 超出正常范围(0-100%)`,
    });
  }

  if (moistureContent > 20) {
    warnings.push({
      level: 'info',
      message: `含湿量较高 (${moistureContent}%)，湿烟气对采样可能有影响`,
    });
  }

  // 流速校验
  if (dryGasVelocity <= 0) {
    warnings.push({
      level: 'danger',
      message: '干烟气流速为0或负值，无法计算采样嘴径',
    });
  }

  // 获取对应采样类型的嘴径库
  const availableDiameters = samplingType === 'normal'
    ? SAMPLING_MOUTH_SPECS.normal
    : SAMPLING_MOUTH_SPECS.lowConcentration;

  // 仪器流量范围
  const instrumentMax = maxFlowRate;
  const instrumentMin = minFlowRate ?? maxFlowRate * 0.2; // 默认最小为最大的20%
  const targetFlow = instrumentMax; // 目标流量设为最大流量

  // 遍历所有候选嘴径
  const candidates: MouthCandidate[] = availableDiameters.map(diameterMm => {
    const requiredFlow = calculateRequiredFlow(diameterMm, dryGasVelocity);
    const deviationFromTarget = ((requiredFlow - targetFlow) / targetFlow) * 100;

    // 判断是否在仪器流量范围内
    const isInRange = requiredFlow >= instrumentMin && requiredFlow <= instrumentMax;

    // 评估推荐级别
    let level: MouthRecommendLevel;
    let reason: string;

    if (!isInRange) {
      level = 'not-recommended';
      if (requiredFlow < instrumentMin) {
        reason = `所需流量低于仪器最小流量(${instrumentMin} L/min)`;
      } else {
        reason = `所需流量超过仪器最大流量(${instrumentMax} L/min)`;
      }
    } else if (Math.abs(deviationFromTarget) <= 10) {
      level = 'recommended';
      reason = '流量在仪器推荐范围内，偏离目标流量<10%';
    } else if (Math.abs(deviationFromTarget) <= 30) {
      level = 'acceptable';
      reason = '流量在仪器范围内可用';
    } else {
      level = 'acceptable';
      reason = '流量偏离较大，建议调整采样条件';
    }

    return {
      diameterMm,
      requiredFlowLMin: roundTo(requiredFlow, 2),
      isInRange,
      deviationFromTarget: roundTo(deviationFromTarget, 1),
      level,
      reason,
    };
  });

  // 选择最优嘴径
  const recommended = selectBestMouth(candidates, targetFlow);

  // 添加额外警告
  if (recommended.level !== 'recommended') {
    warnings.push({
      level: 'warning',
      message: '当前条件下无最优推荐嘴径，请检查流量范围或调整采样条件',
    });
  }

  const meta: FormulaMeta = {
    formulaName: '采样嘴径计算',
    formulaText: 'd = 2×√(Q/(π×v×60×1000)), Q=m³/s, v=m/s',
    formulaType: 'standard-method',
    resultLevel: 'internal-check',
    references: ['GB/T 16157', 'HJ/T 397'],
    applicability: [
      '固定污染源废气采样嘴径选择',
      '等速采样流量计算',
    ],
    limitations: [
      '按干烟气流速计算，未考虑湿烟气影响',
      '需根据实际仪器流量范围选择',
      '采样嘴径还需考虑采样时间、采样体积等因素',
    ],
  };

  return {
    dryGasVelocity: roundTo(dryGasVelocity, 2),
    recommendedDiameter: recommended.diameterMm,
    recommendedFlowLMin: recommended.requiredFlowLMin,
    recommendedLevel: recommended.level,
    candidates,
    instrumentFlowRange: { min: instrumentMin, max: instrumentMax },
    warnings,
    meta,
  };
};

/**
 * 根据嘴径和流速计算所需采样流量
 */
function calculateRequiredFlow(diameterMm: number, velocityMs: number): number {
  // 嘴径转换: mm -> m
  const diameterM = diameterMm / 1000;
  // 截面积: A = π × (d/2)²
  const areaM2 = Math.PI * Math.pow(diameterM / 2, 2);
  // 流量: Q = v × A (m³/s)
  // 转换为 L/min: Q_L_min = Q_m3s × 60 × 1000
  const flowLMin = velocityMs * areaM2 * 60 * 1000;
  return flowLMin;
}

/**
 * 选择最优嘴径
 * 优先级:
 * 1. 在流量范围内
 * 2. 偏离目标流量最小
 * 3. 满足等速条件(90%-110%)
 */
function selectBestMouth(
  candidates: MouthCandidate[],
  targetFlow: number
): MouthCandidate {
  // 过滤在范围内的
  const inRange = candidates.filter(c => c.isInRange);

  if (inRange.length === 0) {
    // 没有在范围内的，选择偏离最小的
    return candidates.reduce((best, curr) =>
      Math.abs(curr.deviationFromTarget) < Math.abs(best.deviationFromTarget)
        ? curr
        : best
    );
  }

  // 选择最接近目标流量的
  return inRange.reduce((best, curr) =>
    Math.abs(curr.deviationFromTarget) < Math.abs(best.deviationFromTarget)
      ? curr
      : best
  );
}

// =========================================================================
// 兼容旧接口
// =========================================================================

export const calculateSamplingMouthLegacy = (
  input: CalculationInput,
  maxFlowRate: number
): CalculationResult => {
  const fullPowerResult = calculateSamplingMouth(input, maxFlowRate);
  // 保护功率: 以 85% 最大流量作为上限重新评估推荐嘴径
  const protectionMaxFlow = maxFlowRate * PROTECTION_POWER_FACTOR;
  const protectionResult = calculateSamplingMouth(input, protectionMaxFlow);
  return {
    dryGasVelocity: fullPowerResult.dryGasVelocity,
    fullPowerRecommendedDiameter: fullPowerResult.recommendedDiameter,
    protectionPowerRecommendedDiameter: protectionResult.recommendedDiameter,
    availableDiameters: fullPowerResult.candidates.map(c => c.diameterMm),
  };
};
