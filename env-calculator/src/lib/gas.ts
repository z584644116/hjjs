// Gas unit conversion utilities: ppm ↔ mg/m^3 with temperature & pressure correction
// Gases: SO2, NO, NO2, CO, NMHC (NMHC defaults to propane-equivalent)

export type GasKey = 'SO2' | 'NO' | 'NO2' | 'CO' | 'NMHC';

export interface GasInfo {
  key: GasKey;
  name: string;
  molarMass_g_mol: number; // g/mol
  note?: string;
}

export const GAS_LIST: GasInfo[] = [
  { key: 'SO2', name: '二氧化硫 (SO₂)', molarMass_g_mol: 64.066 },
  { key: 'NO',  name: '一氧化氮 (NO)',  molarMass_g_mol: 30.006 },
  { key: 'NO2', name: '二氧化氮 (NO₂)', molarMass_g_mol: 46.0055 },
  { key: 'CO',  name: '一氧化碳 (CO)',  molarMass_g_mol: 28.010 },
  { key: 'NMHC',name: '非甲烷总烃 (NMHC)', molarMass_g_mol: 44.097, note: '按丙烷当量换算' },
];

export function getGasInfo(key: GasKey): GasInfo {
  const info = GAS_LIST.find(g => g.key === key);
  if (!info) throw new Error(`Unknown gas key: ${key}`);
  return info;
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

// Universal gas constant in L·atm/(mol·K)
const R_L_ATM = 0.082057338;

// Convert ppm (ppmv) → mg/m^3 at temperature (°C) and pressure (kPa)
export function ppmToMgPerM3(ppm: number, gas: GasKey, temperatureC = 25, pressureKPa = 101.325): number {
  const { molarMass_g_mol: M } = getGasInfo(gas);
  const T_K = temperatureC + 273.15;
  const P_atm = pressureKPa / 101.325;
  const mg_per_m3 = ppm * M * P_atm / (R_L_ATM * T_K);
  return mg_per_m3;
}

// Convert mg/m^3 → ppm (ppmv) at temperature (°C) and pressure (kPa)
export function mgPerM3ToPpm(mgPerM3: number, gas: GasKey, temperatureC = 25, pressureKPa = 101.325): number {
  const { molarMass_g_mol: M } = getGasInfo(gas);
  const T_K = temperatureC + 273.15;
  const P_atm = pressureKPa / 101.325;
  const ppm = mgPerM3 * (R_L_ATM * T_K) / (M * P_atm);
  return ppm;
}

export interface GasConvertParams {
  gas: GasKey;
  inputValue: number;
  inputUnit: 'ppm' | 'mg/m3';
  temperatureC: number; // °C
  pressureKPa: number;  // kPa
  decimals?: number;    // rounding decimals for result (default 2)
}

export interface GasConvertResult {
  gas: GasInfo;
  inputValue: number;
  inputUnit: 'ppm' | 'mg/m3';
  outputValue: number;
  outputUnit: 'ppm' | 'mg/m3';
  temperatureC: number;
  pressureKPa: number;
}

export function convertGasUnits(params: GasConvertParams): GasConvertResult {
  const { gas, inputValue, inputUnit, temperatureC, pressureKPa, decimals = 2 } = params;
  let outputValue: number;
  if (inputUnit === 'ppm') {
    outputValue = ppmToMgPerM3(inputValue, gas, temperatureC, pressureKPa);
    outputValue = roundHalfToEven(outputValue, decimals);
    return { gas: getGasInfo(gas), inputValue, inputUnit, outputValue, outputUnit: 'mg/m3', temperatureC, pressureKPa };
  } else {
    outputValue = mgPerM3ToPpm(inputValue, gas, temperatureC, pressureKPa);
    outputValue = roundHalfToEven(outputValue, decimals);
    return { gas: getGasInfo(gas), inputValue, inputUnit, outputValue, outputUnit: 'ppm', temperatureC, pressureKPa };
  }
}

