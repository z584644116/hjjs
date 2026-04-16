import { CalculationError, requireNonNegative, requirePositive, roundTo } from './common';

export interface AeratedPondBodInput {
  influentBodMgL: number;
  rateConstantPerDay: number;
  hrtDays: number;
}

export interface AeratedPondBodResult {
  effluentBodMgL: number;
  removalPercent: number;
}

export function calculateAeratedPondBod(input: AeratedPondBodInput): AeratedPondBodResult | CalculationError {
  const c0Error = requireNonNegative(input.influentBodMgL, '进水BOD浓度');
  if (c0Error) return c0Error;

  const kError = requirePositive(input.rateConstantPerDay, '反应速率常数');
  if (kError) return kError;

  const tError = requireNonNegative(input.hrtDays, '水力停留时间');
  if (tError) return tError;

  const effluentBodMgL = input.influentBodMgL / (1 + input.rateConstantPerDay * input.hrtDays);
  const removalPercent = input.influentBodMgL > 0
    ? ((input.influentBodMgL - effluentBodMgL) / input.influentBodMgL) * 100
    : 0;

  return {
    effluentBodMgL: roundTo(effluentBodMgL, 3),
    removalPercent: roundTo(removalPercent, 2),
  };
}

export interface TemperatureCorrectionInput {
  baseRateConstant20C: number;
  temperatureCoefficient: number;
  temperatureC: number;
}

export interface TemperatureCorrectionResult {
  correctedRateConstant: number;
}

export function calculateTemperatureCorrectedRate(input: TemperatureCorrectionInput): TemperatureCorrectionResult | CalculationError {
  const kError = requirePositive(input.baseRateConstant20C, '20℃基准反应速率常数');
  if (kError) return kError;

  const thetaError = requirePositive(input.temperatureCoefficient, '温度系数');
  if (thetaError) return thetaError;

  if (!Number.isFinite(input.temperatureC)) return { error: '请输入有效的水温' };

  return {
    correctedRateConstant: roundTo(input.baseRateConstant20C * input.temperatureCoefficient ** (input.temperatureC - 20), 6),
  };
}

export interface FacultativePondNitrogenInput {
  influentNitrogenMgL: number;
  baseRateConstant20C: number;
  temperatureCoefficient: number;
  temperatureC: number;
  hrtDays: number;
  ph: number;
}

export interface FacultativePondNitrogenResult {
  correctedRateConstant: number;
  exponentTerm: number;
  effluentNitrogenMgL: number;
  removalPercent: number;
}

export function calculateFacultativePondNitrogen(input: FacultativePondNitrogenInput): FacultativePondNitrogenResult | CalculationError {
  const nitrogenError = requireNonNegative(input.influentNitrogenMgL, '进水总氮浓度');
  if (nitrogenError) return nitrogenError;

  const hrtError = requireNonNegative(input.hrtDays, '水力停留时间');
  if (hrtError) return hrtError;

  if (!Number.isFinite(input.ph) || input.ph < 0 || input.ph > 14) return { error: 'pH 应在 0-14 之间' };

  const kResult = calculateTemperatureCorrectedRate({
    baseRateConstant20C: input.baseRateConstant20C,
    temperatureCoefficient: input.temperatureCoefficient,
    temperatureC: input.temperatureC,
  });
  if ('error' in kResult) return kResult;

  const exponentTerm = input.hrtDays + 60.6 * (input.ph - 6.6);
  const effluentNitrogenMgL = input.influentNitrogenMgL * Math.exp(-kResult.correctedRateConstant * exponentTerm);
  const removalPercent = input.influentNitrogenMgL > 0
    ? ((input.influentNitrogenMgL - effluentNitrogenMgL) / input.influentNitrogenMgL) * 100
    : 0;

  return {
    correctedRateConstant: kResult.correctedRateConstant,
    exponentTerm: roundTo(exponentTerm, 3),
    effluentNitrogenMgL: roundTo(effluentNitrogenMgL, 3),
    removalPercent: roundTo(removalPercent, 2),
  };
}

export interface AlkalinityBalanceInput {
  ammoniaNitrogenMgL: number;
  nitrateNitrogenMgL: number;
}

