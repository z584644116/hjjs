import { CalculationError, requirePositive, roundTo } from './common';

// =========================================================================
// 1. 综合污染指数 P (适用于大气、水质、土壤等单因子比值 Ci/Si 的平均)
// =========================================================================

export interface PollutionIndexItem {
  name: string;
  measured: number;
  standard: number;
}

export interface PollutionIndexSingle {
  name: string;
  singleIndex: number;
  exceeded: boolean;
}

export interface PollutionIndexResult {
  items: PollutionIndexSingle[];
  averageIndex: number;
  maxIndex: number;
  maxItem: string;
  category: string;
}

function categoryFromAverageIndex(p: number): string {
  if (p <= 0.2) return '清洁';
  if (p <= 0.4) return '较清洁';
  if (p <= 0.7) return '轻度污染';
  if (p <= 1.0) return '中度污染';
  return '重度污染';
}

/**
 * 综合污染指数 P = (1/n)·Σ (Ci/Si)
 * 依据:通用环境质量评价方法(HJ 663 / GB 3838 等单因子归一化思路)。
 */
export function calculatePollutionIndex(items: PollutionIndexItem[]): PollutionIndexResult | CalculationError {
  if (!items || items.length === 0) return { error: '至少需要 1 个污染物数据' };
  const processed: PollutionIndexSingle[] = [];
  for (const item of items) {
    if (!Number.isFinite(item.measured) || item.measured < 0) {
      return { error: `${item.name || '污染物'} 实测值必须为非负数` };
    }
    if (!Number.isFinite(item.standard) || item.standard <= 0) {
      return { error: `${item.name || '污染物'} 评价标准必须 > 0` };
    }
    const singleIndex = item.measured / item.standard;
    processed.push({
      name: item.name || '未命名',
      singleIndex: roundTo(singleIndex, 3),
      exceeded: singleIndex > 1,
    });
  }
  const sum = processed.reduce((s, p) => s + p.singleIndex, 0);
  const maxItem = processed.reduce((m, p) => (p.singleIndex > m.singleIndex ? p : m), processed[0]);
  const p = sum / processed.length;

  return {
    items: processed,
    averageIndex: roundTo(p, 3),
    maxIndex: roundTo(maxItem.singleIndex, 3),
    maxItem: maxItem.name,
    category: categoryFromAverageIndex(p),
  };
}

// =========================================================================
// 2. 内梅罗综合指数 N = √((P̄² + P_max²)/2)
// =========================================================================

export interface NemerowIndexResult {
  items: PollutionIndexSingle[];
  averageIndex: number;
  maxIndex: number;
  maxItem: string;
  nemerowIndex: number;
  category: string;
}

function categoryFromNemerow(n: number): string {
  if (n <= 0.7) return '安全(清洁)';
  if (n <= 1.0) return '警戒(尚清洁)';
  if (n <= 2.0) return '轻污染';
  if (n <= 3.0) return '中污染';
  return '重污染';
}

/**
 * 内梅罗综合指数 N = √((P̄² + P_max²)/2)
 * 分级参考 GB 15618 土壤环境质量标准附录。
 */
export function calculateNemerowIndex(items: PollutionIndexItem[]): NemerowIndexResult | CalculationError {
  const base = calculatePollutionIndex(items);
  if ('error' in base) return base;

  const n = Math.sqrt((base.averageIndex * base.averageIndex + base.maxIndex * base.maxIndex) / 2);

  return {
    items: base.items,
    averageIndex: base.averageIndex,
    maxIndex: base.maxIndex,
    maxItem: base.maxItem,
    nemerowIndex: roundTo(n, 3),
    category: categoryFromNemerow(n),
  };
}

// =========================================================================
// 3. 富营养化综合营养状态指数 TLI (湖库五参数)
// =========================================================================

export interface TliInput {
  chlorophyllA: number;     // mg/m³
  totalPhosphorus: number;  // mg/L
  totalNitrogen: number;    // mg/L
  secchiDepth: number;      // m
  codMn: number;            // mg/L
}

export interface TliResult {
  tliChl: number;
  tliTP: number;
  tliTN: number;
  tliSD: number;
  tliCOD: number;
  tli: number;
  category: string;
}

function categoryFromTli(tli: number): string {
  if (tli < 30) return '贫营养';
  if (tli <= 50) return '中营养';
  if (tli <= 60) return '轻度富营养';
  if (tli <= 70) return '中度富营养';
  return '重度富营养';
}

/**
 * 综合营养状态指数 TLI(Σ)
 *   TLI(Chla) = 10·(2.5 + 1.086·ln Chla)        Chla mg/m³
 *   TLI(TP)   = 10·(9.436 + 1.624·ln TP)        TP mg/L
 *   TLI(TN)   = 10·(5.453 + 1.694·ln TN)        TN mg/L
 *   TLI(SD)   = 10·(5.118 - 1.94·ln SD)         SD m (透明度)
 *   TLI(COD)  = 10·(0.109 + 2.661·ln CODMn)     mg/L
 *   综合 TLI = Σ Wj·TLI(j),权重 Chla 0.2663、TP 0.1879、TN 0.1790、SD 0.1834、COD 0.1834
 * 依据:GB 3838-2002 附录评价方法。
 */
