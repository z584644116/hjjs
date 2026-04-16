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

// =========================================================================
// 水处理扩展(工程设计常用)
// =========================================================================

export interface FoodToMicroorganismInput {
  influentBod: number;       // 进水 BOD₅ (mg/L)
  flowM3PerDay: number;      // 处理水量 Q (m³/d)
  reactorVolumeM3: number;   // 反应池有效容积 V (m³)
  mlvssMgL: number;          // MLVSS X (mg/L)
}

export interface FoodToMicroorganismResult {
  fm: number;                // F/M 比(kg BOD / kg MLVSS·d)
  totalMass: number;         // 反应池污泥量 V·X(kg)
  organicLoad: number;       // BOD 负荷 Q·S₀(kg/d)
  range: string;             // 工况判定
}

/**
 * F/M 比(BOD 负荷率):F/M = Q·S₀ / (V·X)
 * 典型工况:
 *   普通活性污泥 0.2~0.5
 *   延时曝气 <0.1
 *   高负荷 >0.5
 */
export function calculateFoodToMicroorganism(input: FoodToMicroorganismInput): FoodToMicroorganismResult | CalculationError {
  const s0Err = requireNonNegative(input.influentBod, '进水 BOD₅');
  if (s0Err) return s0Err;
  const qErr = requirePositive(input.flowM3PerDay, '处理水量 Q');
  if (qErr) return qErr;
  const vErr = requirePositive(input.reactorVolumeM3, '反应池容积 V');
  if (vErr) return vErr;
  const xErr = requirePositive(input.mlvssMgL, 'MLVSS');
  if (xErr) return xErr;

  // 单位换算:mg/L · m³/d = g/d = 1e-3 kg/d
  const organicLoad = input.influentBod * input.flowM3PerDay / 1000; // kg/d
  const totalMass = input.mlvssMgL * input.reactorVolumeM3 / 1000;   // kg
  const fm = organicLoad / totalMass;

  let range: string;
  if (fm < 0.1) range = '延时曝气负荷区间 (F/M < 0.1)';
  else if (fm <= 0.5) range = '普通活性污泥负荷区间 (0.1~0.5)';
  else range = '高负荷区间 (F/M > 0.5)';

  return {
    fm: roundTo(fm, 4),
    totalMass: roundTo(totalMass, 2),
    organicLoad: roundTo(organicLoad, 2),
    range,
  };
}

export interface SviInput {
  v30MlL: number;   // 30 min 沉降体积(mL/L)
  mlssMgL: number;  // MLSS(mg/L)
}

export interface SviResult {
  svi: number;
  status: 'normal' | 'bulking-risk' | 'sedimentation-weak';
  statusText: string;
}

/**
 * 污泥容积指数 SVI = V30 / MLSS × 1000,单位 mL/g
 *   100~150 正常;>200 污泥膨胀;<70 沉降过快(可能老化)。
 */
export function calculateSvi(input: SviInput): SviResult | CalculationError {
  const vErr = requireNonNegative(input.v30MlL, '30 min 沉降体积');
  if (vErr) return vErr;
  const mErr = requirePositive(input.mlssMgL, 'MLSS');
  if (mErr) return mErr;

  // V30 mL/L,MLSS mg/L,SVI = V30 / (MLSS/1000) = V30·1000/MLSS  (mL/g)
  const svi = input.v30MlL * 1000 / input.mlssMgL;
  let status: SviResult['status'];
  let statusText: string;
  if (svi < 70) {
    status = 'sedimentation-weak';
    statusText = 'SVI < 70,污泥可能老化或无机质过多';
  } else if (svi <= 150) {
    status = 'normal';
    statusText = 'SVI 70~150,沉降性能良好';
  } else {
    status = 'bulking-risk';
    statusText = 'SVI > 150,有污泥膨胀风险';
  }

  return { svi: roundTo(svi, 1), status, statusText };
}

export interface SrtInput {
  reactorVolumeM3: number;
  mlvssMgL: number;
  wastageFlowM3PerDay: number;
  wastageMlvssMgL: number;
  effluentFlowM3PerDay: number;
  effluentTssMgL: number;
}

export interface SrtResult {
  srtDays: number;
  massInReactor: number;
  wastedMass: number;
}

