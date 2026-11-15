export type ZmanKey = 'sunrise' | 'sunset' | 'chatzot' | 'sofZmanShma' | 'sofZmanTfilla';
export type RoundingMode = 'none' | '15s' | '1m';

export interface AppSettings {
  zmanKey: ZmanKey;
  offsetMinutes: number;
  rounding: RoundingMode;
  latitude: number;
  longitude: number;
  theme: 'light' | 'dark';
  isKiosk: boolean;
  useCustomTime: boolean;
  customTime: string;
  stopAtZero: boolean;
}

export type LocationCoords = {
  lat: number;
  lng: number;
};
