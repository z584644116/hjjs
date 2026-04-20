import { CalculationError, requireNonNegative, requirePositive, roundTo } from './common';
import { CalculationWarning, FormulaMeta, ResultLevel } from './types';

// =========================================================================
//  类型定义
// =========================================================================

export interface FlueGasVelocityInput {
  dynamicPressurePa: number;
  atmosphericPressureKPa: number;
  staticPressureKPa: number;
  temperatureC: number;
  pitotCoefficient?: number;
  gasDensityKgM3?: number;
}

export interface FlueGasVelocityResult {
  // 基础数据
  absolutePressureKPa: number;
  gasDensityKgM3: number;
  velocityMS: number;
  // 低动压警告
  lowDynamicPressureWarning: CalculationWarning | null;
  // 密度近似警告
  densityApproximationWarning: CalculationWarning | null;
  // 公式元数据
  meta: FormulaMeta;
}

export interface IsokineticFlowInput extends FlueGasVelocityInput {
  nozzleDiameterMm: number;
  actualFlowLMin: number;
}

export interface IsokineticFlowResult extends FlueGasVelocityResult {
  theoreticalFlowLMin: number;
  actualFlowLMin: number;
  deviationPercent: number;
  trackingRatePercent: number;
  isWithinTolerance: boolean;
  // 跟踪率判定详情
  toleranceRange: { min: number; max: number };
  // 相关警告
  outOfRangeWarning: CalculationWarning | null;
}

/**
 * 烟气流速计算
 * 公式: v = Kp × √(2×ΔP/ρ)
 * 依据: GB/T 16157 / HJ/T 397
 */
export function calculateFlueGasVelocity(input: FlueGasVelocityInput): FlueGasVelocityResult | CalculationError {
  const warnings: CalculationWarning[] = [];

  // 基础校验
  const dynamicError = requireNonNegative(input.dynamicPressurePa, '动压(Pa)');
  if (dynamicError) return dynamicError;

  if (input.dynamicPressurePa === 0) {
    return { error: '动压为 0，无法计算流速，请检查皮托管连接和仪表' };
  }

  // 低动压警告
  if (input.dynamicPressurePa < 5) {
    warnings.push({
      level: 'warning',
      message: `动压较低 (${input.dynamicPressurePa} Pa)，皮托管测量相对误差可能较大`,
      suggestion: '建议检查测量条件，或使用更高精度微压计',
    });
  }

  const atmosphericError = requirePositive(input.atmosphericPressureKPa, '大气压(kPa)');
  if (atmosphericError) return atmosphericError;

  if (!Number.isFinite(input.staticPressureKPa)) {
    return { error: '请输入有效的静压' };
  }
  if (!Number.isFinite(input.temperatureC) || input.temperatureC <= -273.15) {
    return { error: '请输入有效的烟气温度' };
  }

  // 温度范围校验
  if (input.temperatureC < -20) {
    warnings.push({
      level: 'warning',
      message: `温度过低 (${input.temperatureC}℃)，可能超出常规测量范围`,
    });
  }
  if (input.temperatureC > 600) {
    warnings.push({
      level: 'warning',
      message: `温度较高 (${input.temperatureC}℃)，请确认仪表量程`,
    });
  }

  const pitotCoefficient = input.pitotCoefficient ?? 0.84;
  const pitotError = requirePositive(pitotCoefficient, '皮托管系数');
  if (pitotError) return pitotError;

  const absolutePressureKPa = input.atmosphericPressureKPa + input.staticPressureKPa;
  if (absolutePressureKPa <= 0) {
    return { error: '大气压与静压之和必须大于 0' };
  }

  // 计算烟气密度（按干空气近似）
  const calculatedDensity = 1.293 * (absolutePressureKPa / 101.325) * (273.15 / (273.15 + input.temperatureC));
  const gasDensityKgM3 = input.gasDensityKgM3 && input.gasDensityKgM3 > 0
    ? input.gasDensityKgM3
    : calculatedDensity;

  // 密度近似警告（仅当使用计算密度时触发）
  let densityApproximationWarning: CalculationWarning | null = null;
  if (!input.gasDensityKgM3 || input.gasDensityKgM3 <= 0) {
    densityApproximationWarning = {
      level: 'warning',
      message: '烟气密度按空气近似计算，未使用实测密度',
      suggestion: '复杂烟气(高湿、高CO₂)或正式采样应按标准方法/仪器参数修正',
    };
  }

  const densityError = requirePositive(gasDensityKgM3, '烟气密度');
  if (densityError) return densityError;

  // 动压法流速: v = Kp × √(2×ΔP/ρ)
  const velocityMS = pitotCoefficient * Math.sqrt((2 * input.dynamicPressurePa) / gasDensityKgM3);

  const lowDynamicPressureWarning = warnings.find(w => w.message.includes('动压较低')) || null;

  return {
    absolutePressureKPa: roundTo(absolutePressureKPa, 3),
    gasDensityKgM3: roundTo(gasDensityKgM3, 4),
    velocityMS: roundTo(velocityMS, 2),
    lowDynamicPressureWarning,
    densityApproximationWarning,
    meta: {
      formulaName: '动压法烟气流速',
      formulaText: 'v = Kp × √(2×ΔP/ρ)',
      formulaType: 'standard-method',
      resultLevel: 'internal-check',
      references: ['GB/T 16157', 'HJ/T 397'],
      applicability: ['固定污染源废气排放监测', '管道内气体流速测量'],
      limitations: [
        '烟气密度按干空气近似，未考虑水汽、颗粒物影响',
        '需使用经检定/校准的皮托管',
      ],
    },
  };
}

