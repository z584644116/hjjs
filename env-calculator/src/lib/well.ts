// Groundwater well volume calculator based on provided Excel logic
// Inputs:
// - B (B2): well construction depth (m)
// - C (C2): casing inner diameter (cm)
// - D (D2): water level depth from ground (m)
// - E (E2): wellhead height above ground (m)
// - F (F2): enlarged bore diameter (cm)
// - G (G2): packing porosity (0~1)
// Outputs (rounded to 1 decimal place, half-to-even):
// - Buried depth (m) = D2 - E2
// - Water column depth (m) = B2 - Buried depth = B2 + E2 - D2
// - Water volume (L) = if G2 is empty => empty, else:
//     [ (C^2*pi/4)*(100*waterDepth_m) + ((F^2*pi/4)-(C^2*pi/4))*(100*waterDepth_m)*G ] / 1000
//   Where areas in cm^2, height in cm, result in cm^3 then /1000 to L.

export interface WellInputs {
  B_depth_m: number;     // B2
  C_id_cm: number;       // C2
  D_waterLevel_m: number;// D2
  E_headToGround_m: number; // E2
  F_enlarge_cm: number;  // F2
  G_porosity?: number;   // G2 (optional, 0~1). If undefined/null, volume is blank per Excel
}

export interface WellResult {
  buriedDepth_m: number;      // 埋深 m
  waterDepth_m: number;       // 井水深度 m
  waterVolume_L: number | null; // 井水体积 L (null when porosity missing)
}

export function roundHalfToEven(x: number, decimals = 1): number {
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

export function computeWell(inputs: WellInputs): WellResult {
  const { B_depth_m: B, C_id_cm: C, D_waterLevel_m: D, E_headToGround_m: E, F_enlarge_cm: F, G_porosity: G } = inputs;

  // Derived depths
  const buriedDepth_m = D - E;                 // 埋深
  const waterDepth_m = B + E - D;              // 井水深度

  // Round depths to 1 decimal as requested
  const buriedDepthRounded = roundHalfToEven(buriedDepth_m, 1);
  const waterDepthRounded = roundHalfToEven(waterDepth_m, 1);

  // If porosity missing, volume result is null per provided Excel convention
  if (G == null || Number.isNaN(G)) {
    return {
      buriedDepth_m: buriedDepthRounded,
      waterDepth_m: waterDepthRounded,
      waterVolume_L: null,
    };
  }

  // Areas in cm^2
  const pi = 3.14; // use 3.14 to stay consistent with Excel formula provided
  const area_pipe_cm2 = (C * C * pi) / 4;
  const area_enlarge_cm2 = (F * F * pi) / 4;
  const area_annulus_cm2 = Math.max(area_enlarge_cm2 - area_pipe_cm2, 0);

  // Height in cm (water column)
  const height_cm = 100 * (B + E - D);

  // Volume in cm^3
  const vol_pipe_cm3 = area_pipe_cm2 * height_cm;
  const vol_annulus_cm3 = area_annulus_cm2 * height_cm * G;
  const vol_total_L = (vol_pipe_cm3 + vol_annulus_cm3) / 1000; // to liters

  const volRounded = roundHalfToEven(vol_total_L, 1);

  return {
    buriedDepth_m: buriedDepthRounded,
    waterDepth_m: waterDepthRounded,
    waterVolume_L: volRounded,
  };
}

