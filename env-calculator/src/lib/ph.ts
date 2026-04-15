export type BufferLabel = "1.68" | "4.00" | "6.86" | "9.18" | "12.46";

interface Dataset {
  range: [number, number];
  x: number[];
  y: number[];
}

const DATASETS: Record<BufferLabel, Dataset> = {
  "1.68": {
    range: [0, 95],
    x: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 95],
    y: [1.668, 1.669, 1.671, 1.673, 1.676, 1.68, 1.684, 1.688, 1.694, 1.7, 1.706, 1.713, 1.721, 1.739, 1.759, 1.782, 1.795],
  },
  "4.00": {
    range: [0, 95],
    x: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 95],
    y: [4.006, 3.999, 3.996, 3.996, 3.998, 4.003, 4.01, 4.019, 4.029, 4.042, 4.055, 4.07, 4.087, 4.122, 4.161, 4.203, 4.224],
  },
  "6.86": {
    range: [0, 95],
    x: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 95],
    y: [6.981, 6.949, 6.921, 6.898, 6.879, 6.864, 6.852, 6.844, 6.838, 6.834, 6.833, 6.834, 6.837, 6.847, 6.862, 6.881, 6.891],
  },
  "9.18": {
    range: [0, 95],
    x: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90, 95],
    y: [9.458, 9.391, 9.33, 9.276, 9.226, 9.182, 9.142, 9.105, 9.072, 9.042, 9.015, 8.99, 8.968, 8.926, 8.89, 8.856, 8.839],
  },
  "12.46": {
    range: [0, 60],
    x: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60],
    y: [13.416, 13.21, 13.011, 12.82, 12.637, 12.46, 12.292, 12.13, 11.975, 11.828, 11.697, 11.553, 11.426],
  },
};

export function theoreticalPH(label: BufferLabel, temperature: number): number {
  const x = temperature;

  switch (label) {
    case "4.00":
      return 0.00000000099 * x ** 4 - 0.0000004 * x ** 3 + 0.00007005 * x ** 2 - 0.0016105 * x + 4.0057;
    case "6.86":
      return -0.000000307375 * x ** 3 + 0.00009 * x ** 2 - 0.0067 * x + 6.9802;
    case "9.18":
      return 0.000053 * x ** 2 - 0.0113 * x + 9.4405;
    case "1.68":
      return 0.00000001 * x ** 3 + 0.00001 * x ** 2 + 0.0002 * x + 1.6679;
    case "12.46":
      return -0.0000000071 * x ** 4 + 0.000001055 * x ** 3 + 0.0001028 * x ** 2 - 0.0415 * x + 13.416;
  }
}

export function roundHalfToEven(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  const n = value * factor;
  const sign = n < 0 ? -1 : 1;
  const abs = Math.abs(n);
  const floor = Math.floor(abs);
  const diff = abs - floor;
  const eps = 1e-12;

  let result: number;
  if (diff > 0.5 + eps) result = floor + 1;
  else if (diff < 0.5 - eps) result = floor;
  else result = floor % 2 === 0 ? floor : floor + 1;

  return (sign * result) / factor;
}

function pchipSlopes(x: number[], y: number[]) {
  const n = x.length;
  const h = new Array(n - 1);
  const delta = new Array(n - 1);

  for (let i = 0; i < n - 1; i++) {
    h[i] = x[i + 1] - x[i];
    delta[i] = (y[i + 1] - y[i]) / h[i];
  }

  const d = new Array(n).fill(0);
  if (n === 2) {
    d[0] = delta[0];
    d[1] = delta[0];
    return d;
  }

  for (let k = 1; k <= n - 2; k++) {
    if (delta[k - 1] === 0 || delta[k] === 0 || Math.sign(delta[k - 1]) !== Math.sign(delta[k])) {
      d[k] = 0;
    } else {
      const w1 = 2 * h[k] + h[k - 1];
      const w2 = h[k] + 2 * h[k - 1];
      d[k] = (w1 + w2) / (w1 / delta[k - 1] + w2 / delta[k]);
    }
  }

  let d0 = ((2 * h[0] + h[1]) * delta[0] - h[0] * delta[1]) / (h[0] + h[1]);
  if (Math.sign(d0) !== Math.sign(delta[0])) d0 = 0;
  else if (Math.sign(delta[0]) !== Math.sign(delta[1]) && Math.abs(d0) > Math.abs(3 * delta[0])) d0 = 3 * delta[0];
  d[0] = d0;

  let dn = ((2 * h[n - 2] + h[n - 3]) * delta[n - 2] - h[n - 2] * delta[n - 3]) / (h[n - 2] + h[n - 3]);
  if (Math.sign(dn) !== Math.sign(delta[n - 2])) dn = 0;
  else if (Math.sign(delta[n - 2]) !== Math.sign(delta[n - 3]) && Math.abs(dn) > Math.abs(3 * delta[n - 2])) dn = 3 * delta[n - 2];
  d[n - 1] = dn;

  return d;
}

