/**
 * JJG 196-2006《常用玻璃量器检定规程》
 *
 * 本文件中的允差数值由用户侧核对,标注 pdfConfirmed=true 的条目已有 PDF 原文支持。
 * 暂未加 PDF 截图的条目请在提交前补齐 `docs/standards-refs/jjg196/`。
 *
 * 注意(v3):表 4 的"单标线吸量管(容量吸管)"在计算上属于 volumetric_pipette,
 * 只能移取标称体积。分度吸量管 / 可调移液器应由用户另行录入并标注 kind。
 */

export interface GlasswareAllowance {
  volumeMl: number;
  /** 允差 ± (mL) */
  toleranceMl: number;
  /** 本条目是否已由 PDF 截图核对 */
  pdfConfirmed: boolean;
}

/**
 * 器具在本规程下的语义类型。
 *   - volumetric_flask:单标线容量瓶
 *   - volumetric_pipette:单标线吸量管(容量吸管),仅能移取标称体积
 */
export type Jjg196ToolKind = 'volumetric_flask' | 'volumetric_pipette';

export const JJG_196_2006 = {
  id: 'JJG 196-2006',
  fullName: '常用玻璃量器检定规程',
  version: '2006',
  clauses: {
    /**
     * 表 3 - 单标线容量瓶容量允差(20 ℃)
     * 数值由用户提供,pdfConfirmed=true。
     */
    volumetricFlaskA: {
      pageRef: 'JJG 196-2006 表 3(A 级)',
      toolKind: 'volumetric_flask' as Jjg196ToolKind,
      rawText:
        '单标线容量瓶 A 级容量允差(20 ℃),' +
        '5/10 mL ±0.020,25 mL ±0.030,50 mL ±0.050,100 mL ±0.100,' +
        '250 mL ±0.150,500 mL ±0.250,1000 mL ±0.400,2000 mL ±0.600',
      extracted: [
        { volumeMl: 5, toleranceMl: 0.020, pdfConfirmed: true },
        { volumeMl: 10, toleranceMl: 0.020, pdfConfirmed: true },
        { volumeMl: 25, toleranceMl: 0.030, pdfConfirmed: true },
        { volumeMl: 50, toleranceMl: 0.050, pdfConfirmed: true },
        { volumeMl: 100, toleranceMl: 0.100, pdfConfirmed: true },
        { volumeMl: 250, toleranceMl: 0.150, pdfConfirmed: true },
        { volumeMl: 500, toleranceMl: 0.250, pdfConfirmed: true },
        { volumeMl: 1000, toleranceMl: 0.400, pdfConfirmed: true },
        { volumeMl: 2000, toleranceMl: 0.600, pdfConfirmed: true },
      ] as GlasswareAllowance[],
    },

    /**
     * 表 3 - 单标线容量瓶 B 级(B 级允差 = A 级 × 2,按 JJG 惯例)
     * 具体数值需在 PDF 上核对,当前标 pdfConfirmed=false。
     */
    volumetricFlaskB: {
      pageRef: 'JJG 196-2006 表 3(B 级)',
      toolKind: 'volumetric_flask' as Jjg196ToolKind,
      rawText: '单标线容量瓶 B 级容量允差(待核对)',
      extracted: [
        { volumeMl: 5, toleranceMl: 0.040, pdfConfirmed: false },
        { volumeMl: 10, toleranceMl: 0.040, pdfConfirmed: false },
        { volumeMl: 25, toleranceMl: 0.060, pdfConfirmed: false },
        { volumeMl: 50, toleranceMl: 0.100, pdfConfirmed: false },
        { volumeMl: 100, toleranceMl: 0.200, pdfConfirmed: false },
        { volumeMl: 250, toleranceMl: 0.300, pdfConfirmed: false },
        { volumeMl: 500, toleranceMl: 0.500, pdfConfirmed: false },
        { volumeMl: 1000, toleranceMl: 0.800, pdfConfirmed: false },
        { volumeMl: 2000, toleranceMl: 1.200, pdfConfirmed: false },
      ] as GlasswareAllowance[],
    },

    /**
     * 表 4 - 单标线吸量管(容量吸管)容量允差 A 级
     * 数值由用户提供,pdfConfirmed=true。
     * 该类器具只能移取标称体积,不可用于任意读数。
     */
    singleMarkPipetteA: {
      pageRef: 'JJG 196-2006 表 4(A 级)',
      toolKind: 'volumetric_pipette' as Jjg196ToolKind,
      rawText:
        '单标线吸量管 A 级容量允差,' +
        '1 mL ±0.008,2 mL ±0.010,5 mL ±0.015,10 mL ±0.020,' +
        '25 mL ±0.030,50 mL ±0.050,100 mL ±0.080',
      extracted: [
        { volumeMl: 1, toleranceMl: 0.008, pdfConfirmed: true },
        { volumeMl: 2, toleranceMl: 0.010, pdfConfirmed: true },
        { volumeMl: 5, toleranceMl: 0.015, pdfConfirmed: true },
        { volumeMl: 10, toleranceMl: 0.020, pdfConfirmed: true },
        { volumeMl: 25, toleranceMl: 0.030, pdfConfirmed: true },
        { volumeMl: 50, toleranceMl: 0.050, pdfConfirmed: true },
        { volumeMl: 100, toleranceMl: 0.080, pdfConfirmed: true },
      ] as GlasswareAllowance[],
    },

    /**
     * 表 4 - 单标线吸量管 B 级(B 级 = A 级 × 2,按 JJG 惯例)
     * 数值待 PDF 核对。
     */
    singleMarkPipetteB: {
      pageRef: 'JJG 196-2006 表 4(B 级)',
      toolKind: 'volumetric_pipette' as Jjg196ToolKind,
      rawText: '单标线吸量管 B 级容量允差(待核对)',
      extracted: [
        { volumeMl: 1, toleranceMl: 0.015, pdfConfirmed: false },
        { volumeMl: 2, toleranceMl: 0.020, pdfConfirmed: false },
        { volumeMl: 5, toleranceMl: 0.030, pdfConfirmed: false },
        { volumeMl: 10, toleranceMl: 0.040, pdfConfirmed: false },
        { volumeMl: 25, toleranceMl: 0.060, pdfConfirmed: false },
        { volumeMl: 50, toleranceMl: 0.100, pdfConfirmed: false },
        { volumeMl: 100, toleranceMl: 0.160, pdfConfirmed: false },
      ] as GlasswareAllowance[],
    },
  },
} as const;

export function getFlaskAllowance(
  volumeMl: number,
  grade: 'A' | 'B',
): GlasswareAllowance | undefined {
  const list =
    grade === 'A'
      ? JJG_196_2006.clauses.volumetricFlaskA.extracted
      : JJG_196_2006.clauses.volumetricFlaskB.extracted;
  return list.find((item) => item.volumeMl === volumeMl);
}

export function getPipetteAllowance(
  volumeMl: number,
  grade: 'A' | 'B',
): GlasswareAllowance | undefined {
  const list =
    grade === 'A'
      ? JJG_196_2006.clauses.singleMarkPipetteA.extracted
      : JJG_196_2006.clauses.singleMarkPipetteB.extracted;
  return list.find((item) => item.volumeMl === volumeMl);
}

/** 常用容量瓶标称容量(mL) */
export const STANDARD_FLASK_SIZES_ML = [5, 10, 25, 50, 100, 250, 500, 1000, 2000] as const;

/** 常用单标线吸量管标称容量(mL) */
export const STANDARD_PIPETTE_SIZES_ML = [1, 2, 5, 10, 25, 50, 100] as const;
