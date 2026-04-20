/**
 * 任务提示词 九、1：稀释计算
 *  - V_need=100 mL 默认不得推荐 ≥250 mL 容量瓶
 *  - 只有单标线吸量管时不得出现非标称取液
 *  - 母液可用量不足时方案不可行
 */
import { designDilution } from '../calculators/dilution';

describe('Dilution acceptance (任务9.1)', () => {
  it('V_need=100 mL 默认最终容量瓶必须是 100', () => {
    const result = designDilution({
      c0: 1000,
      cTarget: 100,
      vNeedMl: 100,
      availableFlaskSizesMl: [100, 250, 500, 1000, 2000],
      availablePipetteSizesMl: [10, 25, 50],
    });
    expect(result).not.toHaveProperty('error');
    if ('error' in result) return;
    expect(result.proposals.length).toBeGreaterThan(0);
    const best = result.proposals[0];
    const finalFlask = best.steps[best.steps.length - 1].flask;
    expect(finalFlask.volumeMl).toBe(100);
  });

  it('只有单标线吸量管时不得出现 isFinalAdjusted=true', () => {
    const result = designDilution({
      c0: 1000,
      cTarget: 100,
      vNeedMl: 100,
      availableFlaskSizesMl: [100],
      availablePipetteSizesMl: [10],
    });
    if ('error' in result) return;
    for (const p of result.proposals) {
      for (const s of p.steps) {
        expect(s.isFinalAdjusted).toBe(false);
      }
    }
  });

  it('c0AvailableMl=3mL 而首级需要 10mL 应无可行方案', () => {
    const result = designDilution({
      c0: 1000,
      cTarget: 100,
      vNeedMl: 100,
      availableFlaskSizesMl: [100],
      availablePipetteSizesMl: [10],
      c0AvailableMl: 3,
    });
    if ('error' in result) return;
    expect(result.proposals.length).toBe(0);
  });
});