/**
 * 污泥龄 SRT = (V·X) / (Q_w·X_r + Q_e·X_e)
 *   V 反应池容积,X MLVSS,Q_w 剩余污泥流量,X_r 剩余污泥浓度,
 *   Q_e 出水量,X_e 出水 SS。
 * 推荐范围:
 *   硝化系统 SRT ≥ 10 d,常规 5~15 d。
 */
export function calculateSrt(input: SrtInput): SrtResult | CalculationError {
  const vErr = requirePositive(input.reactorVolumeM3, '反应池容积 V');
  if (vErr) return vErr;
  const xErr = requirePositive(input.mlvssMgL, 'MLVSS');
  if (xErr) return xErr;
  const qwErr = requireNonNegative(input.wastageFlowM3PerDay, '剩余污泥流量');
  if (qwErr) return qwErr;
  const xwErr = requireNonNegative(input.wastageMlvssMgL, '剩余污泥浓度');
  if (xwErr) return xwErr;
  const qeErr = requireNonNegative(input.effluentFlowM3PerDay, '出水流量');
  if (qeErr) return qeErr;
  const xeErr = requireNonNegative(input.effluentTssMgL, '出水 SS');
  if (xeErr) return xeErr;

  const massInReactor = input.reactorVolumeM3 * input.mlvssMgL / 1000;       // kg
  const wastedMass = (input.wastageFlowM3PerDay * input.wastageMlvssMgL
    + input.effluentFlowM3PerDay * input.effluentTssMgL) / 1000;             // kg/d
  if (wastedMass <= 0) return { error: '排出污泥量必须大于 0' };

  return {
    srtDays: roundTo(massInReactor / wastedMass, 2),
    massInReactor: roundTo(massInReactor, 2),
    wastedMass: roundTo(wastedMass, 4),
  };
}

export interface HrtInput {
  reactorVolumeM3: number;
  flowM3PerDay: number;
}

export interface HrtResult {
  hrtDays: number;
  hrtHours: number;
}

/**
 * 水力停留时间 HRT = V / Q。
 */
export function calculateHrt(input: HrtInput): HrtResult | CalculationError {
  const vErr = requirePositive(input.reactorVolumeM3, '反应池容积');
  if (vErr) return vErr;
  const qErr = requirePositive(input.flowM3PerDay, '处理水量');
  if (qErr) return qErr;

  const hrtDays = input.reactorVolumeM3 / input.flowM3PerDay;
  return {
    hrtDays: roundTo(hrtDays, 4),
    hrtHours: roundTo(hrtDays * 24, 2),
  };
}

export interface AorInput {
  flowM3PerDay: number;
  deltaBodMgL: number;
  deltaNh4MgL: number;
  /** 合成系数 a',碳化系数,典型 0.42。 */
  aCoeff: number;
  /** 硝化系数 b',典型 4.57。 */
  bCoeff: number;
  endogenousRespirationKg?: number; // 可选内源呼吸量 kg O₂/d
}

export interface AorResult {
  aorKgPerDay: number;
  carbonDemandKg: number;
  nitrificationDemandKg: number;
}

/**
 * 反应池实际需氧量 AOR:
 *   AOR = a'·Q·ΔBOD + b'·Q·ΔNH₄ - 1.42·R_endogenous
 *   单位:kg O₂/d(浓度乘 Q 已除 1000)
 * 典型 a' = 0.42,b' = 4.57。
 */
export function calculateAor(input: AorInput): AorResult | CalculationError {
  const qErr = requirePositive(input.flowM3PerDay, '处理水量');
  if (qErr) return qErr;
  const bodErr = requireNonNegative(input.deltaBodMgL, 'ΔBOD');
  if (bodErr) return bodErr;
  const nErr = requireNonNegative(input.deltaNh4MgL, 'ΔNH₄-N');
  if (nErr) return nErr;
  const aErr = requirePositive(input.aCoeff, '碳化系数 a');
  if (aErr) return aErr;
  const bErr = requirePositive(input.bCoeff, '硝化系数 b');
  if (bErr) return bErr;

  const carbon = input.aCoeff * input.flowM3PerDay * input.deltaBodMgL / 1000;
  const nitrify = input.bCoeff * input.flowM3PerDay * input.deltaNh4MgL / 1000;
  const endoRelease = (input.endogenousRespirationKg ?? 0) * 1.42;
  const aor = carbon + nitrify - endoRelease;

  return {
    aorKgPerDay: roundTo(aor, 2),
    carbonDemandKg: roundTo(carbon, 2),
    nitrificationDemandKg: roundTo(nitrify, 2),
  };
}

