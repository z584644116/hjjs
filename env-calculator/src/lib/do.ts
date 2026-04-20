// DO saturation calculation module
// - Uses standard-atmosphere saturation DO table (0..40 C, at 1 atm)
// - Adjusts for actual atmospheric pressure using water vapour pressure correction
// - Implements Excel-equivalent rounding for the final standard value

import { CalculationWarning, FormulaMeta } from './calculators/types';

export const STANDARD_ATM_KPA = 101.325;

// Integer-degree table (mg/L) at 1 atm for 0..40 C, taken from 溶解氧.md
// For fractional temperatures, linear interpolation between nearest integers is used.
const DO_TABLE_1ATM: number[] = [
  14.62, // 0
  14.22, // 1
  13.83, // 2
  13.46, // 3
  13.11, // 4
  12.77, // 5
  12.45, // 6
  12.14, // 7
  11.84, // 8
  11.56, // 9
  11.29, // 10
  11.03, // 11
  10.78, // 12
  10.54, // 13
  10.31, // 14
  10.08, // 15
  9.87,  // 16
  9.66,  // 17
  9.47,  // 18
  9.28,  // 19
  9.09,  // 20
  8.91,  // 21
  8.74,  // 22
  8.58,  // 23
  8.42,  // 24
  8.26,  // 25
  8.11,  // 26
  7.97,  // 27
  7.83,  // 28
  7.69,  // 29
  7.56,  // 30
  7.43,  // 31
  7.30,  // 32
  7.18,  // 33
  7.07,  // 34
  6.95,  // 35
  6.84,  // 36
  6.73,  // 37
  6.63,  // 38
  6.53,  // 39
  6.43,  // 40
];

// Linear interpolation on integer-degree table.
export function saturatedDOAt1Atm(tC: number): number | null {
  if (Number.isNaN(tC)) return null;
  if (tC < 0 || tC > 40) return null;
  const lower = Math.floor(tC);
  const upper = Math.ceil(tC);
  if (lower === upper) return DO_TABLE_1ATM[lower];
  const y0 = DO_TABLE_1ATM[lower];
  const y1 = DO_TABLE_1ATM[upper];
  const ratio = (tC - lower) / (upper - lower);
  return y0 + (y1 - y0) * ratio;
}

// Saturation vapour pressure of water in kPa (Tetens-like form used in your Excel)
export function waterVapourPressure_kPa(tC: number): number {
  // e_s = 0.61121 * EXP((18.678 - T/234.5) * T / (T + 257.14))
  return 0.61121 * Math.exp((18.678 - tC / 234.5) * (tC / (tC + 257.14)));
}

// Adjust saturation DO for actual barometric pressure (kPa), per your Excel I2 公式
export function saturatedDO_atPressure_kPa(
  tC: number,
  pressure_kPa: number
): number | null {
  const G2 = saturatedDOAt1Atm(tC);
  if (G2 == null) return null;
  const es = waterVapourPressure_kPa(tC);
  const denom = STANDARD_ATM_KPA - es;
  if (denom <= 0) return null;
  return G2 * ((pressure_kPa - es) / denom);
}

// Excel-like rounding used in the provided formula:
// TRUNC( ROUND(I2, 2 + (ROUND(MOD(I2*10^2,2),9)=0.5) ), 2 )
// We implement true bankers rounding (round half to even) to 2 decimals.
export function roundHalfToEven(x: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  const n = x * factor;
  const floor = Math.floor(n);
  const frac = n - floor;
  const EPS = 1e-10;
  // tie at exactly .5
  if (Math.abs(frac - 0.5) < EPS) {
    const even = (floor % 2 === 0) ? floor : floor + 1;
    return even / factor;
  }
  // normal rounding
  return Math.round(n) / factor;
}

export interface DOComputationResult {
  g2_at_1atm: number; // mg/L at 1 atm
  es_kpa: number;     // water vapour pressure
  raw_i2: number;     // unrounded DO at given pressure
  standard_value: number; // rounded to 2 decimals (bankers)
  range_min: number;  // standard_value - 0.5
  range_max: number;  // standard_value + 0.5
  warnings: CalculationWarning[];
  meta: FormulaMeta;
}

export const DO_META: FormulaMeta = {
  formulaName: '饱和溶解氧(淡水, 标准大气压校正)',
  formulaText: 'DO_sat(P) = DO_sat(1 atm) × (P - es) / (101.325 - es)',
  formulaType: 'standard-method',
  resultLevel: 'reportable-check',
  references: ['HJ 506-2009', 'GB 7489-1987'],
  applicability: ['淡水饱和溶解氧 0~40℃', '电化学/光学溶解氧仪校准参考'],
  limitations: [
    '查表基于淡水、标准大气压',
    '未修正盐度（海水/咸水应另加盐度修正）',
    '大气压低于饱和水汽压时无法计算',
  ],
};

export function computeDO(
  pressure_kPa: number,
  tC: number
): DOComputationResult | { error: string } {
  if (pressure_kPa == null || Number.isNaN(pressure_kPa)) {
    return { error: '请输入大气压(kPa)' };
  }
  if (tC == null || Number.isNaN(tC)) {
    return { error: '请输入温度(℃)' };
  }
  if (tC > 40) {
    return { error: '高于40℃无法计算(查表范围 0~40℃)' };
  }
  if (tC < 0) {
    return { error: '低于0℃无法计算(查表范围 0~40℃)' };
  }
  if (pressure_kPa <= 0) {
    return { error: '大气压必须大于 0' };
  }

  const warnings: CalculationWarning[] = [];

  if (pressure_kPa < 50 || pressure_kPa > 110) {
    warnings.push({
      level: 'warning',
      message: `大气压 ${pressure_kPa} kPa 偏离常规范围(约 50~110 kPa)`,
      suggestion: '请确认气压计读数及单位(1 atm ≈ 101.325 kPa)',
    });
  }

  const g2 = saturatedDOAt1Atm(tC);
  if (g2 == null) return { error: '温度超出可计算范围(0-40℃)' };

  const es = waterVapourPressure_kPa(tC);

  // 显式校验：大气压必须大于饱和水汽压，否则(P - es) ≤ 0 无物理意义
  if (pressure_kPa <= es) {
    return {
      error: `大气压 ${pressure_kPa} kPa 不大于当前温度下的饱和水汽压 ${es.toFixed(3)} kPa，无法计算`,
    };
  }

  const raw = saturatedDO_atPressure_kPa(tC, pressure_kPa);
  if (raw == null) return { error: '计算失败，请检查输入' };

  if (raw <= 0) {
    return { error: '计算得到非正饱和溶解氧，请检查温度/气压输入' };
  }

  // 低温/高温附加提示
  if (tC >= 35) {
    warnings.push({
      level: 'info',
      message: `水温 ${tC}℃ 接近查表上限`,
      suggestion: '高温条件下溶解氧较低，请确认仪表量程与测定条件',
    });
  }

  // 淡水-盐度说明
  warnings.push({
    level: 'info',
    message: '本表按淡水饱和值给出，未作盐度修正',
    suggestion: '海水/咸水需按实际盐度进行 Benson-Krause/APHA 公式修正',
  });

  const std = roundHalfToEven(raw, 2);
  return {
    g2_at_1atm: g2,
    es_kpa: es,
    raw_i2: raw,
    standard_value: std,
    range_min: std - 0.5,
    range_max: std + 0.5,
    warnings,
    meta: DO_META,
  };
}
