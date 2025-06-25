'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// Tabs might only be for config dialog now
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


import {
  Settings, Thermometer, Droplets, Sun, Wind, MapPin, Edit3, Save, XCircle, CloudSun, CloudRain, Cloud, Moon,
  CloudSnow, CloudLightning, CloudDrizzle, CloudFog, CloudMoon, Eye, Zap, Waves, Leaf, AlertTriangle, HelpCircle, SunMedium, CloudCog,
  ChevronDown, Smile, Snowflake, Sunrise, Sunset, LucideIcon, Package, ThermometerSun, ThermometerSnowflake, CalendarDays, Gauge, ArrowDownUp,
  Loader2, Compass, Search, Clock3, Users, BarChart3, AirVent, Cloudy, CloudHail, Tornado, Briefcase // Added some more icons
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/appStore';
import { DataPoint } from '@/config/dataPoints';
import { NodeData } from '@/app/DashboardData/dashboardInterfaces';
import { cn } from '@/lib/utils';

// --- Plant Location (configurable via environment variable or default) ---
export const PLANT_LOCATION = process.env.NEXT_PUBLIC_PLANT_LOCATION;

// --- Types for OpenWeatherMap API Responses (Free Tier Focus) ---
interface OWMGeocodingResponseItem { lat: number; lon: number; name: string; country: string; state?: string; }
interface OWMWeatherCondition { id: number; main: string; description: string; icon: string; }
interface OWMMainCurrent { temp: number; feels_like: number; temp_min: number; temp_max: number; pressure: number; humidity: number; sea_level?: number; grnd_level?: number; }
interface OWMWindCurrent { speed: number; deg: number; gust?: number; }
interface OWMCloudsCurrent { all: number; }
interface OWMSysCurrent { type?: number; id?: number; country: string; sunrise: number; sunset: number; }
interface OWMCurrentWeatherResponse {
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
interface OWMForecastListItemMain extends OWMMainCurrent { temp_kf?: number; }
interface OWMForecastListItem {
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
interface OWMCityInfo { id: number; name: string; coord: { lat: number; lon: number; }; country: string; population: number; timezone: number; sunrise: number; sunset: number; }
interface OWMForecastResponse {
  cod: string; message: number; cnt: number;
  list: OWMForecastListItem[];
  city: OWMCityInfo;
}
interface OWMAirPollutionComponents { co: number; no: number; no2: number; o3: number; so2: number; pm2_5: number; pm10: number; nh3: number; }
interface OWMAirPollutionListItem { dt: number; main: { aqi: 1 | 2 | 3 | 4 | 5 }; components: OWMAirPollutionComponents; } // AQI: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
interface OWMAirPollutionResponse { coord: { lon: number; lat: number }; list: OWMAirPollutionListItem[]; }


// --- Helper Functions ---
const degreesToCardinalSimple = (deg: number | undefined): string => { 
  if (deg === undefined || deg === null || isNaN(deg)) return '';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(deg / 45) % 8];
};
const getAqiString = (aqi: number | undefined): { text: string, colorClass: string, iconColor: string } => {
  if (aqi === undefined) return { text: "N/A", colorClass: "text-muted-foreground", iconColor: "text-gray-400" };
  switch (aqi) {
    case 1: return { text: "Good", colorClass: "text-green-500 dark:text-green-400", iconColor: "text-green-500" };
    case 2: return { text: "Fair", colorClass: "text-yellow-500 dark:text-yellow-400", iconColor: "text-yellow-500" };
    case 3: return { text: "Moderate", colorClass: "text-orange-500 dark:text-orange-400", iconColor: "text-orange-500" };
    case 4: return { text: "Poor", colorClass: "text-red-500 dark:text-red-400", iconColor: "text-red-500" };
    case 5: return { text: "Very Poor", colorClass: "text-purple-500 dark:text-purple-400", iconColor: "text-purple-500" };
    default: return { text: `AQI ${aqi}`, colorClass: "text-muted-foreground", iconColor: "text-gray-400" };
  }
};
const getPollutantDisplayName = (key: string) => {
  const name = key.replace('_', '.').toLowerCase(); // Handle cases like "pm2_5" -> "pm2.5"
  switch (name) {
    case 'pm2.5': return <>PM<sub>2.5</sub></>;
    case 'pm10': return <>PM<sub>10</sub></>;
    case 'no2': return <>NO<sub>2</sub></>;
    case 'so2': return <>SO<sub>2</sub></>;
    case 'o3': return <>O<sub>3</sub></>;
    case 'co': return 'CO';
    case 'nh3': return <>NH<sub>3</sub></>;
    default: return name.toUpperCase();
  }
};
const DynamicWeatherIcon: React.FC<{ iconCode?: string; isDay?: boolean; className?: string; animate?: boolean }> = React.memo(({ iconCode, isDay = true, className = "w-12 h-12", animate = true }) => {
  const iconProps = { className: cn("drop-shadow-lg", className) };
  let IconComponent: React.ReactNode;
  const commonDayColor = 'gold'; 
  const commonNightColor = '#c1d4e8'; 
  const cloudColor = '#c1d4e8'; 
  const rainColor = '#60a5fa'; 
  const severeColor = '#f59e0b'; 

  switch (iconCode?.slice(0, 2)) {
    case '01': IconComponent = isDay ? <Sun {...iconProps} style={{ color: commonDayColor }} /> : <Moon {...iconProps} style={{ color: commonNightColor }} />; break;
    case '02': IconComponent = isDay ? <CloudSun {...iconProps} style={{ color: commonDayColor }} /> : <CloudMoon {...iconProps} style={{ color: commonNightColor }} />; break;
    case '03': IconComponent = <Cloud {...iconProps} style={{ color: cloudColor }} />; break;
    case '04': IconComponent = <Cloudy {...iconProps} style={{ color: '#a0aec0' }} />; break; 
    case '09': IconComponent = <CloudDrizzle {...iconProps} style={{ color: rainColor }} />; break;
    case '10': IconComponent = <CloudRain {...iconProps} style={{ color: rainColor }} />; break;
    case '11': IconComponent = <CloudLightning {...iconProps} style={{ color: severeColor }} />; break;
    case '13': IconComponent = <CloudSnow {...iconProps} style={{ color: '#e0f2fe' }} />; break; 
    case '50': IconComponent = <CloudFog {...iconProps} style={{ color: '#d1d5db' }} />; break; 
    default: IconComponent = isDay ? <CloudSun {...iconProps} style={{ color: commonDayColor }} /> : <CloudMoon {...iconProps} style={{ color: commonNightColor }} />;
  }
  if (!animate) return <div className="flex-shrink-0">{IconComponent}</div>;
  return <motion.div className="flex-shrink-0" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>{IconComponent}</motion.div>;
});
DynamicWeatherIcon.displayName = 'DynamicWeatherIcon';

// --- Config Definitions ---
const AVAILABLE_CUSTOM_ICONS: Record<string, LucideIcon> = { Thermometer, Droplets, Sun, Wind, Compass, MapPin, Zap, Waves, Leaf, Eye, CloudCog, Settings, Smile, Snowflake, Sunrise, Sunset, Package, ThermometerSun, ThermometerSnowflake, Gauge, ArrowDownUp, Briefcase, BarChart3, Users, AirVent, Clock3, CalendarDays, Cloudy };
interface BaseWeatherItem { id: string; defaultLabel: string; defaultUnit?: string; defaultIcon: LucideIcon; iconColorClass?: string; }
const STANDARD_WEATHER_ITEM_DEFINITIONS: BaseWeatherItem[] = [
  { id: 'temperature', defaultLabel: 'Temp.', defaultUnit: '°C', defaultIcon: Thermometer, iconColorClass: "text-orange-500 dark:text-orange-400" },
  { id: 'humidity', defaultLabel: 'Hum.', defaultUnit: '%', defaultIcon: Droplets, iconColorClass: "text-blue-500 dark:text-blue-400" },
  { id: 'solarIrradiance', defaultLabel: 'Solar', defaultUnit: 'W/m²', defaultIcon: SunMedium, iconColorClass: "text-yellow-500 dark:text-yellow-400" },
  { id: 'windSpeed', defaultLabel: 'Wind Spd', defaultUnit: 'm/s', defaultIcon: Wind, iconColorClass: "text-sky-500 dark:text-sky-400" },
  { id: 'windDirection', defaultLabel: 'Wind Dir', defaultUnit: '°', defaultIcon: Compass, iconColorClass: "text-teal-500 dark:text-teal-400" },
  { id: 'custom1', defaultLabel: 'Custom Sensor', defaultUnit: '', defaultIcon: Package, iconColorClass: "text-purple-500 dark:text-purple-400" },
];
export interface ConfiguredOpcUaItem { definitionId: string; opcUaNodeId?: string; label?: string; unit?: string; iconName?: keyof typeof AVAILABLE_CUSTOM_ICONS; }
export interface WeatherCardConfig {
  opcUaItems: ConfiguredOpcUaItem[];
  forecastApiKey?: string;
  forecastCityName?: string;
  showForecast: boolean;
  showHourlyForecast: boolean;
  showDailySummary: boolean;
  showAirPollution: boolean;
  numOpcSensorsToShow: number;
  numHourlyForecastsToShow: number;
  numDailyForecastsToShow: number;
}
interface WeatherCardProps { initialConfig: WeatherCardConfig; opcUaData: NodeData; allPossibleDataPoints: DataPoint[]; onConfigChange: (newConfig: WeatherCardConfig) => void; }
export const WEATHER_CARD_CONFIG_KEY = `weatherCardConfig_v3.5_compact_${process.env.NEXT_PUBLIC_PLANT_NAME || 'defaultPlant'}`;
const SELECT_NONE_VALUE = '__SELECT_NONE_VALUE__';

// --- Animated Value & Hooks ---
const AnimatedValue: React.FC<{ value: string | number, className?: string, unit?: string, unitClassName?: string, prefix?: string, prefixClassName?: string, animate?: boolean }> = React.memo(({ value, className, unit, unitClassName, prefix, prefixClassName, animate = true }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = usePrevious(value);
  useEffect(() => {
    if (animate && ref.current && prevValue !== undefined && value !== prevValue) {
      ref.current.classList.add('value-change-pulse');
      const timer = setTimeout(() => ref.current?.classList.remove('value-change-pulse'), 300);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue, animate]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix && <span className={cn("text-xs opacity-70 mr-0.5", prefixClassName)}>{prefix}</span>}
      {value}{unit && <span className={cn("text-xs opacity-70 ml-0.5", unitClassName)}>{unit}</span>}
    </span>
  );
});
AnimatedValue.displayName = 'AnimatedValue';
function usePrevious<T>(value: T): T | undefined { const ref = useRef<T | undefined>(undefined); useEffect(() => { ref.current = value; }); return ref.current; }

// --- Default Configuration ---
const defaultConfig: WeatherCardConfig = {
  opcUaItems: STANDARD_WEATHER_ITEM_DEFINITIONS.map(def => ({
    definitionId: def.id, opcUaNodeId: undefined, label: def.defaultLabel, unit: def.defaultUnit,
    ...(def.id === 'custom1' && { iconName: 'Package' as keyof typeof AVAILABLE_CUSTOM_ICONS })
  })),
  showForecast: true, forecastApiKey: undefined, forecastCityName: PLANT_LOCATION,
  showHourlyForecast: true, showDailySummary: true, showAirPollution: true,
  numOpcSensorsToShow: 3, numHourlyForecastsToShow: 5, numDailyForecastsToShow: 3,
};

// --- Main Weather Card Component ---
const WeatherCard: React.FC<WeatherCardProps> = ({ initialConfig, opcUaData, allPossibleDataPoints, onConfigChange }) => {
  const [config, setConfig] = useState<WeatherCardConfig>(defaultConfig);
  const [localConfig, setLocalConfig] = useState<WeatherCardConfig>(defaultConfig);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  const [resolvedCoordinates, setResolvedCoordinates] = useState<{ lat: number, lon: number } | null>(null);
  const [isLoadingGeocoding, setIsLoadingGeocoding] = useState(false);
  const [errorGeocoding, setErrorGeocoding] = useState<string | null>(null);

  const [currentWeatherDetails, setCurrentWeatherDetails] = useState<OWMCurrentWeatherResponse | null>(null);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);
  const [errorCurrent, setErrorCurrent] = useState<string | null>(null);

  const [forecast3Hour5Day, setForecast3Hour5Day] = useState<OWMForecastResponse | null>(null);
  const [isLoading3HourForecast, setIsLoading3HourForecast] = useState(false);
  const [error3HourForecast, setError3HourForecast] = useState<string | null>(null);

  const [airPollutionData, setAirPollutionData] = useState<OWMAirPollutionResponse | null>(null);
  const [isLoadingAirPollution, setIsLoadingAirPollution] = useState(false);
  const [errorAirPollution, setErrorAirPollution] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<Record<string, string>>({});
  const { isEditMode } = useAppStore();

  useEffect(() => {
    let currentProcessedConfig = JSON.parse(JSON.stringify(defaultConfig));
    currentProcessedConfig = {
      ...currentProcessedConfig, ...initialConfig,
      showForecast: initialConfig.showForecast !== undefined ? initialConfig.showForecast : defaultConfig.showForecast,
      forecastCityName: initialConfig.forecastCityName || defaultConfig.forecastCityName,
      showHourlyForecast: initialConfig.showHourlyForecast !== undefined ? initialConfig.showHourlyForecast : defaultConfig.showHourlyForecast,
      showDailySummary: initialConfig.showDailySummary !== undefined ? initialConfig.showDailySummary : defaultConfig.showDailySummary,
      showAirPollution: initialConfig.showAirPollution !== undefined ? initialConfig.showAirPollution : defaultConfig.showAirPollution,
      numOpcSensorsToShow: initialConfig.numOpcSensorsToShow || defaultConfig.numOpcSensorsToShow,
      numHourlyForecastsToShow: initialConfig.numHourlyForecastsToShow || defaultConfig.numHourlyForecastsToShow,
      numDailyForecastsToShow: initialConfig.numDailyForecastsToShow || defaultConfig.numDailyForecastsToShow,
      opcUaItems: defaultConfig.opcUaItems.map(defaultItemDef => {
        const storedItem = initialConfig.opcUaItems?.find(si => si.definitionId === defaultItemDef.definitionId);
        return storedItem ? { ...defaultItemDef, ...storedItem, label: storedItem.label || defaultItemDef.label, unit: storedItem.unit || defaultItemDef.unit, iconName: storedItem.iconName || (defaultItemDef.definitionId === 'custom1' ? 'Package' as keyof typeof AVAILABLE_CUSTOM_ICONS : undefined) } : defaultItemDef;
      })
    };
    STANDARD_WEATHER_ITEM_DEFINITIONS.forEach(sd => { if (!currentProcessedConfig.opcUaItems.find((i: { definitionId: string; }) => i.definitionId === sd.id)) currentProcessedConfig.opcUaItems.push({ ...sd, ...(sd.id === 'custom1' && { iconName: 'Package' }) }); });
    setConfig(currentProcessedConfig);
    if (!isConfigDialogOpen) setLocalConfig(JSON.parse(JSON.stringify(currentProcessedConfig)));
  }, [initialConfig, isConfigDialogOpen]);

  const apiAbortControllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => apiAbortControllerRef.current?.abort(), []);

  useEffect(() => {
    const geocodeCity = async () => {
      apiAbortControllerRef.current?.abort();
      apiAbortControllerRef.current = new AbortController();
      const signal = apiAbortControllerRef.current.signal;

      if (!config.showForecast || !config.forecastApiKey || !config.forecastCityName) {
        setResolvedCoordinates(null); setIsLoadingGeocoding(false); setErrorGeocoding(null);
        setCurrentWeatherDetails(null); setErrorCurrent(null);
        setForecast3Hour5Day(null); setError3HourForecast(null);
        setAirPollutionData(null); setErrorAirPollution(null);
        return;
      }
      setIsLoadingGeocoding(true); setErrorGeocoding(null); setResolvedCoordinates(null);
      setCurrentWeatherDetails(null); setErrorCurrent(null);
      setForecast3Hour5Day(null); setError3HourForecast(null);
      setAirPollutionData(null); setErrorAirPollution(null);
      try {
        const geocodeApiUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(config.forecastCityName)}&limit=1&appid=${config.forecastApiKey}`;
        const response = await fetch(geocodeApiUrl, { signal });
        if (!response.ok) { const data_1 = await response.json(); throw new Error(data_1.message || `Geocoding: ${response.statusText}`); }
        const data = await response.json() as OWMGeocodingResponseItem[];
        if (signal.aborted) return;
        if (data && data.length > 0) setResolvedCoordinates({ lat: data[0].lat, lon: data[0].lon });
        else throw new Error(`City "${config.forecastCityName}" not found.`);
      } catch (err: any) { if (signal.aborted) return; setErrorGeocoding(err.message); setResolvedCoordinates(null); }
      finally { if (!signal.aborted) setIsLoadingGeocoding(false); }
    };
    const debounceTimer = setTimeout(geocodeCity, 700);
    return () => clearTimeout(debounceTimer);
  }, [config.showForecast, config.forecastApiKey, config.forecastCityName]);

  useEffect(() => {
    if (!resolvedCoordinates || !config.forecastApiKey || !config.showForecast || errorGeocoding) {
      setIsLoadingCurrent(false); setIsLoading3HourForecast(false); setIsLoadingAirPollution(false);
      return;
    }

    apiAbortControllerRef.current?.abort();
    apiAbortControllerRef.current = new AbortController();
    const signal = apiAbortControllerRef.current.signal;
    const { lat, lon } = resolvedCoordinates;

    const fetchData = async () => {
      setIsLoadingCurrent(true); setErrorCurrent(null);
      try {
        const currentApiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${config.forecastApiKey}&units=metric`;
        const res = await fetch(currentApiUrl, { signal });
        if (!res.ok) { const d = await res.json(); throw new Error(`Current: ${d.message || res.statusText}`); }
        const data = await res.json() as OWMCurrentWeatherResponse;
        if (!signal.aborted) setCurrentWeatherDetails(data);
      } catch (err: any) { if (!signal.aborted) setErrorCurrent(err.message); }
      finally { if (!signal.aborted) setIsLoadingCurrent(false); }

      if (config.showHourlyForecast || config.showDailySummary) {
        setIsLoading3HourForecast(true); setError3HourForecast(null);
        try {
          const forecastApiUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${config.forecastApiKey}&units=metric`;
          const res = await fetch(forecastApiUrl, { signal });
          if (!res.ok) { const d = await res.json(); throw new Error(`Forecast: ${d.message || res.statusText}`); }
          const data = await res.json() as OWMForecastResponse;
          if (!signal.aborted) setForecast3Hour5Day(data);
        } catch (err: any) { if (!signal.aborted) setError3HourForecast(err.message); }
        finally { if (!signal.aborted) setIsLoading3HourForecast(false); }
      } else { setForecast3Hour5Day(null); }

      if (config.showAirPollution) {
        setIsLoadingAirPollution(true); setErrorAirPollution(null);
        try {
          const airApiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${config.forecastApiKey}`;
          const res = await fetch(airApiUrl, { signal });
          if (!res.ok) { const d = await res.json(); throw new Error(`Air Quality: ${d.message || res.statusText}`); }
          const data = await res.json() as OWMAirPollutionResponse;
          if (!signal.aborted) setAirPollutionData(data);
        } catch (err: any) { if (!signal.aborted) setErrorAirPollution(err.message); }
        finally { if (!signal.aborted) setIsLoadingAirPollution(false); }
      } else { setAirPollutionData(null); }
    };
    fetchData();
    const intervalId = setInterval(fetchData, 30 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [resolvedCoordinates, config.forecastApiKey, config.showForecast, config.showHourlyForecast, config.showDailySummary, config.showAirPollution, errorGeocoding]);

  const handleDialogSave = () => { setIsConfigDialogOpen(false); const newConfig = JSON.parse(JSON.stringify(localConfig)); setConfig(newConfig); onConfigChange(newConfig); if (typeof window !== 'undefined') localStorage.setItem(WEATHER_CARD_CONFIG_KEY, JSON.stringify(newConfig)); };
  const handleEditClick = () => { setLocalConfig(JSON.parse(JSON.stringify(config))); setIsConfigDialogOpen(true); };
  const handleDialogOnOpenChange = (open: boolean) => { setIsConfigDialogOpen(open); if (open) setLocalConfig(JSON.parse(JSON.stringify(config))); else setSearchTerm({}); };
  const getOpcUaRawValue = (nodeId?: string): string | number | undefined => { if (!nodeId || !opcUaData || opcUaData[nodeId] === undefined || opcUaData[nodeId] === null) return undefined; const value = opcUaData[nodeId]; return typeof value === 'boolean' ? (value ? 1 : 0) : value; };
  const getOpcUaProcessedValue = (nodeId?: string, dataPoint?: DataPoint): string => { const rawValue = getOpcUaRawValue(nodeId); if (rawValue === undefined) return 'N/A'; let value: number | string = rawValue; if (dataPoint?.factor && typeof value === 'number') value = value * dataPoint.factor; if (typeof value === 'number' && dataPoint?.precision !== undefined) return value.toFixed(dataPoint.precision); if (typeof value === 'number') return value.toFixed(1); return String(value); };
  const opcUaItemsToDisplay = useMemo(() => { return config.opcUaItems.filter(item => item.opcUaNodeId).map(configuredItem => { const definition = STANDARD_WEATHER_ITEM_DEFINITIONS.find(d => d.id === configuredItem.definitionId); if (!definition) return null; const dataPoint = allPossibleDataPoints.find(dp => dp.nodeId === configuredItem.opcUaNodeId); const IconComp = configuredItem.definitionId === 'custom1' && configuredItem.iconName ? AVAILABLE_CUSTOM_ICONS[configuredItem.iconName] || definition.defaultIcon : definition.defaultIcon; let displayValue: string | number = getOpcUaProcessedValue(configuredItem.opcUaNodeId, dataPoint); let displayUnit = configuredItem.unit || dataPoint?.unit || definition.defaultUnit || ''; if (configuredItem.definitionId === 'windDirection' && !isNaN(parseFloat(String(displayValue)))) { displayValue = degreesToCardinalSimple(parseFloat(String(displayValue))); displayUnit = ''; } return { id: configuredItem.definitionId + (configuredItem.opcUaNodeId || Math.random().toString(36).substr(2, 9)), label: configuredItem.label || definition.defaultLabel, value: displayValue, unit: displayUnit, IconComponent: IconComp, iconColorClass: definition.iconColorClass, dataPoint, }; }).filter((item): item is NonNullable<typeof item> => item !== null); }, [config.opcUaItems, opcUaData, allPossibleDataPoints]);

  const currentMain = currentWeatherDetails?.main;
  const currentWind = currentWeatherDetails?.wind;
  const currentSys = currentWeatherDetails?.sys;
  const currentWeatherIcon = currentWeatherDetails?.weather[0]?.icon;
  const isCurrentDay = currentSys ? (currentWeatherDetails!.dt > currentSys.sunrise && currentWeatherDetails!.dt < currentSys.sunset) : true;

  const currentForecastBgGradient = useMemo(() => {
    if (!currentWeatherDetails) return "from-slate-700/80 to-slate-900/80";
    const icon = currentWeatherDetails.weather[0]?.icon;
    const isDay = isCurrentDay;
    if (!isDay) return "from-indigo-800/80 via-slate-800/80 to-black/80";
    if (icon?.startsWith("01")) return "from-sky-500/80 via-cyan-500/80 to-blue-600/80";
    if (icon?.startsWith("02") || icon?.startsWith("03")) return "from-sky-400/80 via-slate-500/80 to-slate-600/80";
    if (icon?.startsWith("04")) return "from-slate-500/80 to-slate-700/80";
    if (icon?.startsWith("09") || icon?.startsWith("10")) return "from-blue-600/80 via-slate-700/80 to-slate-800/80";
    if (icon?.startsWith("11")) return "from-yellow-600/80 via-orange-700/80 to-slate-800/80";
    if (icon?.startsWith("13")) return "from-blue-400/80 via-sky-500/80 to-sky-600/80";
    if (icon?.startsWith("50")) return "from-slate-400/80 via-gray-500/80 to-slate-600/80";
    return "from-sky-500/80 to-blue-700/80";
  }, [currentWeatherDetails, isCurrentDay]);

  const formatTime = (timestamp: number, timezoneOffsetSeconds: number = 0): string => { if (!timestamp) return 'N/A'; const date = new Date((timestamp + timezoneOffsetSeconds) * 1000); return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: true }).toLowerCase().replace(' ', ''); };
  const getShortDayName = (timestamp: number, timezoneOffsetSeconds: number = 0): string => { const date = new Date((timestamp + timezoneOffsetSeconds) * 1000); return date.toLocaleDateString([], { weekday: 'short', timeZone: 'UTC' }); };
  const getHour = (timestamp: number, timezoneOffsetSeconds: number = 0): string => { const date = new Date((timestamp + timezoneOffsetSeconds) * 1000); return date.toLocaleTimeString([], { hour: 'numeric', hour12: true, timeZone: 'UTC' }).toLowerCase().replace(' ', ''); };

  const dailyAggregatedForecast = useMemo(() => {
    if (!forecast3Hour5Day || !forecast3Hour5Day.list || !config.showDailySummary) return [];
    const timezoneOffset = forecast3Hour5Day.city.timezone;
    const dailyData: Record<string, { date: Date, temps: number[], icons: string[], pops: number[] }> = {};
    forecast3Hour5Day.list.forEach(item => {
      const date = new Date((item.dt + timezoneOffset) * 1000);
      const dayKey = date.toISOString().split('T')[0];
      if (!dailyData[dayKey]) dailyData[dayKey] = { date, temps: [], icons: [], pops: [] };
      dailyData[dayKey].temps.push(item.main.temp);
      dailyData[dayKey].icons.push(item.weather[0].icon);
      dailyData[dayKey].pops.push(item.pop);
    });
    return Object.values(dailyData).map(day => ({
      dt: day.date.getTime() / 1000,
      dayName: getShortDayName(day.date.getTime() / 1000, 0),
      temp_max: Math.max(...day.temps), temp_min: Math.min(...day.temps),
      icon: day.icons[Math.floor(day.icons.length / 2)] || day.icons[0],
      pop: Math.max(...day.pops),
    })).slice(0, config.numDailyForecastsToShow || 3);
  }, [forecast3Hour5Day, config.showDailySummary, config.numDailyForecastsToShow]);

  const isAnyForecastLoading = isLoadingGeocoding || isLoadingCurrent || isLoading3HourForecast || isLoadingAirPollution;
  const anyForecastError = errorGeocoding || errorCurrent || error3HourForecast || errorAirPollution;

  const currentAQI = airPollutionData?.list?.[0]?.main?.aqi;
  const currentAqiInfo = getAqiString(currentAQI);


  return (
    <motion.div layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, type: "spring", stiffness: 150, damping: 25 }} className="relative font-sans w-full">
      <Card className="shadow-2xl bg-card/80 dark:bg-card/70 backdrop-blur-2xl border-border/30 overflow-hidden w-full rounded-lg min-h-[140px]"> {/* Changed rounded-lg to rounded-2xl */}
        {isEditMode && (
          <Dialog open={isConfigDialogOpen} onOpenChange={handleDialogOnOpenChange}>
            <DialogTrigger asChild><motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }} className="absolute top-2.5 right-2.5 z-50"><Button variant="ghost" size="icon" className="h-9 w-9 bg-black/20 hover:bg-black/40 text-white/80 hover:text-white rounded-full shadow-lg" onClick={handleEditClick} title="Configure"><Settings className="w-5 h-5" /></Button></motion.div></DialogTrigger> {/* Adjusted top/right */}
            <DialogContent className="max-w-xl w-[95vw] sm:w-full">
              <DialogHeader><DialogTitle className="text-2xl font-semibold flex items-center gap-2.5 text-primary"><CloudCog className="w-7 h-7" /> Weather Settings</DialogTitle><DialogDescription className="text-sm">Configure local sensors, external forecast, and display preferences.</DialogDescription></DialogHeader>
              <ScrollArea className="max-h-[65vh] p-0 pr-4 -mr-4 mt-3 mb-5">
                <div className="space-y-6 py-2 px-1">
                  {STANDARD_WEATHER_ITEM_DEFINITIONS.map((itemDef, defIndex) => {
                    let currentItemConfig = localConfig.opcUaItems.find(ci => ci.definitionId === itemDef.id) || { definitionId: itemDef.id, iconName: itemDef.id === 'custom1' ? 'Package' : undefined, opcUaNodeId: undefined, label: itemDef.defaultLabel, unit: itemDef.defaultUnit };
                    const selectedDataPoint = allPossibleDataPoints.find(dp => dp.nodeId === currentItemConfig.opcUaNodeId);
                    const filteredDataPoints = allPossibleDataPoints.filter(dp => (dp.category === 'weather' || !dp.category || ['Float', 'Double', 'Boolean'].includes(dp.dataType || '') || (dp.dataType || '').includes('Int')) && (searchTerm[itemDef.id] ? dp.name.toLowerCase().includes(searchTerm[itemDef.id].toLowerCase()) || dp.nodeId.toLowerCase().includes(searchTerm[itemDef.id].toLowerCase()) : true));
                    return (<motion.div key={itemDef.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 * defIndex }} className="p-4 border rounded-lg bg-muted/30 dark:bg-muted/20 space-y-3 shadow-sm"><h4 className="font-semibold text-md text-foreground flex items-center gap-2 border-b pb-1.5 mb-2.5"><itemDef.defaultIcon className={cn("w-4 h-4", itemDef.iconColorClass)} />{itemDef.id === 'custom1' ? (currentItemConfig.label || itemDef.defaultLabel) : itemDef.defaultLabel}{itemDef.id !== 'custom1' ? <Badge variant="outline" className="ml-auto text-xs px-1.5 py-0.5">Std</Badge> : <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0.5">Custom</Badge>}</h4>{itemDef.id === 'custom1' && (<AnimatePresence><motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2.5 overflow-hidden"><div className="space-y-1"><Label htmlFor={`cl-${itemDef.id}`} className="text-xs">Label</Label><Input id={`cl-${itemDef.id}`} value={currentItemConfig.label || ''} onChange={(e) => setLocalConfig(p => ({ ...p, opcUaItems: p.opcUaItems.map(c => c.definitionId === itemDef.id ? { ...c, label: e.target.value } : c) }))} className="h-8 text-xs" /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor={`cu-${itemDef.id}`} className="text-xs">Unit</Label><Input id={`cu-${itemDef.id}`} value={currentItemConfig.unit || ''} onChange={(e) => setLocalConfig(p => ({ ...p, opcUaItems: p.opcUaItems.map(c => c.definitionId === itemDef.id ? { ...c, unit: e.target.value } : c) }))} className="h-8 text-xs" /></div><div className="space-y-1"><Label htmlFor={`ci-${itemDef.id}`} className="text-xs">Icon</Label><Select value={currentItemConfig.iconName || 'Package'} onValueChange={(val) => setLocalConfig(p => ({ ...p, opcUaItems: p.opcUaItems.map(c => c.definitionId === itemDef.id ? { ...c, iconName: val as any } : c) }))}><SelectTrigger id={`ci-${itemDef.id}`} className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(AVAILABLE_CUSTOM_ICONS).map(([n, Ic]) => (<SelectItem key={n} value={n} className="text-xs"><div className="flex items-center gap-2"><Ic className="w-3.5 h-3.5" />{n}</div></SelectItem>))}</SelectContent></Select></div></div></motion.div></AnimatePresence>)}<div className="space-y-1"><Label htmlFor={`st-${itemDef.id}`} className="text-xs">OPC UA Source</Label><Popover modal><PopoverTrigger asChild id={`st-${itemDef.id}`}><Button variant="outline" role="combobox" className="w-full justify-between font-normal text-xs h-8">{selectedDataPoint ? <div className="truncate"><span className="font-medium">{selectedDataPoint.name}</span><span className="text-xs op-60 ml-1.5">({selectedDataPoint.dataType})</span></div> : `Select source...`}<ChevronDown className="ml-1 h-3.5 w-3.5 op-50" /></Button></PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-xl"><Command><CommandInput placeholder="Search name/ID..." value={searchTerm[itemDef.id] || ''} onValueChange={s => setSearchTerm(p => ({ ...p, [itemDef.id]: s }))} className="h-8 text-xs" /><CommandList><CommandEmpty>No results.</CommandEmpty>{selectedDataPoint && <CommandGroup heading="Current"><CommandItem value={selectedDataPoint.nodeId} className="op-50 pt-event-none text-xs">{selectedDataPoint.name}<Badge variant="outline" className="ml-auto text-[10px]">{selectedDataPoint.dataType}</Badge></CommandItem></CommandGroup>}<CommandGroup><CommandItem value={SELECT_NONE_VALUE} onSelect={() => { setLocalConfig(p => ({ ...p, opcUaItems: p.opcUaItems.map(c => c.definitionId === itemDef.id ? { ...c, opcUaNodeId: undefined } : c) })); (document.activeElement as HTMLElement)?.blur() }} className="text-xs"><XCircle className="mr-1.5 h-3.5 w-3.5" />Clear</CommandItem></CommandGroup><CommandGroup heading="Available">{filteredDataPoints.map(dp => (<CommandItem key={dp.id} value={dp.nodeId} onSelect={v => { setLocalConfig(p => ({ ...p, opcUaItems: p.opcUaItems.map(c => c.definitionId === itemDef.id ? { ...c, opcUaNodeId: v === SELECT_NONE_VALUE ? undefined : v } : c) })); (document.activeElement as HTMLElement)?.blur() }} className="text-xs">{dp.name}<Badge variant="outline" className="ml-auto text-[10px]">{dp.dataType}</Badge></CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent></Popover></div>{selectedDataPoint && (<motion.div initial={{ opacity: 0, y: -5, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto', marginTop: '0.5rem' }} className="p-2 border border-dashed rounded-md bg-background/50 text-[11px] space-y-0.5"><p><strong>Raw:</strong> <Badge variant="outline" className="font-mono text-[10px]">{String(getOpcUaRawValue(selectedDataPoint.nodeId) ?? 'N/A')}</Badge></p><p><strong>Processed:</strong> <Badge variant="secondary" className="text-[10px]">{getOpcUaProcessedValue(selectedDataPoint.nodeId, selectedDataPoint)} {selectedDataPoint.unit || currentItemConfig.unit || itemDef.defaultUnit}</Badge></p></motion.div>)}</motion.div>);
                  })}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 * STANDARD_WEATHER_ITEM_DEFINITIONS.length }} className="p-4 border rounded-lg bg-muted/30 dark:bg-muted/20 space-y-3 shadow-sm">
                    <h4 className="font-semibold text-md text-foreground flex items-center gap-2 border-b pb-1.5 mb-2.5"><CloudSun className="w-4 h-4 text-yellow-500" /> External Forecast & Display</h4>
                    <div className="flex items-center justify-between"><Label htmlFor="sf-s-d" className="text-xs font-medium cursor-pointer flex items-center gap-1.5"><SunMedium className="w-3.5 h-3.5" /> Show Forecast API Data</Label><Switch id="sf-s-d" checked={localConfig.showForecast} onCheckedChange={c => setLocalConfig(p => ({ ...p, showForecast: c }))} /></div>
                    <AnimatePresence>{localConfig.showForecast && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2.5 pt-2 mt-2 border-t border-border/30 overflow-hidden">
                      <div className="space-y-1"><Label htmlFor="ak-d" className="text-xs">OWM API Key <TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle className="inline w-3 h-3 op-70 ml-1 cursor-help" /></TooltipTrigger><TooltipContent><p>OpenWeatherMap API Key (Free tier available).</p></TooltipContent></Tooltip></TooltipProvider></Label><Input id="ak-d" type="password" placeholder="API Key" value={localConfig.forecastApiKey || ''} onChange={e => setLocalConfig(p => ({ ...p, forecastApiKey: e.target.value }))} className="h-8 text-xs" /></div>
                      <div className="space-y-1"><Label htmlFor="cy-d" className="text-xs">Location (City) <TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle className="inline w-3 h-3 op-70 ml-1 cursor-help" /></TooltipTrigger><TooltipContent><p>"City, Country Code" (e.g., London, GB)</p></TooltipContent></Tooltip></TooltipProvider></Label><Input id="cy-d" placeholder="e.g., Colombo, LK" value={localConfig.forecastCityName || ''} onChange={e => setLocalConfig(p => ({ ...p, forecastCityName: e.target.value }))} className="h-8 text-xs" /></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 pt-2">
                        <div className="flex items-center justify-between"><Label htmlFor="shf-s" className="text-xs cursor-pointer">Show Hourly Details</Label><Switch id="shf-s" checked={localConfig.showHourlyForecast} onCheckedChange={c => setLocalConfig(p => ({ ...p, showHourlyForecast: c }))} /></div>
                        <div className="flex items-center justify-between"><Label htmlFor="sds-s" className="text-xs cursor-pointer">Show Daily Summary</Label><Switch id="sds-s" checked={localConfig.showDailySummary} onCheckedChange={c => setLocalConfig(p => ({ ...p, showDailySummary: c }))} /></div>
                        <div className="flex items-center justify-between col-span-1 sm:col-span-2"><Label htmlFor="sap-s" className="text-xs cursor-pointer">Show Air Quality</Label><Switch id="sap-s" checked={localConfig.showAirPollution} onCheckedChange={c => setLocalConfig(p => ({ ...p, showAirPollution: c }))} /></div>
                      </div>
                    </motion.div>)}</AnimatePresence>
                    <div className="space-y-3 pt-3 mt-3 border-t border-border/30">
                      <h5 className="text-sm font-medium">Glance View Counts:</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3"> 
                        <div className="space-y-1"><Label htmlFor="nopcs" className="text-xs">Sensors</Label><Input type="number" id="nopcs" min="1" max="8" value={localConfig.numOpcSensorsToShow} onChange={e => setLocalConfig(p => ({ ...p, numOpcSensorsToShow: parseInt(e.target.value) || 3 }))} className="h-8 text-xs" /></div>
                        <div className="space-y-1"><Label htmlFor="nhfs" className="text-xs">Hourly</Label><Input type="number" id="nhfs" min="3" max="12" value={localConfig.numHourlyForecastsToShow} onChange={e => setLocalConfig(p => ({ ...p, numHourlyForecastsToShow: parseInt(e.target.value) || 5 }))} className="h-8 text-xs" /></div>
                        <div className="space-y-1"><Label htmlFor="ndfs" className="text-xs">Daily</Label><Input type="number" id="ndfs" min="2" max="7" value={localConfig.numDailyForecastsToShow} onChange={e => setLocalConfig(p => ({ ...p, numDailyForecastsToShow: parseInt(e.target.value) || 3 }))} className="h-8 text-xs" /></div>
                      </div>
                    </div>
                  </motion.div>
                </div></ScrollArea>
              <DialogFooter className="pt-5 sm:justify-end gap-2 border-t"><DialogClose asChild><Button variant="outline" className="w-full sm:w-auto h-9 text-xs"><XCircle className="w-3.5 h-3.5 mr-1.5" />Cancel</Button></DialogClose><Button onClick={handleDialogSave} className="w-full sm:w-auto h-9 bg-green-600 hover:bg-green-700 text-white text-xs"><Save className="w-3.5 h-3.5 mr-1.5" />Apply Settings</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Main Card Content - Single Row Layout */}
        <div className={cn("flex flex-col md:flex-row items-stretch h-full transition-all duration-500 md:rounded-lg", `bg-gradient-to-br ${currentForecastBgGradient}`)}> {/* Ensure rounded-r consistent with Card */}
          {/* Left Section: Current Weather Dominant Display */}
          <motion.div
            layout="position"
            className="relative flex flex-col justify-between p-4 text-white overflow-hidden w-auto md:flex-shrink-0 md:rounded-lg" /* Adjusted padding, width, and rounded-l */
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
            <AnimatePresence mode="wait">
              {isLoadingCurrent || (isLoadingGeocoding && !currentWeatherDetails) ? (
                <motion.div key="loading-main" {...contentFadeProps} className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 z-10 backdrop-blur-sm rounded-l-2xl"><Loader2 className="w-8 h-8 animate-spin" /><p className="mt-2 text-xs opacity-80">{isLoadingGeocoding ? "Finding location..." : "Fetching weather..."}</p></motion.div>
              ) : errorCurrent || (errorGeocoding && !currentWeatherDetails && config.showForecast) ? (
                <motion.div key="error-main" {...contentFadeProps} className="flex flex-col items-center justify-center text-center p-2 h-full"><AlertTriangle className="w-10 h-10 text-red-300 mb-1.5" /><p className="font-semibold text-sm text-red-200">Data Error</p><p className="text-xs text-red-200/80 break-words max-w-[90%]">{errorGeocoding || errorCurrent}</p></motion.div>
              ) : currentWeatherDetails && currentMain && currentSys && currentWind ? (
                <motion.div key="current-data" {...contentFadeProps} className="flex flex-col justify-between h-full">
                  <div className="weather-text-wrapper flex flex-col items-start justify-between gap-3 sm:gap-4">
                    <div className="flex flex-row items-start gap-2 sm:gap-3">
                      <DynamicWeatherIcon iconCode={currentWeatherIcon} className="w-16 h-16 sm:w-20 md:w-24 drop-shadow-2xl" isDay={isCurrentDay} />
                      <div className="mt-1">
                        <AnimatedValue value={currentMain.temp.toFixed(0)} className="text-5xl sm:text-6xl font-bold tracking-tighter" unit="°C" unitClassName="text-2xl opacity-80 ml-1" />
                        <p className="text-sm capitalize text-white/80 -mt-1 truncate max-w-[150px] sm:max-w-[200px]" title={currentWeatherDetails.weather[0]?.description}>{currentWeatherDetails.weather[0]?.description}</p>
                      </div>
                    </div>
                    <div className="my-2 sm:my-2.5"> {/* Adjusted margin */}
                      <h1 className="text-xl sm:text-2xl font-semibold text-white truncate max-w-full" title={currentWeatherDetails.name + (currentSys.country ? `, ${currentSys.country}` : '')}>
                        {currentWeatherDetails.name}{currentSys.country ? `, ${currentSys.country}` : ''}
                      </h1>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-md text-white/90"> {/* Responsive grid, text-sm, increased gap-y */}
                    <span className="flex items-center gap-1.5"><ThermometerSun className="w-3.5 h-3.5 opacity-80" />Feels: <AnimatedValue value={currentMain.feels_like.toFixed(0)} unit="°C" /></span>
                    <span className="flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 opacity-80" />Hum: <AnimatedValue value={currentMain.humidity} unit="%" /></span>
                    <span className="flex items-center gap-1.5"><Wind className="w-3.5 h-3.5 opacity-80" />Wind: <AnimatedValue value={currentWind.speed.toFixed(1)} unit="m/s" /> {degreesToCardinalSimple(currentWind.deg)}</span>
                    <span className="flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 opacity-80" />Pres: <AnimatedValue value={currentMain.pressure} unit="hPa" /></span> {/* Changed icon to Gauge */}
                    <span className="flex items-center gap-1.5"><Sunrise className="w-3.5 h-3.5 opacity-80" />Rise: {formatTime(currentSys.sunrise, currentWeatherDetails.timezone)}</span>
                    <span className="flex items-center gap-1.5"><Sunset className="w-3.5 h-3.5 opacity-80" />Set: {formatTime(currentSys.sunset, currentWeatherDetails.timezone)}</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="no-data-main" {...contentFadeProps} className="flex flex-col items-center justify-center h-full">
                  <CloudCog className="w-12 h-12 text-sky-200/50 mb-2" />
                  <p className="text-sm text-sky-100/70">{!config.showForecast ? "Forecast API disabled" : "Weather data loading..."}</p>
                  {!config.showForecast && !isEditMode && <p className="text-xs text-sky-100/50">Contact admin to enable.</p>}
                  {!config.showForecast && isEditMode && <p className="text-xs text-sky-100/60">Enable in settings <Settings className="inline w-3 h-3 align-text-bottom" />.</p>}
                </motion.div>
              )}
              {opcUaItemsToDisplay.length > 0 && (
                <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="pt-3"> {/* Added pt-3 */}
                  <h4 className="text-xs font-semibold text-white/70 dark:text-foreground/70 pb-1.5 flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5" />Local Sensors</h4> {/* Adjusted color */}
                  <div className="w-full pb-1.5">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 w-full">
                      {opcUaItemsToDisplay.slice(0, config.numOpcSensorsToShow || 3).map((item, index) => (
                      <TooltipProvider key={item.id} delayDuration={100}>
                        <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div
                          initial={{ opacity: 0, scale: 0.8, x: -10 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ delay: 0.35 + index * 0.1, type: "spring", stiffness: 250, damping: 15 }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 dark:bg-black/20 dark:hover:bg-black/40 shadow-md cursor-default transition-colors">
                          <item.IconComponent className={cn("w-4 h-4 flex-shrink-0", item.iconColorClass || "text-sky-300")} />
                          <div className="text-xs">
                            <AnimatedValue value={item.value} className="font-medium" />
                            <span className="text-[10px] opacity-70 ml-0.5">{item.unit}</span>
                          </div>
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="z-50 bg-popover/90 backdrop-blur-sm text-popover-foreground"><p>{item.label}: {item.value} {item.unit}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      ))}
                      {opcUaItemsToDisplay.length > (config.numOpcSensorsToShow || 3) && (
                      <div className="col-span-2 flex justify-center">
                        <Badge variant="outline" className="text-[10px] py-0.5 px-1.5 bg-white/10 border-white/20 text-white/80">+ {opcUaItemsToDisplay.length - (config.numOpcSensorsToShow || 3)} more</Badge>
                      </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <p className="text-[9px] text-white/40 absolute bottom-1.5 right-2 hidden lg:block hover:text-white/70 transition-colors">From OpenWeatherMap API</p> {/* Adjusted opacity and position */}
          </motion.div>

          <div className="hidden md:block w-px bg-white/20 dark:bg-white/10 my-4"></div> {/* Adjusted margin */}
          <div className="md:hidden h-px bg-white/20 dark:bg-white/10 mx-4 my-1"></div> {/* Adjusted margin */}

          {/* Right Section: Compact Summaries */}
          <div className="flex-grow p-3 sm:p-4 space-y-3 overflow-hidden bg-black/10 dark:bg-black/20 md:rounded-r-lg"> {/* Adjusted padding */}
            <AnimatePresence mode="wait">
              {isAnyForecastLoading && !anyForecastError &&
                <motion.div key="loading-summaries" {...contentFadeProps} className="flex items-center justify-center text-xs text-muted-foreground dark:text-white/60 h-full py-10">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Fetching summaries...
                </motion.div>
              }
              {anyForecastError && config.showForecast &&
                <motion.div key="error-summaries" {...contentFadeProps} className="flex flex-col items-center justify-center text-xs text-red-500 dark:text-red-400 h-full py-10 text-center">
                  <AlertTriangle className="w-6 h-6 mb-1" /> Forecast Error: <span className="block break-all max-w-xs">{anyForecastError}</span>
                </motion.div>
              }
            </AnimatePresence>

            <AnimatePresence>
              {!isAnyForecastLoading && !anyForecastError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="space-y-3 md:space-y-4 h-full flex flex-col justify-around" /* Increased gap */
                >
                  {/* Hourly Forecast + AQI Group */}
                    <div className="flex flex-col sm:flex-row sm:items-stretch sm:justify-between gap-3 h-full"> {/* Added h-full */}
                    {/* Hourly Forecast + Daily Summary Container Block */}
                    <div className="flex flex-col gap-3 sm:flex-grow sm:min-w-0 h-full"> {/* Added h-full */}
                      {config.showHourlyForecast && forecast3Hour5Day && forecast3Hour5Day.list.length > 0 && (
                      <motion.div className="flex-grow h-full flex flex-col" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}> {/* Added h-full flex flex-col */}
                        <h4 className="text-xs font-semibold text-foreground/70 dark:text-white/60 mb-1.5 ml-0.5 flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5" />Today (Hourly)</h4>
                        <div className="w-full pb-1.5 -mb-1.5 overflow-hidden flex-grow"> {/* Added flex-grow */}
                        <div className={`grid gap-1.5 items-stretch h-full ${
                          config.numHourlyForecastsToShow <= 3 
                          ? 'grid-cols-3 sm:grid-cols-3 md:grid-cols-3' 
                          : config.numHourlyForecastsToShow <= 4
                          ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-4'
                          : config.numHourlyForecastsToShow <= 5
                          ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5'
                          : config.numHourlyForecastsToShow <= 6
                          ? 'grid-cols-3 sm:grid-cols-3 md:grid-cols-6'
                          : config.numHourlyForecastsToShow <= 8
                          ? 'grid-cols-4 sm:grid-cols-4 md:grid-cols-4'
                          : config.numHourlyForecastsToShow <= 10
                          ? 'grid-cols-5 sm:grid-cols-5 md:grid-cols-5'
                          : 'grid-cols-6 sm:grid-cols-6 md:grid-cols-6'
                        }`}> {/* Added items-stretch h-full */}
                          {forecast3Hour5Day.list.slice(0, config.numHourlyForecastsToShow || 5).map((item, index) => (
                          <motion.div
                            key={item.dt}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 + index * 0.08, type: "spring", stiffness: 200, damping: 12 }}
                            className="flex flex-col items-center justify-between p-1.5 rounded-lg bg-background/40 hover:bg-background/70 dark:bg-black/20 dark:hover:bg-black/40 shadow-sm min-w-[52px] text-center space-y-0.5 transition-colors h-full"> {/* Added justify-between and h-full */}
                            <p className="text-[10px] font-medium text-muted-foreground dark:text-white/50">{getHour(item.dt, forecast3Hour5Day.city.timezone)}</p>
                            <DynamicWeatherIcon iconCode={item.weather[0].icon} isDay={item.sys.pod === 'd'} className="w-6 h-6 my-0" animate={false} />
                            <AnimatedValue value={item.main.temp.toFixed(0)} className="text-xs font-semibold" unit="°" unitClassName="text-[9px]" />
                            {item.pop > 0.2 && <Badge variant="outline" className="text-[9px] scale-90 px-1 py-0 font-normal bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"><Droplets className="w-2 h-2 mr-0.5" />{(item.pop * 100).toFixed(0)}%</Badge>}
                          </motion.div>
                          ))}
                        </div>
                        </div>
                      </motion.div>
                      )}
                      {config.showHourlyForecast && (!forecast3Hour5Day || forecast3Hour5Day.list.length === 0) && !isAnyForecastLoading &&
                      <motion.p layout className="text-xs text-muted-foreground/70 dark:text-white/50 flex items-center gap-1.5 pl-1 py-1 flex-grow h-full justify-center"><Clock3 className="w-3.5 h-3.5" />Hourly data unavailable.</motion.p> {/* Added h-full justify-center */}
                      }
                      
                      {/* Daily Summary Block (moved inside the Hourly+Daily responsive group) */}
                       {config.showDailySummary && dailyAggregatedForecast.length > 0 && (
                        <div className="flex-grow h-full flex flex-col"> {/* Added h-full flex flex-col */}
                        <h4 className="text-xs font-semibold text-foreground/70 dark:text-white/60 mt-1 mb-1.5 ml-0.5 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />Next Days</h4>
                        <div className="flex gap-1.5 items-stretch flex-grow"> {/* Added flex-grow */}
                          {dailyAggregatedForecast.map((day, index) => (
                          <motion.div
                            key={day.dt}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 + index * 0.08, type: "spring", stiffness: 200, damping: 12 }}
                            className="flex-1 flex flex-col items-center justify-between p-1.5 rounded-lg bg-background/40 hover:bg-background/70 dark:bg-black/20 dark:hover:bg-black/40 shadow-sm text-center space-y-0.5 transition-colors h-full"> {/* Added justify-between and h-full */}
                            <p className="text-[10px] font-semibold text-muted-foreground dark:text-white/50">{day.dayName}</p>
                            <DynamicWeatherIcon iconCode={day.icon} className="w-6 h-6 my-0" animate={false} />
                            <div className="text-xs font-medium"><AnimatedValue value={day.temp_max.toFixed(0)} /><span className="opacity-70">/<AnimatedValue value={day.temp_min.toFixed(0)} />°</span></div>
                            {day.pop > 0.15 && <Badge variant="outline" className="text-[9px] scale-90 px-1 py-0 font-normal bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"><Droplets className="w-2 h-2 mr-0.5" />{(day.pop * 100).toFixed(0)}%</Badge>}
                          </motion.div>
                          ))}
                        </div>
                        </div>
                      )}
                      {config.showDailySummary && dailyAggregatedForecast.length === 0 && !isAnyForecastLoading &&
                        <motion.p layout className="text-xs text-muted-foreground/70 dark:text-white/50 flex items-center gap-1.5 pl-1 py-1 flex-grow mt-1 h-full justify-center"><CalendarDays className="w-3.5 h-3.5" />Daily summary unavailable.</motion.p> {/* Added h-full justify-center */}
                      }
                    </div>


                    {/* AQI Block */}
                    {config.showAirPollution && airPollutionData && currentAQI && (
                      <motion.div
                      initial={{ opacity: 0, x: 20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 120, damping: 20 }}
                      className="w-full sm:w-auto sm:max-w-sm sm:flex-shrink-0 h-full p-4 rounded-lg bg-background/50 dark:bg-black/30 backdrop-blur-sm hover:bg-background/70 dark:hover:bg-black/50 shadow-xl transition-colors"
                      >
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                        <TooltipTrigger className="w-full h-full flex flex-col items-center">
                          <div className="flex flex-col items-center text-center mb-1">
                          <h4 className="text-base font-semibold text-foreground/80 dark:text-white/75 mb-1.5 flex items-center gap-2">
                            <AirVent className="w-5 h-5 opacity-90" />
                            Air Quality
                          </h4>
                          <p className={cn("text-5xl font-bold tracking-tight", currentAqiInfo.colorClass)}>
                            {currentAQI}
                          </p>
                          <p className={cn("text-sm font-semibold -mt-1", currentAqiInfo.colorClass)}>
                            {currentAqiInfo.text}
                          </p>
                          </div>

                          <hr className="my-4 w-full border-foreground/10 dark:border-white/10" />

                          <div className="w-full px-1 flex-grow flex flex-col"> {/* Added flex-grow flex flex-col */}
                          <div className="flex justify-between items-baseline mb-2 px-1">
                            <h5 className="text-xs font-semibold uppercase tracking-wide text-foreground/70 dark:text-white/60">Pollutant Levels</h5>
                            <span className="text-[11px] font-medium text-foreground/60 dark:text-white/50 ml-2">µg/m³</span>
                          </div>
                          <div className="space-y-1 w-full flex-grow"> {/* Added flex-grow */}
                            {airPollutionData.list[0].components && Object.entries(airPollutionData.list[0].components).map(([key, value], index) => (
                            <motion.div
                              key={key}
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ delay: 0.7 + index * 0.06, type: "spring", stiffness: 180, damping: 15 }}
                              className="flex justify-between items-center px-2.5 py-1.5 rounded-lg hover:bg-foreground/10 dark:hover:bg-white/10 transition-colors text-sm"
                            >
                              <span className="text-foreground/80 dark:text-white/80">
                              {getPollutantDisplayName(key)}
                              </span>
                              <span className="font-semibold tabular-nums text-foreground dark:text-white">
                              {Number(value).toFixed(1)}
                              </span>
                            </motion.div>
                            ))}
                          </div>
                          </div>
                        </TooltipTrigger>

                        <TooltipContent side="top" className="z-50 bg-popover/90 dark:bg-neutral-800/90 backdrop-blur-md shadow-xl rounded-lg p-4 max-w-sm">
                          <p className="font-semibold text-popover-foreground dark:text-white text-base mb-2">Detailed Air Pollutants</p>
                          <p className="text-sm text-popover-foreground/70 dark:text-white/60 mb-3 -mt-1">
                          Concentrations in µg/m³ (micrograms per cubic meter).
                          CO is also reported in µg/m³ by OWM for this endpoint.
                          </p>
                          <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-sm">
                          {airPollutionData.list[0].components && Object.entries(airPollutionData.list[0].components).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-baseline space-x-2">
                            <span className="text-popover-foreground/70 dark:text-white/60 font-normal uppercase text-[10px] whitespace-nowrap">
                              {getPollutantDisplayName(key)}:
                            </span>
                            <AnimatedValue
                              value={Number(value).toFixed(1)}
                              className="font-semibold tabular-nums text-popover-foreground dark:text-white"
                              animate={true}
                            />
                            </div>
                          ))}
                          </div>
                        </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      </motion.div>
                    )}
                    {config.showAirPollution && (!airPollutionData || !currentAQI) && !isAnyForecastLoading && !config.showHourlyForecast && 
                      <motion.p layout className="hidden sm:flex text-xs text-muted-foreground/70 dark:text-white/50 items-center gap-1.5 pl-1 py-1 flex-grow h-full justify-center"><AirVent className="w-3.5 h-3.5" />AQI data unavailable.</motion.p> {/* Added h-full justify-center */}
                    }
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {opcUaItemsToDisplay.length === 0 && !config.showForecast && (
            <motion.div
              key="inactive-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 dark:bg-card/85 backdrop-blur-lg z-20 p-6 text-center rounded-2xl" /* Ensure consistent rounding */
            >
              <CloudCog className="w-16 h-16 text-primary/30 mb-3 opacity-60" />
              <p className="font-semibold text-xl text-foreground/80">Weather Center Inactive</p>
              {isEditMode ?
                <p className="text-sm text-muted-foreground mt-1.5">No sensors linked and forecast API is off. Click <Edit3 className="inline w-4 h-4 text-primary align-text-bottom mx-0.5" /> to configure.</p> :
                <p className="text-sm text-muted-foreground mt-1.5">Not configured. Please contact an administrator.</p>
              }
            </motion.div>)}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

