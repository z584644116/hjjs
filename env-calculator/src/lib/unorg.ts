// Unorganized emission monitoring suitability calculator (Pasquill-Turner based)
// Ported from the provided HTML app in 无组织监测适宜度计算.md

export type StabilityClass = 'A'|'A-B'|'B'|'B-C'|'C'|'D'|'E'|'F';

export const stabilityDescriptions: Record<StabilityClass, string> = {
  'A': '强不稳定', 'A-B': '不稳定', 'B': '不稳定',
  'B-C': '弱不稳定', 'C': '弱不稳定', 'D': '中性',
  'E': '较稳定', 'F': '稳定'
};

export const windProfileAlpha: Record<'city'|'countryside', Record<Exclude<StabilityClass,'A-B'|'B-C'>, number>> = {
  city: { 'A': 0.10, 'B': 0.15, 'C': 0.20, 'D': 0.25, 'E': 0.30, 'F': 0.30 },
  countryside: { 'A': 0.07, 'B': 0.07, 'C': 0.10, 'D': 0.15, 'E': 0.35, 'F': 0.35 }
};

export const suitabilityInfo = {
  text: { a: 'a 类', b: 'b 类', c: 'c 类', d: 'd 类' },
  desc: {
    a: '不利于污染物的扩散和稀释, 适宜于进行无组织排放监测',
    b: '较不利于污染物的扩散和稀释, 较适宜于进行无组织排放监测',
    c: '有利于污染物的扩散和稀释, 较不适宜进行无组织排放监测',
    d: '很有利于污染物的扩散和稀释, 不适宜进行无组织排放监测'
  },
  rank: { a: 1, b: 2, c: 3, d: 4 }
};

const toRadians = (deg: number) => (deg * Math.PI) / 180;
const toDegrees = (rad: number) => (rad * 180) / Math.PI;

export function calculateStdDev(arr: number[]): number {
  const n = arr.length;
  if (n < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const variance = arr.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / (n - 1);
  return Math.sqrt(variance);
}

export function getWindDirectionDescription(angle: number): string {
  const directions = [
    '北风', '东北偏北风', '东北风', '东北偏东风',
    '东风', '东南偏东风', '东南风', '东南偏南风',
    '南风', '西南偏南风', '西南风', '西南偏西风',
    '西风', '西北偏西风', '西北风', '西北偏北风'
  ];
  const normalizedAngle = ((angle % 360) + 360) % 360;
  const index = Math.round(normalizedAngle / 22.5) % 16;
  return directions[index];
}

export interface SolarParams {
  dayOfYear: number;
  solarDeclination: number; // degrees
  solarAltitude: number; // degrees
  radiationLevel: -2|-1|0|1|2|3;
}

export function calculateSolarParams(dateISO: string, timeHHmm: string, lat: number, lon: number, totalCloud: number, lowCloud: number): SolarParams {
  const date = new Date(dateISO);
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = (date.getTime() - startOfYear.getTime());
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);

  const Qo = toRadians((360 * dayOfYear) / 365);
  const solarDeclination = toDegrees(
    0.006918 - 0.399912 * Math.cos(Qo) + 0.070257 * Math.sin(Qo) -
    0.006758 * Math.cos(2 * Qo) + 0.00907 * Math.sin(2 * Qo) -
    0.002697 * Math.cos(3 * Qo) + 0.00148 * Math.sin(3 * Qo)
  );

  const [hour, minute] = timeHHmm.split(':').map(Number);
  const t = hour + minute / 60;
  const term1 = Math.sin(toRadians(lat)) * Math.sin(toRadians(solarDeclination));
  const term2 = Math.cos(toRadians(lat)) * Math.cos(toRadians(solarDeclination));
  const term3 = Math.cos(toRadians(15 * t + lon - 300));
  const solarAltitude = toDegrees(Math.asin(term1 + term2 * term3));

  const radiationLevel = getRadiationLevel(solarAltitude, totalCloud, lowCloud);
  return { dayOfYear, solarDeclination, solarAltitude, radiationLevel };
}

export function getRadiationLevel(h0: number, totalCloud: number, lowCloud: number): -2|-1|0|1|2|3 {
  if (h0 <= 0) {
    if (totalCloud <= 4) return -2;
    if (totalCloud <= 7) return -1;
    return 0;
  }
  const h_range = [15, 35, 65, Infinity];
  const levels = {
    low_cloud_clear:    [-1, 1, 2, 3],
    low_cloud_scatter:  [0,  1, 2, 3],
    low_cloud_broken:   [0,  0, 1, 1],
    mid_cloud_overcast: [0,  0, 0, 1],
    high_cloud_overcast:[0,  0, 0, 0]
  } as const;

  let cloud_condition: keyof typeof levels;
  if (lowCloud <= 4) {
    if (totalCloud <= 4) cloud_condition = 'low_cloud_clear';
    else if (totalCloud <= 7) cloud_condition = 'low_cloud_scatter';
    else cloud_condition = 'low_cloud_broken';
  } else if (lowCloud <= 7) {
    cloud_condition = 'mid_cloud_overcast';
  } else {
    cloud_condition = 'high_cloud_overcast';
  }

  const h_idx = h_range.findIndex(h => h0 <= h);
  return levels[cloud_condition][h_idx] as -2|-1|0|1|2|3;
}

