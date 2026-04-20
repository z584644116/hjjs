/**
 * 任务提示词 九、6：加标回收率
 *  - spikeAmount=0 应报错
 *  - 加标样<原样 应 danger
 */
import { calculateSpikeRecovery } from '../calculators/recovery';

describe('Spike Recovery acceptance (任务9.6)', () => {
  it('spikeAmount=0 应报错', () => {
    const r = calculateSpikeRecovery({
      mode: 'concentration',
      originalConcentration: 10,
      spikedConcentration: 15,
      spikeAmount: 0,
    });
    expect(r).toHaveProperty('error');
  });

  it('加标样浓度 < 原样 应 danger 警告', () => {
    const r = calculateSpikeRecovery({
      mode: 'concentration',
      originalConcentration: 10,
      spikedConcentration: 5,
      spikeAmount: 5,
    });
    expect(r).not.toHaveProperty('error');
    if ('error' in r) return;
    expect(r.warnings.some((w) => w.level === 'danger')).toBe(true);
  });
});
