// Flue gas conversion calculator
// Converts measured pollutant concentration to reference oxygen content basis
// Formula: C_ref = C_measured × (21 - O2_ref) / (21 - O2_measured)

/**
 * Round half to even (Banker's rounding) - 四舍六入五成双
 * Consistent with other modules (do.ts, ph.ts)
 */
export function roundHalfToEven(x: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  const n = x * factor;
  const floor = Math.floor(n);
  const frac = n - floor;
  const EPS = 1e-10;
  
  // Tie at exactly .5 - round to even
  if (Math.abs(frac - 0.5) < EPS) {
    const even = (floor % 2 === 0) ? floor : floor + 1;
    return even / factor;
  }
  
  // Normal rounding
  return Math.round(n) / factor;
}

/**
 * Flue gas conversion calculation result
 */
export interface FlueGasConversionResult {
  convertedConcentration: number; // Converted concentration (same unit as input)
  conversionFactor: number;       // The multiplication factor used
}

/**
 * Calculate converted pollutant concentration at reference oxygen content
 * 
 * @param measuredConcentration - Measured pollutant concentration (any unit)
 * @param referenceO2 - Reference oxygen content (%)
 * @param measuredO2 - Measured oxygen content (%)
 * @returns Calculation result or error message
 */
export function calculateFlueGasConversion(
  measuredConcentration: number,
  referenceO2: number,
  measuredO2: number
): FlueGasConversionResult | { error: string } {
  // Input validation
  if (measuredConcentration == null || Number.isNaN(measuredConcentration)) {
    return { error: '请输入实测污染物浓度' };
  }
  
  if (referenceO2 == null || Number.isNaN(referenceO2)) {
    return { error: '请输入基准氧含量' };
  }
  
  if (measuredO2 == null || Number.isNaN(measuredO2)) {
    return { error: '请输入实测氧含量' };
  }
  
  // Validate oxygen content ranges
  if (referenceO2 < 0 || referenceO2 > 21) {
    return { error: '基准氧含量必须在 0-21% 之间' };
  }
  
  if (measuredO2 < 0 || measuredO2 > 21) {
    return { error: '实测氧含量必须在 0-21% 之间' };
  }
  
  // Validate denominator (21 - measuredO2 must be positive)
  if (measuredO2 >= 21) {
    return { error: '实测氧含量必须小于 21%（否则公式分母为零或负值）' };
  }
  
  // Validate measured concentration is non-negative
  if (measuredConcentration < 0) {
    return { error: '实测污染物浓度不能为负值' };
  }
  
  // Calculate conversion factor
  const numerator = 21 - referenceO2;
  const denominator = 21 - measuredO2;
  const conversionFactor = numerator / denominator;
  
  // Calculate converted concentration
  const rawConverted = measuredConcentration * conversionFactor;
  
  // Round to 2 decimals using banker's rounding
  const convertedConcentration = roundHalfToEven(rawConverted, 2);
  
  return {
    convertedConcentration,
    conversionFactor: roundHalfToEven(conversionFactor, 4), // Keep 4 decimals for factor
  };
}