export interface SorInput {
  aorKgPerDay: number;
  /** 溶解氧传质修正系数 α,典型 0.6~0.9。 */
  alpha: number;
  /** 氧饱和折减 β,典型 0.95。 */
  beta: number;
  /** 工况平均溶解氧 C_L (mg/L)。 */
  workingDo: number;
  /** 工况温度下清水饱和 DO Cs_TH (mg/L)。 */
  saturationAtT: number;
  /** 20°C 清水饱和 DO Cs_20 (≈ 9.17)。 */
  saturation20C: number;
  /** 温度 T (℃)。 */
  temperatureC: number;
}

export interface SorResult {
  sorKgPerDay: number;
  factor: number;
}

/**
 * 标态需氧量 SOR:
 *   SOR = AOR × [Cs,20 / (α·(β·Cs,T - C_L))] × 1.024^(20-T)
 * 用于鼓风机供气量设计。
 */
export function calculateSor(input: SorInput): SorResult | CalculationError {
  const aErr = requireNonNegative(input.aorKgPerDay, 'AOR');
  if (aErr) return aErr;
  const alphaErr = requirePositive(input.alpha, 'α 系数');
  if (alphaErr) return alphaErr;
  const betaErr = requirePositive(input.beta, 'β 系数');
  if (betaErr) return betaErr;
  if (!Number.isFinite(input.workingDo) || input.workingDo < 0) return { error: '工况溶解氧必须 ≥ 0' };
  const csTErr = requirePositive(input.saturationAtT, '工况饱和 DO');
  if (csTErr) return csTErr;
  const cs20Err = requirePositive(input.saturation20C, '20℃ 饱和 DO');
  if (cs20Err) return cs20Err;
  if (!Number.isFinite(input.temperatureC)) return { error: '温度无效' };

  const effectiveDeficit = input.alpha * (input.beta * input.saturationAtT - input.workingDo);
  if (effectiveDeficit <= 0) return { error: '有效氧亏 α·(β·Cs,T - C_L) 必须 > 0' };

  const factor = (input.saturation20C / effectiveDeficit) * Math.pow(1.024, 20 - input.temperatureC);
  return {
    sorKgPerDay: roundTo(input.aorKgPerDay * factor, 2),
    factor: roundTo(factor, 4),
  };
}

export interface CoagulantDoseInput {
  flowM3PerDay: number;
  doseMgL: number;  // 投加浓度 mg/L (以药剂计)
}

export interface CoagulantDoseResult {
  dailyKg: number;
  yearlyTon: number;
}

/**
 * 混凝剂/药剂日投加量 = Q · c / 1000  (kg/d)
 */
export function calculateCoagulantDose(input: CoagulantDoseInput): CoagulantDoseResult | CalculationError {
  const qErr = requirePositive(input.flowM3PerDay, '处理水量');
  if (qErr) return qErr;
  const cErr = requireNonNegative(input.doseMgL, '投加浓度');
  if (cErr) return cErr;

  const dailyKg = input.flowM3PerDay * input.doseMgL / 1000;
  return {
    dailyKg: roundTo(dailyKg, 2),
    yearlyTon: roundTo(dailyKg * 365 / 1000, 2),
  };
}

export interface CtValueInput {
  concentrationMgL: number;
  contactMinutes: number;
}

export interface CtValueResult {
  ctValue: number;
  logRemovalGiardia: string;
  logRemovalVirus: string;
}

/**
 * CT 值(氯消毒有效性):CT = C × t,单位 mg·min/L
 * 粗分级(1 log 去除参考值,5℃ pH 7):
 *   游氯 Giardia 1-log 约 40 mg·min/L;4-log 约 170
 *   游氯 病毒    1-log 约 3;4-log 约 12
 */
export function calculateCtValue(input: CtValueInput): CtValueResult | CalculationError {
  const cErr = requireNonNegative(input.concentrationMgL, '氯浓度');
  if (cErr) return cErr;
  const tErr = requirePositive(input.contactMinutes, '接触时间');
  if (tErr) return tErr;

  const ct = input.concentrationMgL * input.contactMinutes;
  const giardiaLog = ct / 40;
  const virusLog = ct / 3;
  const format = (x: number) => x.toFixed(2);
  return {
    ctValue: roundTo(ct, 2),
    logRemovalGiardia: `${format(giardiaLog)} log`,
    logRemovalVirus: `${format(virusLog)} log`,
  };
}

