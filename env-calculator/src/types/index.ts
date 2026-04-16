export interface User {
  id: string;
  username: string;
  email?: string;
  createdAt: string;
}

export interface AuthUser extends User {
  recoveryKey: string;
}

export interface CalculationInput {
  samplingType: 'normal' | 'low-concentration';
  smokeVelocity: number; // m/s
  moistureContent: number; // %
}

export interface CalculationResult {
  dryGasVelocity: number;
  fullPowerRecommendedDiameter: number;
  protectionPowerRecommendedDiameter: number;
  availableDiameters: number[];
}

export interface SamplingMouthSpec {
  normal: number[];
  lowConcentration: number[];
}

export type AuthMode = 'initial' | 'guest' | 'registered';
export type StorageMode = 'local' | 'cloud';
