// pH standard value calculator per pH.md description
// Buffers at 25°C: 1.68, 4.00, 6.86, 9.18, 12.46
// Logic:
// 1) For input temperature T, compute theoretical pH via fitted polynomial (per buffer)
// 2) From the standard table (HJ1147-2020, subset in pH.md at 0..50°C step 5),
//    select rows within [T-10, T+10] for the same buffer.
// 3) Pick the table pH closest to the theoretical pH.
// 4) Round to 2 decimals using "四舍六入五成双" (round half to even).

export type BufferLabel = "1.68" | "4.00" | "6.86" | "9.18" | "12.46";

interface TableRow { t: number; pH: number }

// Table from pH.md lines 21-31, columns per buffer in order:
// T, 4.00, 6.86, 9.18, 1.68, 12.46
const TABLE_TEMPS: number[] = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const TABLE_4_00: number[]  = [4.006, 3.999, 3.996, 3.996, 3.998, 4.003, 4.010, 4.019, 4.029, 4.042, 4.055];
const TABLE_6_86: number[]  = [6.981, 6.949, 6.921, 6.898, 6.879, 6.864, 6.852, 6.844, 6.838, 6.834, 6.833];
const TABLE_9_18: number[]  = [9.458, 9.391, 9.330, 9.276, 9.226, 9.182, 9.142, 9.105, 9.072, 9.042, 9.015];
const TABLE_1_68: number[]  = [1.668, 1.669, 1.671, 1.673, 1.676, 1.680, 1.684, 1.688, 1.694, 1.700, 1.706];
const TABLE_12_46: number[] = [13.416, 13.21, 13.011, 12.82, 12.637, 12.46, 12.292, 12.13, 11.975, 11.828, 11.697];

const TABLE: Record<BufferLabel, TableRow[]> = {
  "4.00": TABLE_TEMPS.map((t, i) => ({ t, pH: TABLE_4_00[i] })),
  "6.86": TABLE_TEMPS.map((t, i) => ({ t, pH: TABLE_6_86[i] })),
  "9.18": TABLE_TEMPS.map((t, i) => ({ t, pH: TABLE_9_18[i] })),
  "1.68": TABLE_TEMPS.map((t, i) => ({ t, pH: TABLE_1_68[i] })),
  "12.46": TABLE_TEMPS.map((t, i) => ({ t, pH: TABLE_12_46[i] })),
};

// Fitted polynomials (Excel formulas provided by user), with A2 being T(°C)
export function theoreticalPH(label: BufferLabel, T: number): number {
  const x = T;
  switch (label) {
    case "4.00":
      return 0.00000000099 * x**4 - 0.0000004 * x**3 + 0.00007005 * x**2 - 0.0016105 * x + 4.0057;
    case "6.86":
      return -0.000000307375 * (x**3) + 0.00009 * (x**2) - 0.0067 * x + 6.9802;
    case "9.18":
      return 0.000053 * (x**2) - 0.0113 * x + 9.4405;
    case "1.68":
      return 0.00000001 * (x**3) + 0.00001 * (x**2) + 0.0002 * x + 1.6679;
    case "12.46":
      return -0.0000000071 * x**4 + 0.000001055 * x**3 + 0.0001028 * x**2 - 0.0415 * x + 13.416;
  }
}

export function roundHalfToEven(x: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  const n = x * factor;
  const floor = Math.floor(n);
  const frac = n - floor;
  const EPS = 1e-12;
  if (Math.abs(frac - 0.5) < EPS) {
    const even = (floor % 2 === 0) ? floor : floor + 1;
    return even / factor;
  }
  return Math.round(n) / factor;
}

function closestTablePHWithinWindow(label: BufferLabel, T: number, windowC = 10): number {
  const rows = TABLE[label];
  const lower = T - windowC;
  const upper = T + windowC;
  const candidates = rows.filter(r => r.t >= lower && r.t <= upper);
  const theo = theoreticalPH(label, T);
  const pool = candidates.length > 0 ? candidates : rows; // fallback to all if none in window
  let best = pool[0];
  let bestDiff = Math.abs(best.pH - theo);
  for (let i = 1; i < pool.length; i++) {
    const d = Math.abs(pool[i].pH - theo);
    if (d < bestDiff) { best = pool[i]; bestDiff = d; }
  }
  return best.pH;
}

export interface PHResultItem { label: BufferLabel; standardValue: number; matchPH: number; theoretical: number }
export interface PHComputeResult { items: PHResultItem[] }

export function computePHStandardValues(T: number): PHComputeResult | { error: string } {
  if (T == null || Number.isNaN(T)) return { error: "请输入温度(℃)" };
  // recommended usable range according to table
  if (T < -10 || T > 60) {
    // still compute using nearest window fallback, but warn could be out of range if needed.
    // For now we allow any T and match to closest rows.
  }
  const labels: BufferLabel[] = ["1.68", "4.00", "6.86", "9.18", "12.46"];
  const items: PHResultItem[] = labels.map(label => {
    const theo = theoreticalPH(label, T);
    const match = closestTablePHWithinWindow(label, T, 10);
    const std = roundHalfToEven(match, 2);
    return { label, standardValue: std, matchPH: match, theoretical: theo };
  });
  return { items };
}