export interface UvDoseInput {
  intensityMwCm2: number;  // UV 强度 mW/cm²
  contactSeconds: number;  // 接触时间 s
}

export interface UvDoseResult {
  dose: number;
  complianceUsepa: boolean;
  text: string;
}

/**
 * 紫外剂量 D = I × t,单位 mJ/cm² (= mW·s/cm²)。
 * USEPA 饮用水推荐 ≥ 40 mJ/cm²。
 */
export function calculateUvDose(input: UvDoseInput): UvDoseResult | CalculationError {
  const iErr = requirePositive(input.intensityMwCm2, '紫外强度');
  if (iErr) return iErr;
  const tErr = requirePositive(input.contactSeconds, '接触时间');
  if (tErr) return tErr;

  const dose = input.intensityMwCm2 * input.contactSeconds;
  const compliance = dose >= 40;
  return {
    dose: roundTo(dose, 2),
    complianceUsepa: compliance,
    text: compliance ? '≥ 40 mJ/cm²,满足饮用水 USEPA 推荐' : '< 40 mJ/cm²,低于饮用水推荐剂量',
  };
}

export interface EbctInput {
  carbonBedVolumeM3: number;
  flowM3PerHour: number;
}

export interface EbctResult {
  ebctMinutes: number;
  ebctSeconds: number;
}

/**
 * 活性炭空床接触时间 EBCT = V / Q。
 * 典型:水处理 5~30 min;VOC 深度处理推荐 ≥ 10 min。
 */
export function calculateEbct(input: EbctInput): EbctResult | CalculationError {
  const vErr = requirePositive(input.carbonBedVolumeM3, '活性炭床体积');
  if (vErr) return vErr;
  const qErr = requirePositive(input.flowM3PerHour, '处理水量(m³/h)');
  if (qErr) return qErr;

  // V(m³) / Q(m³/h) = h → × 60 = min
  const minutes = (input.carbonBedVolumeM3 / input.flowM3PerHour) * 60;
  return {
    ebctMinutes: roundTo(minutes, 2),
    ebctSeconds: roundTo(minutes * 60, 1),
  };
}

// =========================================================================
// 废气处理扩展(工程设计常用)
// =========================================================================

export interface EsPrecipitatorInput {
  collectingAreaM2: number;   // 总集尘面积 A
  flowM3PerSecond: number;    // 处理气量 Q
  /** 驱进速度 ωk (m/s),典型 0.05~0.15。 */
  migrationVelocity: number;
}

export interface EsPrecipitatorResult {
  sca: number;           // 比集尘面积 A/Q (m²/(m³/s))
  efficiency: number;    // Deutsch 效率(小数)
  efficiencyPercent: number;
}

/**
 * 静电除尘 Deutsch 方程:η = 1 - exp(-SCA · ωk)
 *   SCA(Specific Collection Area) = A / Q
 */
export function calculateEsPrecipitator(input: EsPrecipitatorInput): EsPrecipitatorResult | CalculationError {
  const aErr = requirePositive(input.collectingAreaM2, '集尘面积');
  if (aErr) return aErr;
  const qErr = requirePositive(input.flowM3PerSecond, '处理气量');
  if (qErr) return qErr;
  const wErr = requirePositive(input.migrationVelocity, '驱进速度');
  if (wErr) return wErr;

  const sca = input.collectingAreaM2 / input.flowM3PerSecond;
  const eta = 1 - Math.exp(-sca * input.migrationVelocity);
  return {
    sca: roundTo(sca, 2),
    efficiency: roundTo(eta, 4),
    efficiencyPercent: roundTo(eta * 100, 2),
  };
}

export interface BagFilterInput {
  flowM3PerMinute: number;  // 处理气量 Q (m³/min)
  filterAreaM2: number;     // 过滤面积 A (m²)
}

export interface BagFilterResult {
  airToClothRatio: number;  // Q/A (m/min)
  assessment: string;
}

/**
 * 袋式除尘气布比 A/C = Q/A,单位 m/min。
 *   常规:0.6~1.5 m/min;脉冲清灰可到 1.5~3.0;过高易穿透。
 */
