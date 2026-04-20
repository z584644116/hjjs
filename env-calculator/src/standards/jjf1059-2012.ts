/**
 * JJF 1059.1-2012《测量不确定度评定与表示》
 *
 * 本文件仅登记计算中用到的核心公式与系数,供代码引用。
 */

export const JJF_1059_1_2012 = {
  id: 'JJF 1059.1-2012',
  fullName: '测量不确定度评定与表示',
  version: '2012',
  clauses: {
    rectangularDistribution: {
      pageRef: 'JJF 1059.1-2012 4.3.2.2(B 类评定,均匀分布)',
      rawText:
        '对于来源于仪器说明书、校准证书、量器允差等,若给出半宽度 a 且' +
        '假设概率分布为均匀分布(矩形分布)时,标准不确定度 u = a / √3。',
      extracted: {
        /** 均匀分布除数 k_uniform,用于 u = a / k */
        uniformDivisor: Math.sqrt(3),
        pdfConfirmed: false,
      },
    },
    expandedUncertainty: {
      pageRef: 'JJF 1059.1-2012 5.3(扩展不确定度)',
      rawText:
        '扩展不确定度 U = k · u_c,k 为包含因子。取 k=2 时,对应约 95% 的' +
        '包含概率(假设测量结果服从正态分布)。',
      extracted: {
        /** 扩展因子 k=2,对应置信水平约 95% */
        coverageFactorK2: 2,
        /** 扩展因子 k=3,对应置信水平约 99.7% */
        coverageFactorK3: 3,
        pdfConfirmed: false,
      },
    },
  },
} as const;

/** 将半宽度(矩形分布)转为标准不确定度 */
export function halfWidthToStandardUncertainty(halfWidth: number): number {
  return halfWidth / JJF_1059_1_2012.clauses.rectangularDistribution.extracted.uniformDivisor;
}

/** 合成相对不确定度 */
export function combineRelativeUncertainty(parts: number[]): number {
  return Math.sqrt(parts.reduce((sum, v) => sum + v * v, 0));
}

/** 扩展不确定度,默认 k=2 */
export function expandUncertainty(uc: number, k = 2): number {
  return k * uc;
}
