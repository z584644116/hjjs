// Gas unit conversion utilities: ppm ↔ mg/m^3 with temperature & pressure correction
// Gases: SO2, NO, NO2, CO, NMHC (NMHC treated as carbon-based: ppmC ↔ mgC/m^3)
//
// 支持三种换算条件：
//   lab-25C：实验室条件(25 ℃，101.325 kPa)
//   standard-0C：标准状态(0 ℃，101.325 kPa)
//   custom：用户自定义温度/压力

import { CalculationWarning, FormulaMeta } from './calculators/types';

export type GasKey = 'SO2' | 'NO' | 'NO2' | 'CO' | 'NMHC';

export interface GasInfo {
  key: GasKey;
  name: string;
  molarMass_g_mol: number;
  note?: string;
}

export const GAS_LIST: GasInfo[] = [
  { key: 'SO2', name: '二氧化硫 (SO₂)', molarMass_g_mol: 64.066 },
  { key: 'NO',  name: '一氧化氮 (NO)',  molarMass_g_mol: 30.006 },
  { key: 'NO2', name: '二氧化氮 (NO₂)', molarMass_g_mol: 46.0055 },
  { key: 'CO',  name: '一氧化碳 (CO)',  molarMass_g_mol: 28.010 },
  { key: 'NMHC',name: '非甲烷总烃 (NMHC)', molarMass_g_mol: 12.011, note: '以碳计（ppmC ↔ mgC/m³）' },
];

export function getGasInfo(key: GasKey): GasInfo {
  const info = GAS_LIST.find(g => g.key === key);
  if (!info) throw new Error(`Unknown gas key: ${key}`);
  return info;
}

export function roundHalfToEven(x: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  const n = x * factor;
  const floor = Math.floor(n);
  const frac = n - floor;
  const EPS = 1e-12;
  if (Math.abs(frac - 0.5) < EPS) {
    const even = (floor % 2 === 0) ? floor : floor + 1;
    return even / factor;
  }
  return Math.round(n) / factor;
}

const R_L_ATM = 0.082057338;

export function ppmToMgPerM3(ppm: number, gas: GasKey, temperatureC = 25, pressureKPa = 101.325): number {
  const { molarMass_g_mol: M } = getGasInfo(gas);
  const T_K = temperatureC + 273.15;
  const P_atm = pressureKPa / 101.325;
  return ppm * M * P_atm / (R_L_ATM * T_K);
}

export function mgPerM3ToPpm(mgPerM3: number, gas: GasKey, temperatureC = 25, pressureKPa = 101.325): number {
  const { molarMass_g_mol: M } = getGasInfo(gas);
  const T_K = temperatureC + 273.15;
  const P_atm = pressureKPa / 101.325;
  return mgPerM3 * (R_L_ATM * T_K) / (M * P_atm);
}

export type GasConditionMode = 'lab-25C' | 'standard-0C' | 'custom';

export interface GasConvertParams {
  gas: GasKey;
  inputValue: number;
  inputUnit: 'ppm' | 'mg/m3';
  /**
   * 温度/压力换算条件。
   *   lab-25C：25 ℃、101.325 kPa（实验室常用）
   *   standard-0C：0 ℃、101.325 kPa（固定污染源标准状态）
   *   custom：由 temperatureC / pressureKPa 指定
   */
  conditionMode?: GasConditionMode;
  temperatureC?: number;
  pressureKPa?: number;
  decimals?: number;
}

export interface GasConvertResult {
  gas: GasInfo;
  inputValue: number;
  inputUnit: 'ppm' | 'mg/m3';
  outputValue: number;
  outputUnit: 'ppm' | 'mg/m3';
  temperatureC: number;
  pressureKPa: number;
  conditionMode: GasConditionMode;
  conditionLabel: string;
  molarVolumeLPerMol: number;
  warnings: CalculationWarning[];
  meta: FormulaMeta;
}