export function calculateBagFilter(input: BagFilterInput): BagFilterResult | CalculationError {
  const qErr = requirePositive(input.flowM3PerMinute, '处理气量');
  if (qErr) return qErr;
  const aErr = requirePositive(input.filterAreaM2, '过滤面积');
  if (aErr) return aErr;

  const ratio = input.flowM3PerMinute / input.filterAreaM2;
  let assessment: string;
  if (ratio < 0.6) assessment = '气布比偏低,过滤面积富余';
  else if (ratio <= 1.5) assessment = '常规反吹/振打范围';
  else if (ratio <= 3.0) assessment = '脉冲喷吹适用范围';
  else assessment = '气布比过高,有穿透风险';

  return {
    airToClothRatio: roundTo(ratio, 3),
    assessment,
  };
}

export interface CycloneInput {
  gasViscosityPaS: number;     // μ,空气 20℃ ≈ 1.81e-5
  inletWidthM: number;         // 入口宽度 W
  inletVelocityMS: number;     // 入口气速 Vi
  particleDensityKgM3: number; // ρp
  effectiveTurns: number;      // Ne 有效旋转圈数,典型 5
}

export interface CycloneResult {
  d50Micron: number;  // 50% 分割粒径 μm
}

/**
 * 旋风分离 Lapple d50 = √[(9·μ·W) / (2π·N_e·V_i·ρ_p)]
 * 一般分级粒径 d50 ≈ 2~10 μm。
 */
export function calculateCyclone(input: CycloneInput): CycloneResult | CalculationError {
  const muErr = requirePositive(input.gasViscosityPaS, '气体粘度');
  if (muErr) return muErr;
  const wErr = requirePositive(input.inletWidthM, '入口宽度');
  if (wErr) return wErr;
  const vErr = requirePositive(input.inletVelocityMS, '入口气速');
  if (vErr) return vErr;
  const rhoErr = requirePositive(input.particleDensityKgM3, '颗粒密度');
  if (rhoErr) return rhoErr;
  const neErr = requirePositive(input.effectiveTurns, '有效旋转圈数');
  if (neErr) return neErr;

  const d50m = Math.sqrt(
    (9 * input.gasViscosityPaS * input.inletWidthM) /
    (2 * Math.PI * input.effectiveTurns * input.inletVelocityMS * input.particleDensityKgM3),
  );
  return {
    d50Micron: roundTo(d50m * 1e6, 3),
  };
}

export interface WetScrubberLgInput {
  liquidFlowM3PerHour: number;
  gasFlowM3PerHour: number;
}

export interface WetScrubberLgResult {
  lgRatio: number;  // L/G (L/m³)
  assessment: string;
}

/**
 * 湿法脱硫液气比 L/G = 液流量(m³/h)·1000 / 气流量(m³/h),单位 L/m³。
 * 石灰石/石灰法 10~20 L/m³ 常见。
 */
export function calculateWetScrubberLg(input: WetScrubberLgInput): WetScrubberLgResult | CalculationError {
  const lErr = requirePositive(input.liquidFlowM3PerHour, '液流量');
  if (lErr) return lErr;
  const gErr = requirePositive(input.gasFlowM3PerHour, '气流量');
  if (gErr) return gErr;

  const lg = input.liquidFlowM3PerHour * 1000 / input.gasFlowM3PerHour;
  let assessment: string;
  if (lg < 5) assessment = 'L/G 偏低,传质不足';
  else if (lg <= 25) assessment = '石灰石湿法常规范围';
  else assessment = 'L/G 偏高,能耗与水耗上升';

  return {
    lgRatio: roundTo(lg, 2),
    assessment,
  };
}

export interface CalciumSulfurInput {
  caInletMolPerHour: number;
  so2InletMolPerHour: number;
  so2RemovalPercent: number;
}

export interface CalciumSulfurResult {
  caSRatio: number;
  gypsumYieldKgPerHour: number;
}

/**
 * Ca/S 摩尔比与 CaSO₄·2H₂O 石膏产率。
 *   Ca/S = n_Ca / n_SO2
 *   理论石膏产量 = 脱除 SO2 mol/h × 172 g/mol(石膏摩尔质量)/ 1000 (kg/h)
 */
export function calculateCalciumSulfur(input: CalciumSulfurInput): CalciumSulfurResult | CalculationError {
  const caErr = requirePositive(input.caInletMolPerHour, 'Ca 进料摩尔流量');
  if (caErr) return caErr;
  const sErr = requirePositive(input.so2InletMolPerHour, 'SO₂ 摩尔流量');
  if (sErr) return sErr;
  if (!Number.isFinite(input.so2RemovalPercent) || input.so2RemovalPercent < 0 || input.so2RemovalPercent > 100) {
    return { error: '脱硫效率必须 0~100%' };
  }

  const ratio = input.caInletMolPerHour / input.so2InletMolPerHour;
  const removedMol = input.so2InletMolPerHour * input.so2RemovalPercent / 100;
  const gypsumKg = removedMol * 172 / 1000;
  return {
    caSRatio: roundTo(ratio, 3),
    gypsumYieldKgPerHour: roundTo(gypsumKg, 2),
  };
}

