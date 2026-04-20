/**
 * 任务提示词 九、10：DO 饱和度
 *  - 温度 >40 应报错
 *  - pressure <= 水汽压 应报错
 */
import { computeDO } from '../do';

describe('DO Saturation acceptance (任务9.10)', () => {
  it('温度 > 40 ℃ 应报错', () => {
    const r = computeDO(101.3, 45);
    expect(r).toHaveProperty('error');
  });

  it('温度 < 0 ℃ 应报错', () => {
    const r = computeDO(101.3, -5);
    expect(r).toHaveProperty('error');
  });

  it('压力 = 0 应报错', () => {
    const r = computeDO(0, 25);
    expect(r).toHaveProperty('error');
  });

  it('pressure <= 水汽压 应报错', () => {
    // 30 ℃ 时水汽压约 4.24 kPa，传入 2 kPa 必然小于
    const r = computeDO(2, 30);
    expect(r).toHaveProperty('error');
  });

  it('正常输入返回 standard_value 与 warnings 数组', () => {
    const r = computeDO(101.3, 25);
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(typeof r.standard_value).toBe('number');
    expect(Array.isArray(r.warnings)).toBe(true);
  });
});
