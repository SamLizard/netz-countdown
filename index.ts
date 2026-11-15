export type ZmanKey = 'sunrise' | 'sunset' | 'chatzot' | 'sofZmanShma' | 'sofZmanTfilla';

export type RoundingMode = 'none' | '15s' | '1m';

export interface AppSettings {
  zmanKey: ZmanKey;
  offsetMinutes: number;
  isMGA: boolean;
  rounding: RoundingMode;
  latitude: number;
  longitude: number;
  theme: 'light' | 'dark';
  isKiosk: boolean;
}

export interface ZmanOption {
  key: ZmanKey;
  label: string;
}

export type LocationCoords = { lat: number; lng: number };
