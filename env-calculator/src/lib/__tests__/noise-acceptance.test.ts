/**
 * 任务提示词 九、11：噪声
 *  - ΔL<3 dB 应 rule='invalid'，corrected=null
 *  - 不等时间 Leq 使用时间加权公式
 */
import { calculateBackgroundCorrection, calculateLeq } from '../calculators/noise';

describe('Noise acceptance (任务9.11)', () => {
  it('ΔL < 3 dB 应 rule=invalid', () => {
    const r = calculateBackgroundCorrection({ measured: 50, background: 48 });
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.rule).toBe('invalid');
    expect(r.corrected).toBeNull();
  });

  it('ΔL >= 10 dB 应 no-correction', () => {
    const r = calculateBackgroundCorrection({ measured: 70, background: 50 });
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.rule).toBe('no-correction');
  });

  it('ΔL=5 dB 应对数修正', () => {
    const r = calculateBackgroundCorrection({ measured: 55, background: 50 });
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.rule).toBe('logarithmic');
    expect(r.corrected).not.toBeNull();
  });

  it('等间隔 Leq 使用能量平均', () => {
    const r = calculateLeq([70, 80]);
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    // 等间隔两次 70/80 dB 能量平均 ≈ 77.4 dB
    expect(r.leq).toBeGreaterThan(76);
    expect(r.leq).toBeLessThan(78);
  });

  it('不等时间 Leq 使用时间加权', () => {
    const r = calculateLeq(
      [{ level: 70, durationSeconds: 60 }, { level: 80, durationSeconds: 30 }],
      'weighted-duration',
    );
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.leq).toBeGreaterThan(70);
    expect(r.leq).toBeLessThan(80);
    expect(r.mode).toBe('weighted-duration');
  });
});