/**
 * 等速采样跟踪率计算
 * 判定标准: 90% ~ 110% (可自定义 tolerancePercent)
 */
export function calculateIsokineticFlow(input: IsokineticFlowInput, tolerancePercent = 10): IsokineticFlowResult | CalculationError {
  const velocity = calculateFlueGasVelocity(input);
  if ('error' in velocity) return velocity;

  const diameterError = requirePositive(input.nozzleDiameterMm, '采样嘴直径(mm)');
  if (diameterError) return diameterError;

  const flowError = requireNonNegative(input.actualFlowLMin, '实际采样流量(L/min)');
  if (flowError) return flowError;

  const nozzleDiameterM = input.nozzleDiameterMm / 1000;
  const nozzleAreaM2 = Math.PI * (nozzleDiameterM / 2) ** 2;

  // 等速理论采样流量: Q = v × A × 60 × 1000
  // 单位: m/s × m² × 60 × 1000 = L/min
  const theoreticalFlowLMin = velocity.velocityMS * nozzleAreaM2 * 60 * 1000;

  const deviationPercent = theoreticalFlowLMin > 0
    ? ((input.actualFlowLMin - theoreticalFlowLMin) / theoreticalFlowLMin) * 100
    : 0;
  const trackingRatePercent = theoreticalFlowLMin > 0
    ? (input.actualFlowLMin / theoreticalFlowLMin) * 100
    : 0;

  const isWithinTolerance = Math.abs(deviationPercent) <= tolerancePercent;
  const toleranceMin = 100 - tolerancePercent;
  const toleranceMax = 100 + tolerancePercent;

  // 跟踪率越限警告
  let outOfRangeWarning: CalculationWarning | null = null;
  if (!isWithinTolerance) {
    const level = Math.abs(trackingRatePercent - 100) > 20 ? 'danger' : 'warning';
    outOfRangeWarning = {
      level,
      message: `等速跟踪率 ${roundTo(trackingRatePercent, 1)}% 不在 ${toleranceMin}%~${toleranceMax}% 合格范围内`,
      suggestion: trackingRatePercent < 100
        ? '实际流量偏低，可能导致大颗粒采样不足，建议增大采样流量或换用较大直径采样嘴'
        : '实际流量偏高，可能导致小颗粒穿透损失，建议减小采样流量或换用较小直径采样嘴',
    };
  }

  return {
    ...velocity,
    theoreticalFlowLMin: roundTo(theoreticalFlowLMin, 2),
    actualFlowLMin: roundTo(input.actualFlowLMin, 2),
    deviationPercent: roundTo(deviationPercent, 2),
    trackingRatePercent: roundTo(trackingRatePercent, 2),
    isWithinTolerance,
    toleranceRange: { min: toleranceMin, max: toleranceMax },
    outOfRangeWarning,
    meta: {
      ...velocity.meta,
      formulaName: '等速采样跟踪率',
      formulaText: '跟踪率 = Q实/Q理×100%, 合格范围 90%~110%',
      limitations: [
        ...(velocity.meta.limitations || []),
        '需在等速条件下采样，否则颗粒物采样存在偏差',
        '本计算基于工况条件，非标况流量',
      ],
    },
  };
}