export function getStabilityClass(windSpeed: number, radiationLevel: -2|-1|0|1|2|3): StabilityClass {
  const ws = windSpeed;
  if (ws < 1.9) {
    switch (radiationLevel) {
      case 3: return 'A'; case 2: return 'A-B'; case 1: return 'B';
      case 0: return 'D'; case -1: return 'E'; case -2: return 'F';
    }
  } else if (ws < 2.9) {
    switch (radiationLevel) {
      case 3: return 'A-B'; case 2: return 'B'; case 1: return 'C';
      case 0: return 'D'; case -1: return 'E'; case -2: return 'F';
    }
  } else if (ws < 6) {
    if (ws >= 3 && ws < 5) {
      switch (radiationLevel) {
        case 3: return 'B'; case 2: return 'B-C'; case 1: return 'C';
        case 0: return 'D'; case -1: return 'D'; case -2: return 'E';
      }
    } else { // 5 <= ws < 6
      switch (radiationLevel) {
        case 3: return 'C'; case 2: return 'C'; case 1: return 'D';
        default: return 'D';
      }
    }
  } else {
    return 'D';
  }
  return 'D';
}

export function calculateStability(measuredWindSpeed: number, radiationLevel: -2|-1|0|1|2|3, windSpeedType: 'custom'|'10m', height?: number, terrain?: 'city'|'countryside') {
  let windSpeed10m = measuredWindSpeed;
  if (windSpeedType === 'custom') {
    const h = height ?? 10;
    if (!isNaN(h) && h > 0 && h !== 10) {
      const preliminary = getStabilityClass(measuredWindSpeed, radiationLevel);
      const lookupClass = (preliminary.includes('-') ? preliminary.split('-')[0] : preliminary) as Exclude<StabilityClass,'A-B'|'B-C'>;
      const terr = terrain ?? 'countryside';
      const alpha = windProfileAlpha[terr][lookupClass];
      windSpeed10m = measuredWindSpeed * Math.pow(10 / h, alpha);
    }
  }
  const stabilityClass = getStabilityClass(windSpeed10m, radiationLevel);
  return { windSpeed10m, stabilityClass };
}

export function getWindDirSuitability(stdDev: number): 'a'|'b'|'c'|'d' {
  if (stdDev < 15) return 'a';
  if (stdDev < 30) return 'b';
  if (stdDev <= 45) return 'c';
  return 'd';
}

export function getWindSpeedSuitability(avgSpeed: number): 'a'|'b'|'c'|'d' {
  if (avgSpeed < 1.0) return 'd';
  if (avgSpeed <= 2.0) return 'a';
  if (avgSpeed <= 3.0) return 'b';
  if (avgSpeed <= 4.5) return 'c';
  return 'd';
}

export function getStabilitySuitability(sClass: StabilityClass): 'a'|'b'|'c'|'d' {
  if (sClass === 'E' || sClass === 'F') return 'a';
  if (sClass === 'D') return 'b';
  if (sClass === 'C' || sClass === 'B-C') return 'c';
  return 'd';
}

export interface SuitabilityResult {
  dirStdDev: number;
  meanDirection: number;
  directionDescription: string;
  dirSuitability: 'a'|'b'|'c'|'d';
  speedAvg: number;
  speedSuitability: 'a'|'b'|'c'|'d';
  stabilityClass: StabilityClass;
  stabilitySuitability: 'a'|'b'|'c'|'d';
  overall: 'a'|'b'|'c'|'d';
  shouldCancel: boolean;
}

export function calculateSuitability(directions: number[], windSpeed10m: number, stabilityClass: StabilityClass): SuitabilityResult {
  const dirStdDev = calculateStdDev(directions);
  const meanDirection = directions.reduce((a, b) => a + b, 0) / directions.length;
  const directionDescription = getWindDirectionDescription(meanDirection);

  const dirSuitability = getWindDirSuitability(dirStdDev);
  const speedSuitability = getWindSpeedSuitability(windSpeed10m);
  const stabilitySuitability = getStabilitySuitability(stabilityClass);

  const suitabilities = [dirSuitability, speedSuitability, stabilitySuitability];
  let worst: 'a'|'b'|'c'|'d' = 'a';
  for (const s of suitabilities) {
    if (suitabilityInfo.rank[s] > suitabilityInfo.rank[worst]) {
      worst = s as any;
    }
  }

  const c_count = suitabilities.filter(s => s === 'c').length;
  const d_count = suitabilities.filter(s => s === 'd').length;
  const shouldCancel = d_count > 0 || c_count >= 2;

  return {
    dirStdDev, meanDirection, directionDescription, dirSuitability,
    speedAvg: windSpeed10m, speedSuitability,
    stabilityClass, stabilitySuitability,
    overall: worst,
    shouldCancel
  };
}

