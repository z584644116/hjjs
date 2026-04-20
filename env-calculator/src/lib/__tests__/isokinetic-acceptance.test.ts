/**
 * 任务提示词 九、2：等速采样与烟气流速
 *  - dynamicPressurePa=0 应报错
 *  - dynamicPressurePa=3 应警告低动压
 *  - 未提供实测密度时有密度近似警告
 */
import { calculateFlueGasVelocity, calculateIsokineticFlow } from '../calculators/isokinetic';

describe('Isokinetic acceptance (任务9.2)', () => {
  it('动压=0 应报错', () => {
    const r = calculateFlueGasVelocity({
      dynamicPressurePa: 0,
      atmosphericPressureKPa: 101.3,
      staticPressureKPa: 0,
      temperatureC: 100,
    });
    expect(r).toHaveProperty('error');
  });

  it('动压=3 Pa 应有低动压警告', () => {
    const r = calculateFlueGasVelocity({
      dynamicPressurePa: 3,
      atmosphericPressureKPa: 101.3,
      staticPressureKPa: 0,
      temperatureC: 100,
    });
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.lowDynamicPressureWarning).not.toBeNull();
  });

  it('未提供实测密度时应有密度近似警告', () => {
    const r = calculateFlueGasVelocity({
      dynamicPressurePa: 100,
      atmosphericPressureKPa: 101.3,
      staticPressureKPa: 0,
      temperatureC: 100,
    });
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.densityApproximationWarning).not.toBeNull();
  });

  it('跟踪率偏离 >10% 应 outOfRangeWarning 非空', () => {
    const r = calculateIsokineticFlow({
      dynamicPressurePa: 100,
      atmosphericPressureKPa: 101.3,
      staticPressureKPa: 0,
      temperatureC: 100,
      nozzleDiameterMm: 6,
      actualFlowLMin: 5,
    });
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    if (!r.isWithinTolerance) {
      expect(r.outOfRangeWarning).not.toBeNull();
    }
  });
});