const GAS_META: FormulaMeta = {
  formulaName: '理想气体单位换算',
  formulaText: 'mg/m³ = ppm × M × P_atm / (R × T_K)',
  formulaType: 'teaching-reference',
  resultLevel: 'internal-check',
  references: ['HJ 91.1', 'HJ 38', 'HJ 870'],
  applicability: [
    '实验室/环境空气/固定污染源常规无机气体单位换算',
    '示意性教学与数据录入辅助',
  ],
  limitations: [
    '仅适用于理想气体近似，强吸附性、分子量可变的混合物(如 VOC)不可直接使用单一分子量',
    '固定污染源排放浓度还可能涉及标态/干基/氧折算，需单独处理',
    '实际温压不同则换算结果不同，务必与数据报告使用条件一致',
  ],
};

function resolveCondition(params: GasConvertParams): { temperatureC: number; pressureKPa: number; mode: GasConditionMode; label: string } {
  const mode = params.conditionMode ?? 'lab-25C';
  if (mode === 'lab-25C') {
    return { temperatureC: 25, pressureKPa: 101.325, mode, label: '实验室条件：25 ℃、101.325 kPa' };
  }
  if (mode === 'standard-0C') {
    return { temperatureC: 0, pressureKPa: 101.325, mode, label: '标准状态：0 ℃、101.325 kPa' };
  }
  const temperatureC = params.temperatureC ?? 25;
  const pressureKPa = params.pressureKPa ?? 101.325;
  return {
    temperatureC,
    pressureKPa,
    mode,
    label: `自定义条件：${temperatureC} ℃、${pressureKPa} kPa`,
  };
}

export function convertGasUnits(params: GasConvertParams): GasConvertResult | { error: string } {
  const { gas, inputValue, inputUnit, decimals = 2 } = params;
  if (!Number.isFinite(inputValue) || inputValue < 0) {
    return { error: '输入浓度必须为非负有效数字' };
  }
  const { temperatureC, pressureKPa, mode, label } = resolveCondition(params);
  if (!Number.isFinite(temperatureC) || temperatureC <= -273.15) {
    return { error: '请输入有效的温度(℃)' };
  }
  if (!Number.isFinite(pressureKPa) || pressureKPa <= 0) {
    return { error: '请输入有效的压力(kPa)' };
  }

  const warnings: CalculationWarning[] = [];
  if (mode === 'custom') {
    warnings.push({
      level: 'info',
      message: `当前为自定义条件(${temperatureC} ℃，${pressureKPa} kPa)，请与数据报告条件保持一致`,
    });
  }
  if (gas === 'NMHC') {
    warnings.push({
      level: 'warning',
      message: 'NMHC 已按碳计(M = 12.011 g/mol)换算',
      suggestion: '如需报告混合物表观浓度，应使用方法规定的基准 (如以甲烷计、以丙烷计)',
    });
  }
  if (pressureKPa < 50 || pressureKPa > 110) {
    warnings.push({
      level: 'warning',
      message: `压力 ${pressureKPa} kPa 偏离常规范围`,
      suggestion: '常见大气压约 80~105 kPa，请确认单位是否为 kPa',
    });
  }

  const T_K = temperatureC + 273.15;
  const P_atm = pressureKPa / 101.325;
  const molarVolumeLPerMol = (R_L_ATM * T_K) / P_atm;

  let outputValue: number;
  let outputUnit: 'ppm' | 'mg/m3';
  if (inputUnit === 'ppm') {
    outputValue = ppmToMgPerM3(inputValue, gas, temperatureC, pressureKPa);
    outputUnit = 'mg/m3';
  } else {
    outputValue = mgPerM3ToPpm(inputValue, gas, temperatureC, pressureKPa);
    outputUnit = 'ppm';
  }

  return {
    gas: getGasInfo(gas),
    inputValue,
    inputUnit,
    outputValue: roundHalfToEven(outputValue, decimals),
    outputUnit,
    temperatureC,
    pressureKPa,
    conditionMode: mode,
    conditionLabel: label,
    molarVolumeLPerMol: roundHalfToEven(molarVolumeLPerMol, 4),
    warnings,
    meta: GAS_META,
  };
}