// --- Animation Props ---
const contentFadeProps = { initial: { opacity: 0, y: 5 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -5 }, transition: { duration: 0.25, ease: "easeInOut" } };

// --- Config Storage ---
export const loadWeatherCardConfigFromStorage = (): WeatherCardConfig => {
  if (typeof window === 'undefined') return JSON.parse(JSON.stringify(defaultConfig));
  const storedConfig = localStorage.getItem(WEATHER_CARD_CONFIG_KEY);
  if (storedConfig) {
    try {
      const parsed = JSON.parse(storedConfig) as Partial<WeatherCardConfig>;
      const mergedConfig = JSON.parse(JSON.stringify(defaultConfig));
      if (parsed.forecastApiKey !== undefined) mergedConfig.forecastApiKey = parsed.forecastApiKey;
      mergedConfig.forecastCityName = parsed.forecastCityName || defaultConfig.forecastCityName;
      if (parsed.showForecast !== undefined) mergedConfig.showForecast = parsed.showForecast;
      if (parsed.showHourlyForecast !== undefined) mergedConfig.showHourlyForecast = parsed.showHourlyForecast;
      if (parsed.showDailySummary !== undefined) mergedConfig.showDailySummary = parsed.showDailySummary;
      if (parsed.showAirPollution !== undefined) mergedConfig.showAirPollution = parsed.showAirPollution;
      mergedConfig.numOpcSensorsToShow = parsed.numOpcSensorsToShow || defaultConfig.numOpcSensorsToShow;
      mergedConfig.numHourlyForecastsToShow = parsed.numHourlyForecastsToShow || defaultConfig.numHourlyForecastsToShow;
      mergedConfig.numDailyForecastsToShow = parsed.numDailyForecastsToShow || defaultConfig.numDailyForecastsToShow;
      if (parsed.opcUaItems && Array.isArray(parsed.opcUaItems)) {
        mergedConfig.opcUaItems = defaultConfig.opcUaItems.map(dfI => {
          const stI = parsed.opcUaItems?.find(si => si.definitionId === dfI.definitionId);
          const definition = STANDARD_WEATHER_ITEM_DEFINITIONS.find(d => d.id === dfI.definitionId);
          if (stI) {
            return {
              ...dfI,
              ...stI,
              label: stI.label || dfI.label,
              unit: stI.unit || definition?.defaultUnit || dfI.unit,
              iconName: stI.iconName || (dfI.definitionId === 'custom1' ? 'Package' : undefined)
            };
          }
          return dfI;
        });
      }
      return mergedConfig;
    } catch (e) { console.error(`WeatherCard (${WEATHER_CARD_CONFIG_KEY}): Parse error. Defaulting.`, e); }
  }
  return JSON.parse(JSON.stringify(defaultConfig));
};

export default WeatherCard;