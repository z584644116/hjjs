import {
  designDilution,
  selectFinalFlasks,
  canTakeVolume,
  resolveMotherAvailability,
  type DilutionGlassware,
} from '../calculators/dilution';

// -------------------------------------------------------------------------
//  旧有测试(适配 v3 语义)
// -------------------------------------------------------------------------

describe('designDilution - 基本功能', () => {
  it('经典 2000× 稀释应能给出多个方案', () => {
    const r = designDilution({
      c0: 1000,
      cTarget: 0.5,
      vNeedMl: 100,
      maxLevels: 3,
    });
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.requestedTotalFactor).toBe(2000);
    expect(r.proposals.length).toBeGreaterThan(0);
  });

  it('100× 简单稀释应能一步完成', () => {
    const r = designDilution({
      c0: 1000,
      cTarget: 10,
      vNeedMl: 100,
      maxLevels: 2,
    });
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    const oneLevel = r.proposals.find((p) => p.levels === 1);
    expect(oneLevel).toBeDefined();
    expect(oneLevel!.totalFactor).toBe(100);
  });

  it('最后一级容量瓶应按"精确或最近"策略选择', () => {
    const r = designDilution({
      c0: 1000,
      cTarget: 10,
      vNeedMl: 500,
      maxLevels: 2,
    });
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    for (const p of r.proposals) {
      const last = p.steps[p.steps.length - 1];
      expect(last.flask.volumeMl).toBe(500);
    }
  });

  it('母液可用量应硬约束首级取液', () => {
    const r = designDilution({
      c0: 1000,
      cTarget: 1,
      vNeedMl: 100,
      c0AvailableMl: 3,
      maxLevels: 3,
    });
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    for (const p of r.proposals) {
      expect(p.steps[0].pipette.volumeMl).toBeLessThanOrEqual(3);
    }
  });

  it('目标浓度不小于母液浓度应报错', () => {
    const r = designDilution({
      c0: 10,
      cTarget: 10,
      vNeedMl: 100,
    });
    expect('error' in r).toBe(true);
  });
});

describe('designDilution - 不确定度', () => {
  it('单级方案不确定度应与容量瓶+吸管允差一致', () => {
    const r = designDilution({
      c0: 1000,
      cTarget: 100,
      vNeedMl: 100,
      availableFlaskSizesMl: [100],
      availablePipetteSizesMl: [10],
      maxLevels: 1,
    });
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.proposals.length).toBe(1);
    const u = r.proposals[0].expandedUPercent;
    // A 级:100 mL ±0.10,10 mL ±0.02 → U(k=2) ≈ 0.258%,叠加 C₀ 0.5% → 约 0.56%
    expect(u).toBeGreaterThan(0.4);
    expect(u).toBeLessThan(0.8);
  });
});

describe('designDilution - 评级', () => {
  it('rating 应随 U 单调递减', () => {
    const r = designDilution({
      c0: 1000,
      cTarget: 0.5,
      vNeedMl: 100,
      maxLevels: 3,
    });
    if ('error' in r) return;
    for (const p of r.proposals) {
      if (p.expandedUPercent <= 0.5) expect(p.rating).toBe(5);
      else if (p.expandedUPercent <= 1.0) expect(p.rating).toBe(4);
      else if (p.expandedUPercent <= 2.0) expect(p.rating).toBe(3);
      else if (p.expandedUPercent <= 5.0) expect(p.rating).toBe(2);
      else expect(p.rating).toBe(1);
    }
  });
});

// -------------------------------------------------------------------------
//  v3 新增:实验室可执行性核心测试
// -------------------------------------------------------------------------

describe('v3 - 最终容量瓶选择策略', () => {
  const makeFlask = (v: number): DilutionGlassware => ({
    kind: 'flask',
    volumeMl: v,
    toleranceMl: v * 0.001,
    grade: 'A',
    label: `${v} mL`,
    pdfConfirmed: true,
  });

  it('selectFinalFlasks exact-or-nearest 优先精确匹配', () => {
    const flasks = [100, 250, 500, 1000, 2000].map(makeFlask);
    const picked = selectFinalFlasks(flasks, 100);
    expect(picked.map((f) => f.volumeMl)).toEqual([100]);
  });

  it('selectFinalFlasks exact-or-nearest 无精确时取最小更大', () => {
    const flasks = [100, 250, 500].map(makeFlask);
    const picked = selectFinalFlasks(flasks, 120);
    expect(picked.map((f) => f.volumeMl)).toEqual([250]);
  });

  it('selectFinalFlasks at-least 返回所有 ≥ V_need 的规格', () => {
    const flasks = [100, 250, 500, 1000].map(makeFlask);
    const picked = selectFinalFlasks(flasks, 150, 'at-least');
    expect(picked.map((f) => f.volumeMl)).toEqual([250, 500, 1000]);
  });

  it('selectFinalFlasks exact-only 没有精确时返回空', () => {
    const flasks = [100, 250, 500].map(makeFlask);
    expect(selectFinalFlasks(flasks, 120, 'exact-only')).toHaveLength(0);
  });
});

