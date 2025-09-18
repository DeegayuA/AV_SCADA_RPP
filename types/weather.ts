// types/weather.ts

export interface OWMGeocodingResponseItem { lat: number; lon: number; name: string; country: string; state?: string; }
export interface OWMWeatherCondition { id: number; main: string; description: string; icon: string; }
export interface OWMMainCurrent { temp: number; feels_like: number; temp_min: number; temp_max: number; pressure: number; humidity: number; sea_level?: number; grnd_level?: number; }
export interface OWMWindCurrent { speed: number; deg: number; gust?: number; }
export interface OWMCloudsCurrent { all: number; }
export interface OWMSysCurrent { type?: number; id?: number; country: string; sunrise: number; sunset: number; }
export interface OWMCurrentWeatherResponse {
  coord: { lon: number; lat: number; };
  weather: OWMWeatherCondition[];
  base: string;
  main: OWMMainCurrent;
  visibility: number;
  wind: OWMWindCurrent;
  clouds: OWMCloudsCurrent;
  rain?: { "1h"?: number; "3h"?: number; };
  snow?: { "1h"?: number; "3h"?: number; };
  dt: number;
  sys: OWMSysCurrent;
  timezone: number; // Shift in seconds from UTC
  id: number;
  name: string; // City name
  cod: number;
}
export interface OWMForecastListItemMain extends OWMMainCurrent { temp_kf?: number; }
export interface OWMForecastListItem {
  dt: number;
  main: OWMForecastListItemMain;
  weather: OWMWeatherCondition[];
  clouds: OWMCloudsCurrent;
  wind: OWMWindCurrent;
  visibility: number;
  pop: number; // Probability of precipitation
  rain?: { "3h": number; };
  snow?: { "3h": number; };
  sys: { pod: "d" | "n"; }; // Part of the day (d = day, n = night)
  dt_txt: string; // "YYYY-MM-DD HH:MM:SS"
}
export interface OWMCityInfo { id: number; name: string; coord: { lat: number; lon: number; }; country: string; population: number; timezone: number; sunrise: number; sunset: number; }
export interface OWMForecastResponse {
  cod: string; message: number; cnt: number;
  list: OWMForecastListItem[];
  city: OWMCityInfo;
}
export interface OWMAirPollutionComponents { co: number; no: number; no2: number; o3: number; so2: number; pm2_5: number; pm10: number; nh3: number; }
export interface OWMAirPollutionListItem { dt: number; main: { aqi: 1 | 2 | 3 | 4 | 5 }; components: OWMAirPollutionComponents; }
export interface OWMAirPollutionResponse { coord: { lon: number; lat: number }; list: OWMAirPollutionListItem[]; }
