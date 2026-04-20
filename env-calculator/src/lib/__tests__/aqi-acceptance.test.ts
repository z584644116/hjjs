/**
 * 任务提示词 九：AQI 断点边界无重叠 + 超表报错
 */
import { calculateAqi } from '../calculators/aqi';

describe('AQI acceptance', () => {
  it('浓度超过断点表上限应报错', () => {
    const r = calculateAqi('PM2_5_24H', 10000);
    expect(r).toHaveProperty('error');
  });

  it('CO 单位 mg/m³ 应有 info 警告', () => {
    const r = calculateAqi('CO_24H', 1);
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.warnings.some((w) => /mg\/m³/.test(w.message))).toBe(true);
  });

  it('边界浓度 PM2.5=35 只匹配第一个区间', () => {
    const r = calculateAqi('PM2_5_24H', 35);
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.iaqi).toBe(50);
  });

  it('边界浓度 PM2.5=75 只匹配第二个区间（IAQI=100）', () => {
    const r = calculateAqi('PM2_5_24H', 75);
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.iaqi).toBe(100);
  });

  it('返回 averagingPeriod 与 meta', () => {
    const r = calculateAqi('PM2_5_24H', 50);
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.averagingPeriod).toContain('24');
    expect(r.meta.formulaType).toBe('standard-method');
  });
});