describe('v3 - canTakeVolume', () => {
  const makeTool = (
    kind: DilutionGlassware['kind'],
    v: number,
  ): DilutionGlassware => ({
    kind,
    volumeMl: v,
    toleranceMl: 0.02,
    grade: 'A',
    label: `${v} mL`,
    pdfConfirmed: true,
  });

  it('volumetric_pipette 只接受标称体积', () => {
    const tool = makeTool('volumetric_pipette', 10);
    expect(canTakeVolume(tool, 10, 0.1)).toBe(true);
    expect(canTakeVolume(tool, 7.326, 0.1)).toBe(false);
    expect(canTakeVolume(tool, 9.9, 0.1)).toBe(false);
  });

  it('graduated_pipette 接受量程内任意体积', () => {
    const tool = makeTool('graduated_pipette', 10);
    expect(canTakeVolume(tool, 10, 0.1)).toBe(true);
    expect(canTakeVolume(tool, 7.326, 0.1)).toBe(true);
    expect(canTakeVolume(tool, 0.5, 0.1)).toBe(false); // < 10% 量程
    expect(canTakeVolume(tool, 11, 0.1)).toBe(false); // 超量程
  });

  it('micropipette 接受量程内任意体积', () => {
    const tool = makeTool('micropipette', 1);
    expect(canTakeVolume(tool, 1, 0.1)).toBe(true);
    expect(canTakeVolume(tool, 0.5, 0.1)).toBe(true);
    expect(canTakeVolume(tool, 0.05, 0.1)).toBe(false);
  });
});

describe('v3 - resolveMotherAvailability 硬约束', () => {
  it('c0AvailableMl 未设置时始终通过', () => {
    expect(resolveMotherAvailability(100, undefined).ok).toBe(true);
  });
  it('消耗 ≤ 可用量时通过', () => {
    expect(resolveMotherAvailability(2, 3).ok).toBe(true);
  });
  it('消耗 > 可用量时判定不可行', () => {
    const r = resolveMotherAvailability(10, 3);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain('超过可用量');
  });
});

// -------------------------------------------------------------------------
//  七大必答测试(用户明确要求)
// -------------------------------------------------------------------------

