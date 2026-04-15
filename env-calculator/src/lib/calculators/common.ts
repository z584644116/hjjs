export interface CalculationError {
  error: string;
}

export function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
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
