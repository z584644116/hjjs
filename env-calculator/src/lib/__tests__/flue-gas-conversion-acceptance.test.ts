/**
 * 任务提示词 九、4：烟气折算
 *  - O2=20.8 应 danger 或报错
 *  - O2=10, ref=6 正常
 */
import { calculateFlueGasConversion } from '../fluegas';

describe('Flue Gas Conversion acceptance (任务9.4)', () => {
  it('measuredO2=20.8 应报错', () => {
    const r = calculateFlueGasConversion({
      measuredConcentration: 100,
      measuredO2: 20.8,
      referenceO2: 6,
    });
    expect(r).toHaveProperty('error');
  });

  it('measuredO2=10 referenceO2=6 可正常计算', () => {
    const r = calculateFlueGasConversion({
      measuredConcentration: 100,
      measuredO2: 10,
      referenceO2: 6,
    });
    expect(r).not.toHaveProperty('error');
  });

  it('measuredO2=19.5 应有 warning', () => {
    const r = calculateFlueGasConversion({
      measuredConcentration: 100,
      measuredO2: 19.5,
      referenceO2: 6,
    });
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});
