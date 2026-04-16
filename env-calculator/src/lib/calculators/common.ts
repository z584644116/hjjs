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

function sanitizeMantissa(s: string): string {
  if (!s) return '';
  // 尾数不允许 +
  let r = s.replace(/\+/g, '');
  // 第一个字符可为 -,其后 - 全部剔除
  if (r.length > 1) {
    r = r[0] === '-'
      ? '-' + r.slice(1).replace(/-/g, '')
      : r.replace(/-/g, '');
  }
  // 最多一个小数点
  const parts = r.split('.');
  if (parts.length > 2) r = parts[0] + '.' + parts.slice(1).join('');
  return r;
}

function sanitizeExponent(s: string): string {
  if (!s) return '';
  // 指数不允许小数点
  const stripped = s.replace(/\./g, '');
  const first = stripped[0];
  const sign = first === '+' || first === '-' ? first : '';
  const digits = stripped.slice(sign ? 1 : 0).replace(/[+\-]/g, '');
  return sign + digits;
}

/**
 * 清洗数值输入字符串,保留用户打字的中间态(如 "1.","-","1e","1e-")。
 * 支持:
 *   - 可选的开头负号
 *   - 小数点(仅尾数,最多一个),`,` 自动转 `.`
 *   - 可选的科学计数法 e/E,后接可选 +/- 再接数字
 *
 * 仅做字符层面的合法性过滤,不做完整性校验。解析成数字请用 `parseDecimalInput`。
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
  // 仅保留第一个 e/E,之后出现的全部剔除
  const after = s.slice(eIndex + 1).replace(/[eE]/g, '');
  return sanitizeMantissa(mantissa) + eChar + sanitizeExponent(after);
}
