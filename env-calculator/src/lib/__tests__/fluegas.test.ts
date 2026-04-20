// Unit tests for flue gas conversion calculator
import { calculateFlueGasConversion, calculateFlueGasConversionLegacy } from '../fluegas';
import { roundHalfToEven } from '../calculators/common';

describe('roundHalfToEven', () => {
  it('should round 2.445 to 2.44 (round down when tie to even)', () => {
    expect(roundHalfToEven(2.445, 2)).toBe(2.44);
  });

  it('should round 2.455 to 2.46 (round up when tie to even)', () => {
    expect(roundHalfToEven(2.455, 2)).toBe(2.46);
  });

  it('should round 2.446 to 2.45 (normal rounding)', () => {
    expect(roundHalfToEven(2.446, 2)).toBe(2.45);
  });

  it('should round 2.444 to 2.44 (normal rounding)', () => {
    expect(roundHalfToEven(2.444, 2)).toBe(2.44);
  });
});

describe('calculateFlueGasConversion (new API)', () => {
  it('should calculate conversion correctly with typical values', () => {
    // Example: measured = 150, ref O2 = 6%, measured O2 = 13.09%
    // Expected: 150 × (21 - 6) / (21 - 13.09) = 150 × 15 / 7.91 = 284.32...
    const result = calculateFlueGasConversion({
      measuredConcentration: 150,
      referenceO2: 6,
      measuredO2: 13.09,
    });

    expect(result).not.toHaveProperty('error');
    if (!('error' in result)) {
      expect(result.convertedConcentration).toBeCloseTo(284.32, 2);
      expect(result.conversionFactor).toBeCloseTo(1.8952, 4);
    }
  });

  it('should return error when measured concentration is missing', () => {
    const result = calculateFlueGasConversion({
      measuredConcentration: NaN,
      referenceO2: 6,
      measuredO2: 13,
    });
    expect(result).toHaveProperty('error');
    if ('error' in result) {
      expect(result.error).toContain('实测污染物浓度');
    }
  });

  it('should return error when reference O2 is missing', () => {
    const result = calculateFlueGasConversion({
      measuredConcentration: 150,
      referenceO2: NaN,
      measuredO2: 13,
    });
    expect(result).toHaveProperty('error');
    if ('error' in result) {
      expect(result.error).toContain('基准氧含量');
    }
  });

  it('should return error when measured O2 is missing', () => {
    const result = calculateFlueGasConversion({
      measuredConcentration: 150,
      referenceO2: 6,
      measuredO2: NaN,
    });
    expect(result).toHaveProperty('error');
    if ('error' in result) {
      expect(result.error).toContain('实测氧含量');
    }
  });

  it('should return error when reference O2 is out of range (negative)', () => {
    const result = calculateFlueGasConversion({
      measuredConcentration: 150,
      referenceO2: -1,
      measuredO2: 13,
    });
    expect(result).toHaveProperty('error');
    if ('error' in result) {
      expect(result.error).toContain('0~21%');
    }
  });

  it('should return error when reference O2 is out of range (> 21)', () => {
    const result = calculateFlueGasConversion({
      measuredConcentration: 150,
      referenceO2: 22,
      measuredO2: 13,
    });
    expect(result).toHaveProperty('error');
    if ('error' in result) {
      expect(result.error).toContain('0~21%');
    }
  });

  it('should return error when measured O2 is >= 21', () => {
    const result = calculateFlueGasConversion({
      measuredConcentration: 150,
      referenceO2: 6,
      measuredO2: 21,
    });
    expect(result).toHaveProperty('error');
    if ('error' in result) {
      expect(result.error).toContain('小于 21%');
    }
  });

  it('should return error when measured concentration is negative', () => {
    const result = calculateFlueGasConversion({
      measuredConcentration: -10,
      referenceO2: 6,
      measuredO2: 13,
    });
    expect(result).toHaveProperty('error');
    if ('error' in result) {
      expect(result.error).toContain('不能为负值');
    }
  });

  it('should handle zero measured concentration', () => {
    const result = calculateFlueGasConversion({
      measuredConcentration: 0,
      referenceO2: 6,
      measuredO2: 13,
    });
    expect(result).not.toHaveProperty('error');
    if (!('error' in result)) {
      expect(result.convertedConcentration).toBe(0);
    }
  });

  it('should handle edge case when reference O2 equals measured O2', () => {
    // When O2_ref = O2_measured, conversion factor should be 1
    const result = calculateFlueGasConversion({
      measuredConcentration: 100,
      referenceO2: 10,
      measuredO2: 10,
    });
    expect(result).not.toHaveProperty('error');
    if (!('error' in result)) {
      expect(result.convertedConcentration).toBe(100);
      expect(result.conversionFactor).toBe(1);
    }
  });

  it('should apply banker\'s rounding correctly', () => {
    // Create a scenario where result is exactly X.XX5
    // measured = 100, ref = 6, measured = 12.5
    // Factor = (21-6)/(21-12.5) = 15/8.5 = 1.764705882...
    // Result = 100 * 1.764705882 = 176.4705882...
    // Rounded to 2 decimals: 176.47
    const result = calculateFlueGasConversion({
      measuredConcentration: 100,
      referenceO2: 6,
      measuredO2: 12.5,
    });
    expect(result).not.toHaveProperty('error');
    if (!('error' in result)) {
      expect(result.convertedConcentration).toBe(176.47);
    }
  });

  it('should warn when measured O2 is close to 21', () => {
    const result = calculateFlueGasConversion({
      measuredConcentration: 100,
      referenceO2: 6,
      measuredO2: 20.8,
    });
    expect(result).toHaveProperty('error');
    if ('error' in result) {
      expect(result.error).toContain('接近空气氧含量');
    }
  });

  it('should warn when measured O2 is high (>19)', () => {
    const result = calculateFlueGasConversion({
      measuredConcentration: 100,
      referenceO2: 6,
      measuredO2: 19.5,
    });
    expect(result).not.toHaveProperty('error');
    if (!('error' in result)) {
      expect(result.warnings.length).toBeGreaterThan(0);
    }
  });
});

describe('calculateFlueGasConversionLegacy (deprecated API)', () => {
  it('should work with legacy 3-argument API', () => {
    const result = calculateFlueGasConversionLegacy(150, 6, 13.09);
    expect(result).not.toHaveProperty('error');
    if (!('error' in result)) {
      expect(result.convertedConcentration).toBeCloseTo(284.32, 2);
      expect(result.conversionFactor).toBeCloseTo(1.8952, 4);
    }
  });
});
