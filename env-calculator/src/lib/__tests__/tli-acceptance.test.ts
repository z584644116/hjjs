/**
 * 任务提示词 九、9：TLI
 *  - 输入 0 或负值应报错
 */
import { calculateTli, calculatePollutionIndex } from '../calculators/assessment';

describe('TLI acceptance (任务9.9)', () => {
  it('chlorophyllA=0 应报错', () => {
    const r = calculateTli({
      chlorophyllA: 0,
      totalPhosphorus: 0.05,
      totalNitrogen: 1,
      secchiDepth: 1,
      codMn: 4,
    });
    expect(r).toHaveProperty('error');
  });

  it('totalPhosphorus=-1 应报错', () => {
    const r = calculateTli({
      chlorophyllA: 1,
      totalPhosphorus: -1,
      totalNitrogen: 1,
      secchiDepth: 1,
      codMn: 4,
    });
    expect(r).toHaveProperty('error');
  });

  it('正常值返回 tli 和 category 并带 warnings/meta', () => {
    const r = calculateTli({
      chlorophyllA: 10,
      totalPhosphorus: 0.05,
      totalNitrogen: 1,
      secchiDepth: 1,
      codMn: 4,
    });
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(typeof r.tli).toBe('number');
    expect(typeof r.category).toBe('string');
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(r.meta.formulaType).toBe('teaching-reference');
  });
});

describe('PollutionIndex acceptance (任务9.9 相关)', () => {
  it('空列表应报错', () => {
    const r = calculatePollutionIndex([]);
    expect(r).toHaveProperty('error');
  });

  it('返回 warnings 数组和 meta', () => {
    const r = calculatePollutionIndex([
      { name: 'COD', measured: 30, standard: 20 },
      { name: 'NH3-N', measured: 1.0, standard: 1.5 },
    ]);
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(r.meta.formulaType).toBe('teaching-reference');
    // COD 超标，应有 warning
    expect(r.warnings.some((w) => /COD|超标/.test(w.message))).toBe(true);
  });
});
