import { CalculationError, requireNonNegative, requirePositive, roundTo } from './common';

export interface FlueGasVelocityInput {
  dynamicPressurePa: number;
  atmosphericPressureKPa: number;
  staticPressureKPa: number;
  temperatureC: number;
  pitotCoefficient?: number;
  gasDensityKgM3?: number;
}

export interface FlueGasVelocityResult {
  absolutePressureKPa: number;
  gasDensityKgM3: number;
  velocityMS: number;
}

export interface IsokineticFlowInput extends FlueGasVelocityInput {
  nozzleDiameterMm: number;
  actualFlowLMin: number;
}

export interface IsokineticFlowResult extends FlueGasVelocityResult {
  theoreticalFlowLMin: number;
  actualFlowLMin: number;
  deviationPercent: number;
  isWithinTolerance: boolean;
}

/**
 * 烟气流速与等速采样验证。
 * Pd: Pa, Ba/Ps: kPa, ts: °C, ρs: kg/m³, Vs: m/s, Q: L/min。
 */
export function calculateFlueGasVelocity(input: FlueGasVelocityInput): FlueGasVelocityResult | CalculationError {
  const dynamicError = requireNonNegative(input.dynamicPressurePa, '动压');
  if (dynamicError) return dynamicError;

  const atmosphericError = requirePositive(input.atmosphericPressureKPa, '大气压');
  if (atmosphericError) return atmosphericError;

  if (!Number.isFinite(input.staticPressureKPa)) return { error: '请输入有效的静压' };
  if (!Number.isFinite(input.temperatureC) || input.temperatureC <= -273.15) return { error: '请输入有效的烟气温度' };

  const pitotCoefficient = input.pitotCoefficient ?? 0.84;
  const pitotError = requirePositive(pitotCoefficient, '皮托管系数');
  if (pitotError) return pitotError;

  const absolutePressureKPa = input.atmosphericPressureKPa + input.staticPressureKPa;
  if (absolutePressureKPa <= 0) return { error: '大气压与静压之和必须大于 0' };

  const calculatedDensity = 1.293 * (absolutePressureKPa / 101.325) * (273.15 / (273.15 + input.temperatureC));
  const gasDensityKgM3 = input.gasDensityKgM3 && input.gasDensityKgM3 > 0
    ? input.gasDensityKgM3
    : calculatedDensity;

  const densityError = requirePositive(gasDensityKgM3, '烟气密度');
  if (densityError) return densityError;

  const velocityMS = pitotCoefficient * Math.sqrt((2 * input.dynamicPressurePa) / gasDensityKgM3);

  return {
    absolutePressureKPa: roundTo(absolutePressureKPa, 3),
    gasDensityKgM3: roundTo(gasDensityKgM3, 4),
    velocityMS: roundTo(velocityMS, 2),
  };
}

export function calculateIsokineticFlow(input: IsokineticFlowInput, tolerancePercent = 10): IsokineticFlowResult | CalculationError {
  const velocity = calculateFlueGasVelocity(input);
  if ('error' in velocity) return velocity;

  const diameterError = requirePositive(input.nozzleDiameterMm, '采样嘴直径');
  if (diameterError) return diameterError;

  const flowError = requireNonNegative(input.actualFlowLMin, '实际采样流量');
  if (flowError) return flowError;

  const nozzleDiameterM = input.nozzleDiameterMm / 1000;
  const nozzleAreaM2 = Math.PI * (nozzleDiameterM / 2) ** 2;
  const theoreticalFlowLMin = velocity.velocityMS * nozzleAreaM2 * 60 * 1000;
  const deviationPercent = theoreticalFlowLMin > 0
    ? ((input.actualFlowLMin - theoreticalFlowLMin) / theoreticalFlowLMin) * 100
    : 0;

  return {
    ...velocity,
    theoreticalFlowLMin: roundTo(theoreticalFlowLMin, 2),
    actualFlowLMin: roundTo(input.actualFlowLMin, 2),
    deviationPercent: roundTo(deviationPercent, 2),
    isWithinTolerance: Math.abs(deviationPercent) <= tolerancePercent,
  };
}