describe('v3 - 七大测试用例', () => {
  it('测试 1: V_need=100,有 100 mL 容量瓶 → 不得推荐 2000 mL', () => {
    const r = designDilution({
      c0: 1000,
      cTarget: 10,
      vNeedMl: 100,
      availableFlaskSizesMl: [100, 250, 500, 1000, 2000],
      maxLevels: 2,
    });
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.proposals.length).toBeGreaterThan(0);
    for (const p of r.proposals) {
      const last = p.steps[p.steps.length - 1];
      expect(last.flask.volumeMl).toBe(100);
    }
  });

  it('测试 2: V_need=120,最终容量瓶应为 250 mL 而非 500 mL', () => {
    const r = designDilution({
      c0: 1000,
      cTarget: 10,
      vNeedMl: 120,
      availableFlaskSizesMl: [100, 250, 500],
      maxLevels: 2,
    });
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    expect(r.proposals.length).toBeGreaterThan(0);
    for (const p of r.proposals) {
      const last = p.steps[p.steps.length - 1];
      expect(last.flask.volumeMl).toBe(250);
    }
  });

  it('测试 3: 10 mL 单标线吸量管不得被用于"取 7.326 mL"', () => {
    // 构造一个倍数非整数的情境:F = 1000/73.26 ≈ 13.65
    const r = designDilution({
      c0: 1000,
      cTarget: 73.26,
      vNeedMl: 100,
      availableFlaskSizesMl: [100],
      availablePipetteSizesMl: [10],
      maxLevels: 1,
      factorTolerancePercent: 0.5,
    });
    if ('error' in r) return;
    for (const p of r.proposals) {
      for (const s of p.steps) {
        if (s.pipette.kind === 'volumetric_pipette') {
          expect(s.actualTakeMl).toBeCloseTo(s.pipette.volumeMl, 9);
        }
      }
    }
  });

  it('测试 4: 没有 graduated/micropipette 时不得出现 isFinalAdjusted', () => {
    const r = designDilution({
      c0: 1000,
      cTarget: 7.33,
      vNeedMl: 100,
      availableFlaskSizesMl: [100],
      availablePipetteSizesMl: [10],
      maxLevels: 2,
      designMode: 'smart', // 即便开启 smart,也无可调工具可用
      factorTolerancePercent: 5,
    });
    if ('error' in r) return;
    for (const p of r.proposals) {
      for (const s of p.steps) {
        expect(s.isFinalAdjusted).toBe(false);
      }
      expect(p.usesAdjustedTake).toBe(false);
    }
  });

  it('测试 5: c0AvailableMl=3,需 10 mL 母液时方案判定不可行', () => {
    const r = designDilution({
      c0: 1000,
      cTarget: 10,
      vNeedMl: 100,
      c0AvailableMl: 3,
      availableFlaskSizesMl: [100],
      availablePipetteSizesMl: [10],
      maxLevels: 1,
    });
    if ('error' in r) return;
    // 10 mL 首级消耗超过 3 mL 可用母液,方案不应存在
    expect(r.proposals.length).toBe(0);
  });

  it('测试 6: smart 模式 + micropipette 允许非标称取液但必须带警告', () => {
    const micropipette: DilutionGlassware = {
      kind: 'micropipette',
      volumeMl: 10,
      toleranceMl: 0.05,
      grade: 'vendor',
      label: '可调微量移液器 10 mL',
      pdfConfirmed: false,
      relTolerancePercent: 0.5,
    };
    const r = designDilution({
      c0: 1000,
      cTarget: 73.26,
      vNeedMl: 100,
      availableFlaskSizesMl: [100],
      availablePipetteSizesMl: [],
      microPipettes: [micropipette],
      designMode: 'smart',
      maxLevels: 1,
    });
    if ('error' in r) return;
    const adjusted = r.proposals.filter((p) => p.usesAdjustedTake);
    expect(adjusted.length).toBeGreaterThan(0);
    for (const p of adjusted) {
      expect(p.warnings.join(' ')).toMatch(/非满刻度|任意读数|可调|分度/);
    }
  });

  it('测试 7: factorTolerancePercent 对固定体积组合真实生效', () => {
    // F=1000/73=13.70,5 mL 吸管 + 50 mL 容量瓶 = 10x(偏差 -27%),
    // 10 mL 吸管 + 100 mL 容量瓶 = 10x 同理,不应命中 2% 容差
    const strict = designDilution({
      c0: 1000,
      cTarget: 73,
      vNeedMl: 100,
      availableFlaskSizesMl: [100],
      availablePipetteSizesMl: [1, 2, 5, 10],
      maxLevels: 1,
      factorTolerancePercent: 2,
    });
    if ('error' in strict) throw new Error('should not error');
    expect(strict.proposals.length).toBe(0); // 所有 factor ∈ {100, 50, 20, 10},偏差远 > 2%

    // 放宽到 50% 后,factor=10x(偏差 -27%)应命中
    const loose = designDilution({
      c0: 1000,
      cTarget: 73,
      vNeedMl: 100,
      availableFlaskSizesMl: [100],
      availablePipetteSizesMl: [1, 2, 5, 10],
      maxLevels: 1,
      factorTolerancePercent: 50,
    });
    if ('error' in loose) throw new Error('should not error');
    expect(loose.proposals.length).toBeGreaterThan(0);
  });
});

// -------------------------------------------------------------------------
//  v3 新增:排序行为
// -------------------------------------------------------------------------

describe('v3 - 排序行为', () => {
  it('固定体积命中时,排序应优先精确总倍数而非最低 U', () => {
    const r = designDilution({
      c0: 1000,
      cTarget: 10,
      vNeedMl: 100,
      availableFlaskSizesMl: [100, 250, 500, 1000, 2000],
      availablePipetteSizesMl: [1, 2, 5, 10, 25, 50, 100],
      maxLevels: 2,
    });
    if ('error' in r) return;
    // Top 方案最后一级容量瓶应精确为 100 mL
    const top = r.proposals[0];
    expect(top.steps[top.steps.length - 1].flask.volumeMl).toBe(100);
  });
});
