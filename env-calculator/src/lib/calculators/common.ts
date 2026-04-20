import { CalculationError } from './types';
export type { CalculationError } from './types';

// =========================================================================
// 常量定义
// =========================================================================

export const STANDARD_ATMOSPHERE_KPA = 101.325;
export const STANDARD_TEMPERATURE_K = 273.15;
export const AIR_DENSITY_0C_1ATM_KG_M3 = 1.293;
export const GRAVITY_ACCELERATION = 9.80665;
export const DEFAULT_COVERAGE_FACTOR_K = 2;
export const UNIFORM_DISTRIBUTION_DIVISOR = Math.sqrt(3);
export const EPSILON = 1e-12;

// 通用气体常数 L·atm/(mol·K)
export const GAS_CONSTANT_R_L_ATM = 0.082057338;

// 标准温度
export const GAS_STANDARD_TEMP_0C = 0;
export const GAS_LAB_TEMP_25C = 25;

// =========================================================================
// 四舍六入五成双
// =========================================================================

export function roundHalfToEven(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return value;

  const factor = 10 ** decimals;
  const scaled = value * factor;
  const sign = Math.sign(scaled) || 1;
  const absolute = Math.abs(scaled);
  const floor = Math.floor(absolute);
  const fraction = absolute - floor;
  const epsilon = 1e-10;

  if (Math.abs(fraction - 0.5) < epsilon) {
    return (sign * (floor % 2 === 0 ? floor : floor + 1)) / factor;
  }

  return (sign * Math.round(absolute)) / factor;
}

export function roundTo(value: number, decimals = 2): number {
  return roundHalfToEven(value, decimals);
}

// =========================================================================
// 通用校验函数
// =========================================================================

export function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

export function isNearlyZero(value: number, epsilon = EPSILON): boolean {
  return Math.abs(value) < epsilon;
}

export function requireNonNegative(value: number, label: string): CalculationError | null {
  if (!isFiniteNumber(value)) return { error: `请输入有效的${label}` };
  if (value < 0) return { error: `${label}不能为负值` };
  return null;
}

export function requirePositive(value: number, label: string): CalculationError | null {
  if (!isFiniteNumber(value)) return { error: `请输入有效的${label}` };
  if (value <= 0) return { error: `${label}必须大于 0` };
  return null;
}

export function requireBetween(value: number, min: number, max: number, label: string): CalculationError | null {
  if (!isFiniteNumber(value)) return { error: `请输入有效的${label}` };
  if (value < min || value > max) {
    return { error: `${label}必须在 ${min} ~ ${max} 范围内` };
  }
  return null;
}

export function requireFinite(value: number, label: string): CalculationError | null {
  if (!isFiniteNumber(value)) return { error: `请输入有效的${label}` };
  return null;
}

export function requireGreaterThan(value: number, threshold: number, label: string): CalculationError | null {
  if (!isFiniteNumber(value)) return { error: `请输入有效的${label}` };
  if (value <= threshold) return { error: `${label}必须大于 ${threshold}` };
  return null;
}

export function requireLessThan(value: number, threshold: number, label: string): CalculationError | null {
  if (!isFiniteNumber(value)) return { error: `请输入有效的${label}` };
  if (value >= threshold) return { error: `${label}必须小于 ${threshold}` };
  return null;
}

/**
 * 安全除法
 */
export function safeDivide(
  numerator: number,
  denominator: number,
  label = '分母'
): number | CalculationError {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return { error: '请输入有效数字' };
  }
  if (Math.abs(denominator) < EPSILON) {
    return { error: `${label}接近 0，无法可靠计算` };
  }
  return numerator / denominator;
}

/**
 * 百分偏差
 */
export function percentDeviation(actual: number, target: number): number {
  if (Math.abs(target) < EPSILON) return NaN;
  return ((actual - target) / target) * 100;
}

// =========================================================================
// 数值输入解析
// =========================================================================

export function parseDecimalInput(value: string): number {
  return value.trim() === '' ? NaN : Number(value.replace(',', '.'));
}

export function parseNumberList(value: string): number[] {
  return value
    .split(/[\s,，;；、]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map(parseDecimalInput)
    .filter(Number.isFinite);
}

function sanitizeMantissa(s: string): string {
  if (!s) return '';
  let r = s.replace(/\+/g, '');
  if (r.length > 1) {
    r = r[0] === '-'
      ? '-' + r.slice(1).replace(/-/g, '')
      : r.replace(/-/g, '');
  }
  const parts = r.split('.');
  if (parts.length > 2) r = parts[0] + '.' + parts.slice(1).join('');
  return r;
}

function sanitizeExponent(s: string): string {
  if (!s) return '';
  const stripped = s.replace(/\./g, '');
  const first = stripped[0];
  const sign = first === '+' || first === '-' ? first : '';
  const digits = stripped.slice(sign ? 1 : 0).replace(/[+\-]/g, '');
  return sign + digits;
}

/**
 * 清洗数值输入字符串
 */
export function sanitizeNumericInput(raw: string): string {
  if (!raw) return '';
  let s = raw.replace(/,/g, '.');
  s = s.replace(/[^0-9.+\-eE]/g, '');
  if (!s) return '';

  const eIndex = s.search(/[eE]/);
  if (eIndex === -1) return sanitizeMantissa(s);

  const mantissa = s.slice(0, eIndex);
  const eChar = s[eIndex];
  const after = s.slice(eIndex + 1).replace(/[eE]/g, '');
  return sanitizeMantissa(mantissa) + eChar + sanitizeExponent(after);
}

// =========================================================================
// 辅助函数
// =========================================================================

/**
 * 线性插值
 */
export function lerp(y0: number, y1: number, t: number): number {
  return y0 + (y1 - y0) * t;
}

/**
 * 获取数组统计量
 */
export function arrayStats(values: number[]): {
  count: number;
  mean: number;
  variance: number;
  stdev: number;
  min: number;
  max: number;
  range: number;
} | CalculationError {
  const valid = values.filter(Number.isFinite);
  if (valid.length === 0) return { error: '没有有效数据' };

  const count = valid.length;
  const mean = valid.reduce((s, v) => s + v, 0) / count;
  const variance = valid.reduce((s, v) => s + (v - mean) ** 2, 0) / (count - 1);
  const stdev = Math.sqrt(variance);
  const min = Math.min(...valid);
  const max = Math.max(...valid);

  return {
    count,
    mean,
    variance,
    stdev,
    min,
    max,
    range: max - min,
  };
}