export interface AlkalinityBalanceResult {
  alkalinityConsumedMgLAsCaCO3: number;
  alkalinityProducedMgLAsCaCO3: number;
  netAlkalinityMgLAsCaCO3: number;
  needsSupplement: boolean;
}

export function calculateAlkalinityBalance(input: AlkalinityBalanceInput): AlkalinityBalanceResult | CalculationError {
  const nh3Error = requireNonNegative(input.ammoniaNitrogenMgL, '氨氮浓度');
  if (nh3Error) return nh3Error;

  const no3Error = requireNonNegative(input.nitrateNitrogenMgL, '硝酸盐氮浓度');
  if (no3Error) return no3Error;

  const consumed = input.ammoniaNitrogenMgL * 7.14;
  const produced = input.nitrateNitrogenMgL * 3.57;
  const net = produced - consumed;

  return {
    alkalinityConsumedMgLAsCaCO3: roundTo(consumed, 2),
    alkalinityProducedMgLAsCaCO3: roundTo(produced, 2),
    netAlkalinityMgLAsCaCO3: roundTo(net, 2),
    needsSupplement: net < 0,
  };
}

export interface EbprRatioInput {
  codMgL: number;
  tpMgL: number;
  bod5MgL: number;
  rbcodMgL: number;
}

export interface EbprRatioResult {
  codTpRatio: number;
  bodTpRatio: number;
  rbcodTpRatio: number;
  codStatus: 'sufficient' | 'marginal' | 'insufficient';
  bodStatus: 'sufficient' | 'insufficient';
  rbcodStatus: 'sufficient' | 'marginal' | 'insufficient';
}

export function calculateEbprRatios(input: EbprRatioInput): EbprRatioResult | CalculationError {
  const tpError = requirePositive(input.tpMgL, '总磷浓度');
  if (tpError) return tpError;

  const codError = requireNonNegative(input.codMgL, 'COD');
  if (codError) return codError;

  const bodError = requireNonNegative(input.bod5MgL, 'BOD₅');
  if (bodError) return bodError;

  const rbcodError = requireNonNegative(input.rbcodMgL, 'rbCOD');
  if (rbcodError) return rbcodError;

  const codTpRatio = input.codMgL / input.tpMgL;
  const bodTpRatio = input.bod5MgL / input.tpMgL;
  const rbcodTpRatio = input.rbcodMgL / input.tpMgL;

  return {
    codTpRatio: roundTo(codTpRatio, 2),
    bodTpRatio: roundTo(bodTpRatio, 2),
    rbcodTpRatio: roundTo(rbcodTpRatio, 2),
    codStatus: codTpRatio >= 30 ? 'sufficient' : codTpRatio >= 20 ? 'marginal' : 'insufficient',
    bodStatus: bodTpRatio >= 18 ? 'sufficient' : 'insufficient',
    rbcodStatus: rbcodTpRatio >= 16 ? 'sufficient' : rbcodTpRatio >= 10 ? 'marginal' : 'insufficient',
  };
}

export interface MinimumLiquidGasRatioInput {
  inletGasMoleFraction: number;
  outletGasMoleFraction: number;
  equilibriumLiquidConcentration: number;
  inletLiquidConcentration: number;
}

export interface MinimumLiquidGasRatioResult {
  minimumRatio: number;
  recommendedRatioLow: number;
  recommendedRatioHigh: number;
}

export function calculateMinimumLiquidGasRatio(input: MinimumLiquidGasRatioInput): MinimumLiquidGasRatioResult | CalculationError {
  const yiError = requireNonNegative(input.inletGasMoleFraction, '进气相污染物摩尔分数');
  if (yiError) return yiError;

  const yoError = requireNonNegative(input.outletGasMoleFraction, '出气相污染物摩尔分数');
  if (yoError) return yoError;

  const xoError = requireNonNegative(input.equilibriumLiquidConcentration, '液相平衡浓度');
  if (xoError) return xoError;

  const xiError = requireNonNegative(input.inletLiquidConcentration, '进液相污染物浓度');
  if (xiError) return xiError;

  if (input.inletGasMoleFraction < input.outletGasMoleFraction) return { error: '进气摩尔分数不能小于出气摩尔分数' };

  const denominator = input.equilibriumLiquidConcentration - input.inletLiquidConcentration;
  if (denominator <= 0) return { error: '液相平衡浓度必须大于进液相污染物浓度' };

  const minimumRatio = (input.inletGasMoleFraction - input.outletGasMoleFraction) / denominator;

  return {
    minimumRatio: roundTo(minimumRatio, 6),
    recommendedRatioLow: roundTo(minimumRatio * 1.2, 6),
    recommendedRatioHigh: roundTo(minimumRatio * 1.5, 6),
  };
}

