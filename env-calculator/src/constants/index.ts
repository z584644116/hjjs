import { SamplingMouthSpec } from '@/types';

export const SAMPLING_MOUTH_SPECS: SamplingMouthSpec = {
  normal: [4.5, 6, 7, 8, 10, 12],
  lowConcentration: [4, 4.5, 5, 6, 7, 8, 10, 12, 14, 15, 16, 18, 20, 22, 24],
};

export const PROTECTION_POWER_FACTOR = 0.85;

export const STORAGE_KEYS = {
  AUTH_MODE: 'env_calc_auth_mode',
  USER_DATA: 'env_calc_user_data',
  INSTRUMENTS: 'env_calc_instruments',
  CURRENT_USER: 'env_calc_current_user',
};