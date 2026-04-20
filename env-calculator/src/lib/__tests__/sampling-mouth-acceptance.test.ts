/**
 * 任务提示词 九、3：采样嘴径
 *  - 给定多个嘴径时，应输出候选表，而不是简单选择
 */
import { calculateSamplingMouth } from '../calculator';

describe('Sampling Mouth acceptance (任务9.3)', () => {
  it('返回候选列表而非单一嘴径', () => {
    const r = calculateSamplingMouth(
      { smokeVelocity: 10, moistureContent: 5, samplingType: 'normal' },
      60,
    );
    expect(r.candidates.length).toBeGreaterThan(3);
    expect(r.recommendedDiameter).toBeGreaterThan(0);
  });

  it('候选应携带 level/reason 标记', () => {
    const r = calculateSamplingMouth(
      { smokeVelocity: 10, moistureContent: 5, samplingType: 'normal' },
      60,
    );
    for (const c of r.candidates) {
      expect(['recommended', 'acceptable', 'not-recommended']).toContain(c.level);
      expect(typeof c.reason).toBe('string');
      expect(c.reason.length).toBeGreaterThan(0);
    }
  });
});