export interface ScrInput {
  nh3MolPerHour: number;
  noxMolPerHour: number;
  flowM3PerHour: number;
  catalystVolumeM3: number;
}

export interface ScrResult {
  nsr: number;
  ghsvPerHour: number;
  contactSeconds: number;
}

/**
 * SCR 氨氮比 NSR = n_NH3 / n_NOx。
 * 空速 GHSV = Q / V(1/h);接触时间 τ = 1/GHSV × 3600 (s)。
 */
export function calculateScr(input: ScrInput): ScrResult | CalculationError {
  const nh3Err = requireNonNegative(input.nh3MolPerHour, 'NH₃ 流量');
  if (nh3Err) return nh3Err;
  const noxErr = requirePositive(input.noxMolPerHour, 'NOx 流量');
  if (noxErr) return noxErr;
  const qErr = requirePositive(input.flowM3PerHour, '烟气流量');
  if (qErr) return qErr;
  const vErr = requirePositive(input.catalystVolumeM3, '催化剂体积');
  if (vErr) return vErr;

  const nsr = input.nh3MolPerHour / input.noxMolPerHour;
  const ghsv = input.flowM3PerHour / input.catalystVolumeM3;
  return {
    nsr: roundTo(nsr, 3),
    ghsvPerHour: roundTo(ghsv, 0),
    contactSeconds: roundTo(3600 / ghsv, 3),
  };
}

export interface RtoInput {
  preheatOutletC: number;
  combustionC: number;
  ambientInletC: number;
}

export interface RtoResult {
  thermalRecoveryPercent: number;
  temperatureRisePreheat: number;
  temperatureGapToBurner: number;
}

/**
 * RTO 热回收效率:
 *   η = (T_预热出 - T_进) / (T_燃烧室 - T_进) × 100%
 *   常规两床 RTO ≥ 95%;三床 ≥ 97%。
 */
export function calculateRtoEfficiency(input: RtoInput): RtoResult | CalculationError {
  if (!Number.isFinite(input.preheatOutletC) || !Number.isFinite(input.combustionC) || !Number.isFinite(input.ambientInletC)) {
    return { error: '所有温度必须为有效数值' };
  }
  if (input.combustionC <= input.ambientInletC) return { error: '燃烧室温度必须高于进气温度' };

  const eta = (input.preheatOutletC - input.ambientInletC) / (input.combustionC - input.ambientInletC) * 100;
  return {
    thermalRecoveryPercent: roundTo(eta, 2),
    temperatureRisePreheat: roundTo(input.preheatOutletC - input.ambientInletC, 1),
    temperatureGapToBurner: roundTo(input.combustionC - input.preheatOutletC, 1),
  };
}

export interface ActivatedCarbonIsothermInput {
  qMax: number;   // 最大单层吸附量 (mg/g)
  b: number;      // Langmuir 常数 (L/mg)
  cEquilibrium: number; // 平衡浓度 (mg/L)
}

export interface ActivatedCarbonIsothermResult {
  qEquilibrium: number;  // 平衡吸附量 (mg/g)
  saturationPercent: number;
}

/**
 * Langmuir 吸附等温线:q* = q_max·b·C / (1 + b·C)
 *   q_max、b 由实验测定,C 为当前浓度。
 */
export function calculateActivatedCarbonIsotherm(input: ActivatedCarbonIsothermInput): ActivatedCarbonIsothermResult | CalculationError {
  const qErr = requirePositive(input.qMax, '最大吸附量 q_max');
  if (qErr) return qErr;
  const bErr = requirePositive(input.b, 'Langmuir 常数 b');
  if (bErr) return bErr;
  const cErr = requireNonNegative(input.cEquilibrium, '平衡浓度');
  if (cErr) return cErr;

  const qEq = input.qMax * input.b * input.cEquilibrium / (1 + input.b * input.cEquilibrium);
  return {
    qEquilibrium: roundTo(qEq, 4),
    saturationPercent: roundTo((qEq / input.qMax) * 100, 2),
  };
}