function pchipInterpolate(x: number[], y: number[], xq: number) {
  const n = x.length;
  if (xq < x[0] || xq > x[n - 1]) return null;

  const d = pchipSlopes(x, y);
  for (let i = 0; i < n; i++) {
    if (Math.abs(xq - x[i]) < 1e-12) return y[i];
  }

  let k = 0;
  while (k < n - 2 && xq > x[k + 1]) k++;

  const h = x[k + 1] - x[k];
  const t = (xq - x[k]) / h;
  const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
  const h10 = t ** 3 - 2 * t ** 2 + t;
  const h01 = -2 * t ** 3 + 3 * t ** 2;
  const h11 = t ** 3 - t ** 2;

  return h00 * y[k] + h10 * h * d[k] + h01 * y[k + 1] + h11 * h * d[k + 1];
}

function bracketIndex(x: number[], temperature: number) {
  for (let i = 0; i < x.length; i++) {
    if (Math.abs(temperature - x[i]) < 1e-12) {
      return { exact: true as const, idx: i };
    }
  }

  for (let i = 0; i < x.length - 1; i++) {
    if (temperature > x[i] && temperature < x[i + 1]) {
      return { exact: false as const, left: i, right: i + 1 };
    }
  }

  return null;
}

function matchLocalByReference(dataset: Dataset, temperature: number) {
  const position = bracketIndex(dataset.x, temperature);
  if (!position) return null;

  const reference = pchipInterpolate(dataset.x, dataset.y, temperature);
  if (reference == null) return null;

  if (position.exact) {
    return {
      reference,
      matchedTemp: dataset.x[position.idx],
      matchedValue: dataset.y[position.idx],
    };
  }

  const candidates = [position.left, position.right];
  candidates.sort((a, b) => {
    const diffA = Math.abs(dataset.y[a] - reference);
    const diffB = Math.abs(dataset.y[b] - reference);
    if (Math.abs(diffA - diffB) > 1e-12) return diffA - diffB;

    const tempA = Math.abs(dataset.x[a] - temperature);
    const tempB = Math.abs(dataset.x[b] - temperature);
    if (Math.abs(tempA - tempB) > 1e-12) return tempA - tempB;

    return a - b;
  });

  const index = candidates[0];
  return {
    reference,
    matchedTemp: dataset.x[index],
    matchedValue: dataset.y[index],
  };
}

export interface PHResultItem {
  label: BufferLabel;
  range: [number, number];
  standardValue: number;
  tableValue: number;
  theoretical: number;
  matchedTemp: number;
  displayValue: number;
  available: boolean;
}

export interface PHComputeResult {
  items: PHResultItem[];
}

export function computePHStandardValues(temperature: number): PHComputeResult | { error: string } {
  if (temperature == null || Number.isNaN(temperature)) {
    return { error: "请输入温度" };
  }

  if (temperature < 0 || temperature > 95) {
    return { error: "请输入 0–95 ℃ 范围内的温度" };
  }

  const labels: BufferLabel[] = ["1.68", "4.00", "6.86", "9.18", "12.46"];

  const items: PHResultItem[] = labels.map((label) => {
    const dataset = DATASETS[label];
    const [minT, maxT] = dataset.range;

    if (temperature < minT || temperature > maxT) {
      return {
        label,
        range: dataset.range,
        standardValue: NaN,
        tableValue: NaN,
        theoretical: NaN,
        matchedTemp: NaN,
        displayValue: NaN,
        available: false,
      };
    }

    const matched = matchLocalByReference(dataset, temperature);
    const theoretical = matched?.reference ?? theoreticalPH(label, temperature);
    const tableValue = matched?.matchedValue ?? NaN;
    const displayValue = Number.isNaN(tableValue) ? NaN : roundHalfToEven(tableValue, 2);

    return {
      label,
      range: dataset.range,
      standardValue: tableValue,
      tableValue,
      theoretical,
      matchedTemp: matched?.matchedTemp ?? NaN,
      displayValue,
      available: true,
    };
  });

  return { items };
}