/**
 * 任务提示词 九、7-8：RSD / MDL
 *  - RSD: 均值接近 0 应 warning，n<2 报错
 *  - MDL: n<7 应 warning，全相同报错
 */
import { calculateRsd } from '../calculators/rsd';
import { calculateMdlFromReplicates } from '../calculators/mdl';

describe('RSD acceptance (任务9.7)', () => {
  it('n<2 应报错', () => {
    const r = calculateRsd([1]);
    expect(r).toHaveProperty('error');
  });

  it('均值接近 0 应 rsdPercent=null 并 warning', () => {
    const r = calculateRsd([0.0001, -0.0001, 0.00005]);
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.rsdPercent).toBeNull();
    expect(r.warnings.some((w) => /接近 0/.test(w.message))).toBe(true);
  });
});

describe('MDL acceptance (任务9.8)', () => {
  it('n<7 应 warning', () => {
    const r = calculateMdlFromReplicates([1, 2, 3, 4, 5]);
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.warnings.some((w) => /样本量较小/.test(w.message))).toBe(true);
  });

  it('全相同值应报错', () => {
    const r = calculateMdlFromReplicates([5, 5, 5, 5, 5, 5, 5]);
    expect(r).toHaveProperty('error');
  });

  it('n=7 正常数据返回 MDL>0', () => {
    const r = calculateMdlFromReplicates([1, 1.1, 0.9, 1.2, 0.8, 1.05, 0.95]);
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.methodDetectionLimit).toBeGreaterThan(0);
  });
});