export interface PackedTowerNtuInput {
  absorptionFactor: number;
  equilibriumSlope: number;
  inletGasMoleFraction: number;
  outletGasMoleFraction: number;
  inletLiquidConcentration: number;
}

export interface PackedTowerNtuResult {
  ntu: number;
  denominatorTerm: number;
  logarithmArgument: number;
}

export function calculatePackedTowerNtu(input: PackedTowerNtuInput): PackedTowerNtuResult | CalculationError {
  const afError = requirePositive(input.absorptionFactor, '吸收因子');
  if (afError) return afError;

  const mError = requirePositive(input.equilibriumSlope, '气液平衡线斜率');
  if (mError) return mError;

  const yiError = requireNonNegative(input.inletGasMoleFraction, '进气相污染物摩尔分数');
  if (yiError) return yiError;

  const yoError = requireNonNegative(input.outletGasMoleFraction, '出气相污染物摩尔分数');
  if (yoError) return yoError;

  const xiError = requireNonNegative(input.inletLiquidConcentration, '液相进污染物浓度');
  if (xiError) return xiError;

  const denominatorTerm = 1 - 1 / input.absorptionFactor;
  if (Math.abs(denominatorTerm) < 1e-10) return { error: '吸收因子 AF 不能等于 1' };

  const inletDrivingForce = input.inletGasMoleFraction - input.equilibriumSlope * input.inletLiquidConcentration;
  const outletDrivingForce = input.outletGasMoleFraction - input.equilibriumSlope * input.inletLiquidConcentration;
  if (inletDrivingForce <= 0 || outletDrivingForce <= 0) return { error: '气相驱动力必须大于 0' };

  const logarithmArgument = (inletDrivingForce / outletDrivingForce) / denominatorTerm + 1 / input.absorptionFactor;
  if (logarithmArgument <= 0) return { error: '对数项必须大于 0，请检查 AF 与进出口浓度' };

  return {
    ntu: roundTo(Math.log(logarithmArgument) / denominatorTerm, 4),
    denominatorTerm: roundTo(denominatorTerm, 6),
    logarithmArgument: roundTo(logarithmArgument, 6),
  };
}

export interface PackedTowerPressureDropInput {
  packingConstantC: number;
  liquidLoadingFactor: number;
  liquidSuperficialRate: number;
  packingFactor: number;
  gasSuperficialRate: number;
  gasDensity: number;
}

export interface PackedTowerPressureDropResult {
  pressureDropInH2OPerFt: number;
}

export function calculatePackedTowerPressureDrop(input: PackedTowerPressureDropInput): PackedTowerPressureDropResult | CalculationError {
  const cError = requirePositive(input.packingConstantC, '填料常数 c');
  if (cError) return cError;

  const jlError = requirePositive(input.liquidLoadingFactor, '填料常数 jL');
  if (jlError) return jlError;

  const lError = requirePositive(input.liquidSuperficialRate, '液相表观流速');
  if (lError) return lError;

  const fError = requirePositive(input.packingFactor, '填料常数 f');
  if (fError) return fError;

  const gError = requirePositive(input.gasSuperficialRate, '气相表观流速');
  if (gError) return gError;

  const rhoError = requirePositive(input.gasDensity, '气体密度');
  if (rhoError) return rhoError;

  return {
    pressureDropInH2OPerFt: roundTo(
      input.packingConstantC
      * (input.liquidLoadingFactor * input.liquidSuperficialRate / 3600)
      * (input.packingFactor * input.gasSuperficialRate) ** 2
      / input.gasDensity,
      6,
    ),
  };
}