export function calculateTli(input: TliInput): TliResult | CalculationError {
  const checks: Array<[number, string]> = [
    [input.chlorophyllA, '叶绿素 a'],
    [input.totalPhosphorus, '总磷 TP'],
    [input.totalNitrogen, '总氮 TN'],
    [input.secchiDepth, '透明度 SD'],
    [input.codMn, '高锰酸盐指数 CODMn'],
  ];
  for (const [v, name] of checks) {
    const err = requirePositive(v, name);
    if (err) return err;
  }

  const tliChl = 10 * (2.5 + 1.086 * Math.log(input.chlorophyllA));
  const tliTP = 10 * (9.436 + 1.624 * Math.log(input.totalPhosphorus));
  const tliTN = 10 * (5.453 + 1.694 * Math.log(input.totalNitrogen));
  const tliSD = 10 * (5.118 - 1.94 * Math.log(input.secchiDepth));
  const tliCOD = 10 * (0.109 + 2.661 * Math.log(input.codMn));

  const w = { chl: 0.2663, tp: 0.1879, tn: 0.179, sd: 0.1834, cod: 0.1834 };
  const tli = w.chl * tliChl + w.tp * tliTP + w.tn * tliTN + w.sd * tliSD + w.cod * tliCOD;

  return {
    tliChl: roundTo(tliChl, 1),
    tliTP: roundTo(tliTP, 1),
    tliTN: roundTo(tliTN, 1),
    tliSD: roundTo(tliSD, 1),
    tliCOD: roundTo(tliCOD, 1),
    tli: roundTo(tli, 1),
    category: categoryFromTli(tli),
  };
}

// =========================================================================
// 4. 生物多样性 (Shannon-Wiener / Simpson / Pielou / Margalef)
// =========================================================================

export interface BiodiversityResult {
  total: number;
  species: number;
  shannonH: number;
  maxH: number;
  pielouEvenness: number;
  simpsonD: number;
  simpsonDiversity: number;
  margalefD: number;
}

/**
 * 生物多样性四指数一次算完:
 *   Shannon-Wiener H' = -Σ pᵢ·ln(pᵢ)
 *   Pielou 均匀度 J' = H'/ln(S)
 *   Simpson 优势度 D = Σ pᵢ²,Simpson 多样性 = 1 - D
 *   Margalef 丰富度 d = (S - 1)/ln(N)
 */
export function calculateBiodiversity(abundances: number[]): BiodiversityResult | CalculationError {
  const valid = abundances.filter((n) => Number.isFinite(n) && n > 0);
  if (valid.length < 2) return { error: '至少需要 2 个物种的有效个体数(> 0)' };

  const N = valid.reduce((s, n) => s + n, 0);
  const S = valid.length;

  let H = 0;
  let D = 0;
  for (const n of valid) {
    const p = n / N;
    H -= p * Math.log(p);
    D += p * p;
  }

  const maxH = Math.log(S);
  const J = maxH > 0 ? H / maxH : 0;
  const margalef = N > 1 ? (S - 1) / Math.log(N) : 0;

  return {
    total: roundTo(N, 3),
    species: S,
    shannonH: roundTo(H, 3),
    maxH: roundTo(maxH, 3),
    pielouEvenness: roundTo(J, 3),
    simpsonD: roundTo(D, 3),
    simpsonDiversity: roundTo(1 - D, 3),
    margalefD: roundTo(margalef, 3),
  };
}

// =========================================================================
// 5. 地累积指数 Igeo (Müller 法)
// =========================================================================

export interface IgeoInput {
  measured: number;
  background: number;
  /** 地球化学背景变动修正系数,默认 1.5。 */
  kFactor?: number;
}

export interface IgeoResult {
  igeo: number;
  category: string;
}

function categoryFromIgeo(igeo: number): string {
  if (igeo <= 0) return '无污染';
  if (igeo <= 1) return '无到中度污染';
  if (igeo <= 2) return '中度污染';
  if (igeo <= 3) return '中到强污染';
  if (igeo <= 4) return '强污染';
  if (igeo <= 5) return '强到极强污染';
  return '极强污染';
}

/**
 * Müller 地累积指数:Igeo = log₂(Ci / (k · Bi))
 *   Ci 实测值,Bi 背景值,k 校正系数(默认 1.5)
 * 分级遵循 Müller 七级分类。
 */
export function calculateIgeo(input: IgeoInput): IgeoResult | CalculationError {
  const mErr = requirePositive(input.measured, '实测值');
  if (mErr) return mErr;
  const bErr = requirePositive(input.background, '背景值');
  if (bErr) return bErr;
  const k = input.kFactor ?? 1.5;
  if (!Number.isFinite(k) || k <= 0) return { error: '校正系数 k 必须 > 0' };

  const igeo = Math.log2(input.measured / (k * input.background));

  return {
    igeo: roundTo(igeo, 3),
    category: categoryFromIgeo(igeo),
  };
}
