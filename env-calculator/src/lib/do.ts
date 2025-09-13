// DO saturation calculation module
// - Uses standard-atmosphere saturation DO table (0..40 C, at 1 atm)
// - Adjusts for actual atmospheric pressure using water vapour pressure correction
// - Implements Excel-equivalent rounding for the final standard value

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
}

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
    return { error: '高于40℃无法计算' };
  }
  if (tC < 0) {
    return { error: '低于0℃无法计算' };
  }

  const g2 = saturatedDOAt1Atm(tC);
  if (g2 == null) return { error: '温度超出可计算范围(0-40℃)' };

  const es = waterVapourPressure_kPa(tC);
  const raw = saturatedDO_atPressure_kPa(tC, pressure_kPa);
  if (raw == null) return { error: '计算失败，请检查输入' };

  const std = roundHalfToEven(raw, 2);
  return {
    g2_at_1atm: g2,
    es_kpa: es,
    raw_i2: raw,
    standard_value: std,
    range_min: std - 0.5,
    range_max: std + 0.5,
  };
}

