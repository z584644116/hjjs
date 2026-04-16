export interface CalculationError {
  error: string;
}

export function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

/**
 * 四舍六入五成双。所有新增公式统一从这里修约。
 */
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
