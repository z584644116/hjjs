/**
 * 任务提示词 九、5：颗粒物浓度
 *  - 滤膜负增重应报错
 *  - 增重很小（<1 mg）应 warning
 */
import { calculateAirConcentration } from '../calculators/air-conc';

describe('Air Concentration acceptance (任务9.5)', () => {
  it('滤膜负增重应报错', () => {
    const r = calculateAirConcentration({
      mode: 'ambient-pm',
      flowRateLMin: 100,
      samplingMinutes: 60,
      pressureKPa: 101.3,
      temperatureC: 25,
      weightBeforeMg: 100,
      weightAfterMg: 99.5,
    });
    expect(r).toHaveProperty('error');
  });

  it('增重 0.5 mg 应 warning', () => {
    const r = calculateAirConcentration({
      mode: 'ambient-pm',
      flowRateLMin: 100,
      samplingMinutes: 60,
      pressureKPa: 101.3,
      temperatureC: 25,
      weightBeforeMg: 100,
      weightAfterMg: 100.5,
    });
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.warnings.some((w) => /增重较小|称量不确定度/.test(w.message))).toBe(true);
  });
});
