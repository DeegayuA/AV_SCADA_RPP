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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchableSelect, ComboboxOption } from '@/app/circuit/sld/ui/SearchableSelect';
import DataLinkLiveValuePreview from '@/app/circuit/sld/ui/DataLinkLiveValuePreview';


import {
  Settings, Thermometer, Droplets, Sun, Wind, MapPin, Edit3, Save, XCircle, CloudSun, CloudRain, Cloud, Moon,
  CloudSnow, CloudLightning, CloudDrizzle, CloudFog, CloudMoon, Eye, Zap, Waves, Leaf, AlertTriangle, HelpCircle, SunMedium, CloudCog,
  ChevronDown, Smile, Snowflake, Sunrise, Sunset, LucideIcon, Package, ThermometerSun, ThermometerSnowflake, CalendarDays, Gauge, ArrowDownUp,
  Loader2, Compass, Search, Clock3, Users, BarChart3, AirVent, Cloudy, CloudHail, Tornado, Briefcase
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { motion, AnimatePresence, Transition, TargetAndTransition, MotionProps } from 'framer-motion';
import { useAppStore } from '@/stores/appStore';
import { DataPoint } from '@/config/dataPoints';
import { NodeData } from '@/app/DashboardData/dashboardInterfaces';
import { cn } from '@/lib/utils';
import { PLANT_NAME, PLANT_LOCATION, WEATHER_CARD_CONFIG_KEY } from '@/config/constants';

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
interface OWMAirPollutionListItem { dt: number; main: { aqi: 1 | 2 | 3 | 4 | 5 }; components: OWMAirPollutionComponents; } 
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
  const name = key.replace('_', '.').toLowerCase();
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


// --- Weather Animation Components ---

// Base Particle for Rain/Snow
const Particle: React.FC<{char?: string, className?: string, initialY?: number, duration?: number, delay?: number, sizeClass?: string, xOffset?: string, sway?: boolean }> = React.memo(
  ({ char = "❄️", className = "text-white/70", initialY = -20, duration = 5, delay = 0, sizeClass="text-lg", xOffset = "0px", sway = false }) => {
    
    const animateProps: TargetAndTransition = {
        y: "105%", // Animate slightly past the bottom edge
        opacity: [0, 0.8, 0.8, 0],
    };
    
    const transitionProps: Transition = {
        y: {
            duration,
            delay,
            repeat: Infinity,
            ease: 'linear',
        },
        opacity: {
            duration,
            delay,
            repeat: Infinity,
            ease: 'linear',
            times: [0, 0.1, 0.9, 1]
        }
    };

    if (sway) {
        animateProps.x = [xOffset, `calc(${xOffset} + 10px)`, `calc(${xOffset} - 10px)`, xOffset];
        transitionProps.x = {
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
        };
    }

    return (
        <motion.div
            className={cn("absolute", sizeClass, className)}
            style={{ x: xOffset, y: initialY }}
            initial={{ opacity: 0, y: initialY }}
            animate={animateProps}
            transition={transitionProps}
        >
            {char}
        </motion.div>
    );
});
Particle.displayName = 'Particle';

const RainDrop: React.FC<{delay?: number}> = ({delay}) => (
    <motion.div
        className="absolute h-10 w-0.5 bg-blue-300/60 rounded-full"
        style={{ left: `${Math.random() * 100}%`}}
        initial={{ y: '-20%', opacity: 0}}
        animate={{ y: '120%', opacity: [0, 0.7, 0]}}
        transition={{
            duration: Math.random() * 0.8 + 0.5, // Faster
            delay: delay,
            repeat: Infinity,
            ease: 'linear'
        }}
    />
);

const RainAnimation: React.FC = React.memo(() => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Base gradient for rainy mood */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-600/70 via-slate-700/80 to-slate-800/90" />
            {Array.from({ length: 70 }).map((_, i) => ( // More raindrops
                <RainDrop key={i} delay={Math.random() * 2} />
            ))}
        </div>
    );
});
RainAnimation.displayName = 'RainAnimation';

const SnowAnimation: React.FC = React.memo(() => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
             {/* Base gradient for snowy mood */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-400/70 via-sky-500/80 to-sky-600/90 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900" />
            {Array.from({ length: 40 }).map((_, i) => ( // Fewer but more distinct snowflakes
                <Particle
                    key={i}
                    char="❄️"
                    className={Math.random() > 0.5 ? "opacity-70" : "opacity-90"}
                    sizeClass={Math.random() > 0.3 ? "text-xl" : "text-2xl"} // Vary sizes
                    initialY={-30}
                    duration={Math.random() * 8 + 6} // Slower fall: 6 to 14 seconds
                    delay={Math.random() * 10} // Staggered start times
                    xOffset={`${Math.random() * 100}%`}
                    sway={true} // Add swaying motion
                />
            ))}
        </div>
    );
});
SnowAnimation.displayName = 'SnowAnimation';

const SunnyDayAnimation: React.FC = React.memo(() => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
            className="absolute inset-0 bg-gradient-to-br from-sky-400 via-cyan-400 to-blue-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
        />
        {/* Subtle Sun Rays Example */}
        {[...Array(3)].map((_, i) => (
            <motion.div
                key={i}
                className="absolute bg-yellow-200/20"
                style={{
                    top: '-50%',
                    left: `${20 + i * 20}%`, // Position rays
                    width: '10%',
                    height: '200%',
                    transformOrigin: 'top center',
                }}
                initial={{ rotate: -20 + i * 10, opacity: 0, scaleY: 0.8 }}
                animate={{ rotate: -15 + i * 10, opacity: 1, scaleY: 1 }}
                transition={{ duration: 2, delay: i * 0.3, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
            />
        ))}
         <motion.div // Pulsating Sun Glow
            className="absolute rounded-full"
            style={{
                top: '-20%', 
                left: '50%',
                translateX: '-50%',
                width: '100%', 
                paddingBottom: '100%', 
                background: 'radial-gradient(circle, rgba(255,223,100,0.3) 0%, rgba(255,223,100,0) 60%)',
            }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
    </div>
));
SunnyDayAnimation.displayName = 'SunnyDayAnimation';

const CloudyAnimation: React.FC = React.memo(() => {
    const cloudBase = "absolute rounded-full bg-slate-300/40 dark:bg-slate-500/30";
    const cloudDurations = [30, 45, 60]; // seconds

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Base gradient for cloudy mood */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-400/50 via-slate-400/60 to-slate-500/70 dark:from-slate-600/70 dark:via-slate-700/80 dark:to-slate-800/90" />
            {[...Array(3)].map((_, i) => (
                 <motion.div key={`cloud-group-${i}`}
                    initial={{ x: `${-50 - i * 10}%`, y: `${10 + i * 15}%` }}
                    animate={{ x: '150%'}}
                    transition={{ duration: cloudDurations[i % cloudDurations.length] + Math.random()*10, repeat: Infinity, ease: 'linear', delay: i * 5}}
                 >
                    <div className={cn(cloudBase, "w-32 h-32 -top-8 -left-8")} />
                    <div className={cn(cloudBase, "w-40 h-40")} />
                    <div className={cn(cloudBase, "w-24 h-24 -top-4 left-16")} />
                 </motion.div>
            ))}
        </div>
    );
});
CloudyAnimation.displayName = 'CloudyAnimation';

const StarryNightAnimation: React.FC = React.memo(() => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
             {/* Base gradient for night mood */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 via-slate-900 to-black" />
            {Array.from({ length: 60 }).map((_, i) => ( // More stars
                <motion.div
                    key={i}
                    className="absolute bg-white rounded-full"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        width: Math.random() > 0.7 ? '3px' : '2px', // Vary star sizes
                        height: Math.random() > 0.7 ? '3px' : '2px',
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, Math.random() * 0.5 + 0.3, 0] }} // Twinkle effect
                    transition={{
                        duration: Math.random() * 3 + 2, // 2 to 5 seconds
                        repeat: Infinity,
                        delay: Math.random() * 5, // Stagger appearance
                    }}
                />
            ))}
        </div>
    );
});
StarryNightAnimation.displayName = 'StarryNightAnimation';

const ThunderstormAnimation: React.FC = React.memo(() => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <RainAnimation /> {/* Layer rain */}
        {/* Lightning Flash */}
        <motion.div
            className="absolute inset-0 bg-yellow-200 dark:bg-purple-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0, 0.3, 0] }}
            transition={{
                duration: 0.7,
                repeat: Infinity,
                repeatDelay: Math.random() * 5 + 4, // Flash every 4-9 seconds
                times: [0, 0.05, 0.1, 0.13, 0.25], // Quick flash timing
                ease: "circOut",
            }}
        />
    </div>
));
ThunderstormAnimation.displayName = 'ThunderstormAnimation';

const FogAnimation: React.FC = React.memo(() => (
     <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
            className="absolute inset-0 bg-gradient-to-b from-slate-400/80 via-gray-400/70 to-slate-500/80 dark:from-slate-600/80 dark:via-gray-700/70 dark:to-slate-700/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
        >
          {/* Subtle moving noise or texture can be added here if desired */}
        </motion.div>
     </div>
));
FogAnimation.displayName = 'FogAnimation';


const DefaultGradientBackground: React.FC<{ gradientClass: string }> = React.memo(({ gradientClass }) => (
    <motion.div
        className={cn("absolute inset-0", gradientClass)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
    />
));
DefaultGradientBackground.displayName = 'DefaultGradientBackground';


interface DynamicWeatherBackgroundProps {
  weatherIconCode?: string;
  isDay?: boolean;
  fallbackGradientClass?: string;
}

const DynamicWeatherBackground: React.FC<DynamicWeatherBackgroundProps> = ({ weatherIconCode, isDay = true, fallbackGradientClass = "bg-slate-700" }) => {
  const animationData = useMemo(() => {
    if (!weatherIconCode) {
      return { key: 'fallback', Component: <DefaultGradientBackground gradientClass={fallbackGradientClass} /> };
    }

    const code = weatherIconCode.slice(0, 2); // e.g., "01" from "01d"

    switch (code) {
      case '01': // Clear
        return isDay 
          ? { key: 'sunny', Component: <SunnyDayAnimation /> } 
          : { key: 'night-clear', Component: <StarryNightAnimation /> };
      case '02': // Few clouds
      case '03': // Scattered clouds
      case '04': // Broken clouds / Overcast
        return { key: 'cloudy', Component: <CloudyAnimation /> };
      case '09': // Shower rain
      case '10': // Rain
        return { key: 'rain', Component: <RainAnimation /> };
      case '11': // Thunderstorm
        return { key: 'thunderstorm', Component: <ThunderstormAnimation /> };
      case '13': // Snow
        return { key: 'snow', Component: <SnowAnimation /> };
      case '50': // Mist / Fog
        return { key: 'fog', Component: <FogAnimation /> };
      default:
        return { key: 'fallback', Component: <DefaultGradientBackground gradientClass={fallbackGradientClass} /> };
    }
  }, [weatherIconCode, isDay, fallbackGradientClass]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={animationData.key}
        className="absolute inset-0 z-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
      >
        {animationData.Component}
      </motion.div>
    </AnimatePresence>
  );
};
DynamicWeatherBackground.displayName = 'DynamicWeatherBackground';


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
  enabled?: boolean;
}
interface WeatherCardProps { initialConfig: WeatherCardConfig; opcUaData: NodeData; allPossibleDataPoints: DataPoint[]; onConfigChange: (newConfig: WeatherCardConfig) => void; }
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
export const defaultConfig: WeatherCardConfig = {
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

  const dataPointOptions = useMemo((): ComboboxOption[] => {
    return allPossibleDataPoints.map(dp => ({
        value: dp.nodeId,
        label: dp.name,
        description: `ID: ${dp.nodeId}`
    }));
  }, [allPossibleDataPoints]);

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

  const handleDialogSave = () => { setIsConfigDialogOpen(false); const newConfig = JSON.parse(JSON.stringify(localConfig)); setConfig(newConfig); onConfigChange(newConfig); };
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

  // This gradient is now a FALLBACK if a specific animation isn't chosen
  // or can be used by the DynamicWeatherBackground component.
  const currentForecastBgGradientClass = useMemo(() => {
    if (!currentWeatherDetails) return "bg-gradient-to-br from-slate-700 to-slate-900"; // Default fallback
    const icon = currentWeatherDetails.weather[0]?.icon;
    const isDay = isCurrentDay;
    if (!isDay) return "bg-gradient-to-br from-indigo-800 via-slate-800 to-black";
    if (icon?.startsWith("01")) return "bg-gradient-to-br from-sky-500 via-cyan-500 to-blue-600";
    if (icon?.startsWith("02") || icon?.startsWith("03")) return "bg-gradient-to-br from-sky-400 via-slate-500 to-slate-600";
    if (icon?.startsWith("04")) return "bg-gradient-to-br from-slate-500 to-slate-700";
    if (icon?.startsWith("09") || icon?.startsWith("10")) return "bg-gradient-to-br from-blue-600 via-slate-700 to-slate-800";
    if (icon?.startsWith("11")) return "bg-gradient-to-br from-yellow-600 via-orange-700 to-slate-800";
    if (icon?.startsWith("13")) return "bg-gradient-to-br from-blue-400 via-sky-500 to-sky-600";
    if (icon?.startsWith("50")) return "bg-gradient-to-br from-slate-400 via-gray-500 to-slate-600";
    return "bg-gradient-to-br from-sky-500 to-blue-700";
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
      <Card className="relative shadow-2xl bg-card/70 dark:bg-card/60 backdrop-blur-xl border-border/30 overflow-hidden w-full rounded-2xl min-h-[140px]"> {/* Adjusted base bg opacity, backdrop blur */}
        
        <DynamicWeatherBackground 
            weatherIconCode={currentWeatherIcon} 
            isDay={isCurrentDay}
            fallbackGradientClass={currentForecastBgGradientClass}
        />

        {isEditMode && (
          <Dialog open={isConfigDialogOpen} onOpenChange={handleDialogOnOpenChange}>
            <DialogTrigger asChild><motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.9 }} className="absolute top-2.5 right-2.5 z-50"><Button variant="ghost" size="icon" className="h-9 w-9 bg-black/20 hover:bg-black/40 text-white/80 hover:text-white rounded-full shadow-lg" onClick={handleEditClick} title="Configure"><Settings className="w-5 h-5" /></Button></motion.div></DialogTrigger>
            <DialogContent className="max-w-xl w-[95vw] sm:w-full">
              <DialogHeader><DialogTitle className="text-2xl font-semibold flex items-center gap-2.5 text-primary"><CloudCog className="w-7 h-7" /> Weather Settings</DialogTitle><DialogDescription className="text-sm">Configure local sensors, external forecast, and display preferences.</DialogDescription></DialogHeader>
              <ScrollArea className="max-h-[65vh] p-0 pr-4 -mr-4 mt-3 mb-5">
                <div className="space-y-6 py-2 px-1">
                  {STANDARD_WEATHER_ITEM_DEFINITIONS.map((itemDef, defIndex) => {
                    let currentItemConfig = localConfig.opcUaItems.find(ci => ci.definitionId === itemDef.id) || { definitionId: itemDef.id, iconName: itemDef.id === 'custom1' ? 'Package' : undefined, opcUaNodeId: undefined, label: itemDef.defaultLabel, unit: itemDef.defaultUnit };
                    const selectedDataPoint = allPossibleDataPoints.find(dp => dp.nodeId === currentItemConfig.opcUaNodeId);
                    const filteredDataPoints = allPossibleDataPoints.filter(dp => (dp.category === 'weather' || !dp.category || ['Float', 'Double', 'Boolean'].includes(dp.dataType || '') || (dp.dataType || '').includes('Int')));
                    return (<motion.div key={itemDef.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 * defIndex }} className="p-4 border rounded-lg bg-muted/30 dark:bg-muted/20 space-y-3 shadow-sm"><h4 className="font-semibold text-md text-foreground flex items-center gap-2 border-b pb-1.5 mb-2.5"><itemDef.defaultIcon className={cn("w-4 h-4", itemDef.iconColorClass)} />{itemDef.id === 'custom1' ? (currentItemConfig.label || itemDef.defaultLabel) : itemDef.defaultLabel}{itemDef.id !== 'custom1' ? <Badge variant="outline" className="ml-auto text-xs px-1.5 py-0.5">Std</Badge> : <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0.5">Custom</Badge>}</h4>{itemDef.id === 'custom1' && (<AnimatePresence><motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2.5 overflow-hidden"><div className="space-y-1"><Label htmlFor={`cl-${itemDef.id}`} className="text-xs">Label</Label><Input id={`cl-${itemDef.id}`} value={currentItemConfig.label || ''} onChange={(e) => setLocalConfig(p => ({ ...p, opcUaItems: p.opcUaItems.map(c => c.definitionId === itemDef.id ? { ...c, label: e.target.value } : c) }))} className="h-8 text-xs" /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor={`cu-${itemDef.id}`} className="text-xs">Unit</Label><Input id={`cu-${itemDef.id}`} value={currentItemConfig.unit || ''} onChange={(e) => setLocalConfig(p => ({ ...p, opcUaItems: p.opcUaItems.map(c => c.definitionId === itemDef.id ? { ...c, unit: e.target.value } : c) }))} className="h-8 text-xs" /></div><div className="space-y-1"><Label htmlFor={`ci-${itemDef.id}`} className="text-xs">Icon</Label><Select value={currentItemConfig.iconName || 'Package'} onValueChange={(val) => setLocalConfig(p => ({ ...p, opcUaItems: p.opcUaItems.map(c => c.definitionId === itemDef.id ? { ...c, iconName: val as any } : c) }))}><SelectTrigger id={`ci-${itemDef.id}`} className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(AVAILABLE_CUSTOM_ICONS).map(([n, Ic]) => (<SelectItem key={n} value={n} className="text-xs"><div className="flex items-center gap-2"><Ic className="w-3.5 h-3.5" />{n}</div></SelectItem>))}</SelectContent></Select></div></div></motion.div></AnimatePresence>)}<div className="space-y-1"><Label htmlFor={`st-${itemDef.id}`} className="text-xs">OPC UA Source</Label>
                    <SearchableSelect
                        options={dataPointOptions}
                        value={currentItemConfig.opcUaNodeId}
                        onChange={(value) => setLocalConfig(p => ({ ...p, opcUaItems: p.opcUaItems.map(c => c.definitionId === itemDef.id ? { ...c, opcUaNodeId: value === SELECT_NONE_VALUE ? undefined : value } : c) }))}
                        placeholder="Select source..."
                        searchPlaceholder="Search name/ID..."
                        notFoundText="No results."
                        className="h-8 text-xs"
                    />
                    </div>{selectedDataPoint && (
                        <motion.div initial={{ opacity: 0, y: -5, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto', marginTop: '0.5rem' }} className="p-2 border border-dashed rounded-md bg-background/50 text-[11px] space-y-0.5">
                            <DataLinkLiveValuePreview dataPointId={selectedDataPoint.nodeId} format={{type: 'string'}} valueMapping={undefined} />
                        </motion.div>
                    )}</motion.div>);
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

        {/* Main Card Content Wrapper - Ensure it's on top of the dynamic background */}
        <div className="relative z-10 flex flex-col md:flex-row items-stretch h-full transition-all duration-500 bg-transparent md:rounded-lg">
          {/* Left Section: Current Weather Dominant Display */}
          <motion.div
            layout="position"
            className="relative flex flex-col justify-between p-4 text-white overflow-hidden w-auto md:flex-shrink-0 md:rounded-lg" 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
            <AnimatePresence mode="wait">
              {isLoadingCurrent || (isLoadingGeocoding && !currentWeatherDetails) ? (
                <motion.div key="loading-main" {...contentFadeProps} className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 z-10 backdrop-blur-sm rounded-l-lg"><Loader2 className="w-8 h-8 animate-spin" /><p className="mt-2 text-xs opacity-80">{isLoadingGeocoding ? "Finding location..." : "Fetching weather..."}</p></motion.div>
              ) : errorCurrent || (errorGeocoding && !currentWeatherDetails && config.showForecast) ? (
                <motion.div key="error-main" {...contentFadeProps} className="flex flex-col items-center justify-center text-center p-2 h-full"><AlertTriangle className="w-10 h-10 text-red-300 mb-1.5" /><p className="font-semibold text-sm text-red-200">Data Error</p><p className="text-xs text-red-200/80 break-words max-w-[90%]">{errorGeocoding || errorCurrent}</p></motion.div>
              ) : currentWeatherDetails && currentMain && currentSys && currentWind ? (
                <motion.div key="current-data" {...contentFadeProps} className="flex flex-col justify-between h-full">
                  <div className="weather-text-wrapper flex flex-col items-start justify-between gap-3 sm:gap-4">
                    <div className="flex flex-row items-start gap-2 sm:gap-3">
                      <DynamicWeatherIcon iconCode={currentWeatherIcon} className="w-16 h-16 sm:w-20 md:w-24 drop-shadow-2xl" isDay={isCurrentDay} />
                      <div className="mt-1">
                        <AnimatedValue value={currentMain.temp.toFixed(0)} className="text-5xl sm:text-6xl font-bold tracking-tighter text-shadow" unit="°C" unitClassName="text-2xl opacity-80 ml-1 text-shadow" />
                        <p className="text-sm capitalize text-white/80 -mt-1 truncate max-w-[150px] sm:max-w-[200px] text-shadow-sm" title={currentWeatherDetails.weather[0]?.description}>{currentWeatherDetails.weather[0]?.description}</p>
                      </div>
                    </div>
                    <div className="my-2 sm:my-2.5">
                      <h1 className="text-xl sm:text-2xl font-semibold text-white truncate max-w-full text-shadow-sm" title={currentWeatherDetails.name + (currentSys.country ? `, ${currentSys.country}` : '')}>
                        {currentWeatherDetails.name}{currentSys.country ? `, ${currentSys.country}` : ''}
                      </h1>
                    </div>
                  </div>
                    <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm text-white/90 text-shadow-sm font-semibold"> 
                    <span className="flex items-center gap-1.5"><ThermometerSun className="w-3.5 h-3.5 opacity-80" />Feels: <AnimatedValue value={currentMain.feels_like.toFixed(0)} unit="°C" /></span>
                    <span className="flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 opacity-80" />Hum: <AnimatedValue value={currentMain.humidity} unit="%" /></span>
                    <span className="flex items-center gap-1.5"><Wind className="w-3.5 h-3.5 opacity-80" />Wind: <AnimatedValue value={currentWind.speed.toFixed(1)} unit="m/s" /> {degreesToCardinalSimple(currentWind.deg)}</span>
                    <span className="flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 opacity-80" />Pres: <AnimatedValue value={currentMain.pressure} unit="hPa" /></span>
                    <span className="flex items-center gap-1.5"><Sunrise className="w-3.5 h-3.5 opacity-80" />Rise: {formatTime(currentSys.sunrise, currentWeatherDetails.timezone)}</span>
                    <span className="flex items-center gap-1.5"><Sunset className="w-3.5 h-3.5 opacity-80" />Set: {formatTime(currentSys.sunset, currentWeatherDetails.timezone)}</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="no-data-main" {...contentFadeProps} className="flex flex-col items-center justify-center h-full text-shadow-sm">
                  <CloudCog className="w-12 h-12 text-sky-200/50 mb-2" />
                  <p className="text-sm text-sky-100/70">{!config.showForecast ? "Forecast API disabled" : "Weather data loading..."}</p>
                  {!config.showForecast && !isEditMode && <p className="text-xs text-sky-100/50">Contact admin to enable.</p>}
                  {!config.showForecast && isEditMode && <p className="text-xs text-sky-100/60">Enable in settings <Settings className="inline w-3 h-3 align-text-bottom" />.</p>}
                </motion.div>
              )}
              {opcUaItemsToDisplay.length > 0 && (
                <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="pt-3"> 
                  <h4 className="text-xs font-bold text-white/80 dark:text-foreground/80 pb-1.5 flex items-center gap-1.5 text-shadow-sm"><Gauge className="w-3.5 h-3.5" />Local Sensors</h4>
                  <div className="w-full pb-1.5">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 w-full">
                      {opcUaItemsToDisplay.slice(0, config.numOpcSensorsToShow || 3).map((item, index) => (
                      <TooltipProvider key={item.id} delayDuration={100}>
                        <Tooltip>
                        <TooltipTrigger asChild>
                          <motion.div
                          initial={{ opacity: 0, scale: 0.8, x: -10 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ delay: 0.35 + index * 0.1, type: "spring", stiffness: 250, damping: 15 }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 dark:bg-black/20 dark:hover:bg-black/40 shadow-md cursor-default transition-colors text-shadow-sm">
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
                        <Badge variant="outline" className="text-[10px] py-0.5 px-0.5 bg-white/10 border-white/20 text-white/80 text-shadow-sm">+ {opcUaItemsToDisplay.length - (config.numOpcSensorsToShow || 3)} more</Badge>
                      </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <div className="hidden md:block w-px bg-white/20 dark:bg-white/10 my-4 opacity-50"></div> {/* Slightly more subtle separator */}
          <div className="md:hidden h-px bg-white/20 dark:bg-white/10 mx-4 my-1 opacity-50"></div>

          {/* Right Section: Compact Summaries - Using bg-white/20 for slight contrast on dark animations, and bg-black/10 for light animations */}
          <div className={cn("flex-grow p-3 sm:p-4 space-y-3 overflow-hidden md:rounded-r-lg",
             isCurrentDay && currentWeatherIcon?.startsWith("01") ? "bg-black/5 dark:bg-black/10" : "bg-white/10 dark:bg-black/20" 
           )}>
            <AnimatePresence mode="wait">
              {isAnyForecastLoading && !anyForecastError &&
                <motion.div key="loading-summaries" {...contentFadeProps} className="flex items-center justify-center text-xs text-foreground/70 dark:text-white/60 h-full py-10 text-shadow-sm">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Fetching summaries...
                </motion.div>
              }
              {anyForecastError && config.showForecast &&
                <motion.div key="error-summaries" {...contentFadeProps} className="flex flex-col items-center justify-center text-xs text-red-600 dark:text-red-400 h-full py-10 text-center text-shadow-sm">
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
                  className="space-y-3 md:space-y-4 h-full flex flex-col justify-around"
                >
                    <div className="flex flex-col sm:flex-row sm:items-stretch sm:justify-between gap-3 h-full">
                    <div className="flex flex-col gap-3 sm:flex-grow sm:min-w-0 h-full">
                      {config.showHourlyForecast && forecast3Hour5Day && forecast3Hour5Day.list.length > 0 && (
                      <motion.div className="flex-grow h-full flex flex-col" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                        <h4 className="text-xs font-semibold text-foreground/80 dark:text-white/70 mb-1.5 ml-0.5 flex items-center gap-1.5 text-shadow-sm"><Clock3 className="w-3.5 h-3.5" />Today (Hourly)</h4>
                        <div className="w-full pb-1.5 -mb-1.5 overflow-hidden flex-grow">
                        <div className={`grid gap-1.5 items-stretch h-full ${
                          config.numHourlyForecastsToShow <= 3 ? 'grid-cols-3' :
                          config.numHourlyForecastsToShow <= 4 ? 'grid-cols-4 sm:grid-cols-4' :
                          config.numHourlyForecastsToShow <= 5 ? 'grid-cols-5 sm:grid-cols-5' :
                          config.numHourlyForecastsToShow <= 6 ? 'grid-cols-3 min-[300px]:grid-cols-6 sm:grid-cols-6' : // Example more responsive tiering
                          config.numHourlyForecastsToShow <= 8 ? 'grid-cols-4 min-[300px]:grid-cols-4 sm:grid-cols-4' :
                          config.numHourlyForecastsToShow <= 10 ? 'grid-cols-5 min-[300px]:grid-cols-5 sm:grid-cols-5' :
                          'grid-cols-3 min-[300px]:grid-cols-6 sm:grid-cols-6'
                        }`}>
                          {forecast3Hour5Day.list.slice(0, config.numHourlyForecastsToShow || 5).map((item, index) => (
                          <motion.div
                            key={item.dt}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 + index * 0.08, type: "spring", stiffness: 200, damping: 12 }}
                            className="flex flex-col items-center justify-between p-1.5 rounded-lg bg-background/50 hover:bg-background/80 dark:bg-black/30 dark:hover:bg-black/50 shadow-md text-center space-y-0.5 transition-colors h-full text-shadow-sm">
                            <p className="text-[10px] font-medium text-muted-foreground dark:text-white/60">{getHour(item.dt, forecast3Hour5Day.city.timezone)}</p>
                            <DynamicWeatherIcon iconCode={item.weather[0].icon} isDay={item.sys.pod === 'd'} className="w-6 h-6 my-0" animate={false} />
                            <AnimatedValue value={item.main.temp.toFixed(0)} className="text-xs font-semibold text-foreground dark:text-white" unit="°" unitClassName="text-[9px]" />
                            {item.pop > 0.2 && <Badge variant="outline" className="text-[9px] scale-90 px-1 py-0 font-normal bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"><Droplets className="w-2 h-2 mr-0.5" />{(item.pop * 100).toFixed(0)}%</Badge>}
                          </motion.div>
                          ))}
                        </div>
                        </div>
                      </motion.div>
                      )}
                      {config.showHourlyForecast && (!forecast3Hour5Day || forecast3Hour5Day.list.length === 0) && !isAnyForecastLoading && (
                        <motion.p layout className="text-xs text-muted-foreground/70 dark:text-white/60 flex items-center gap-1.5 pl-1 py-1 flex-grow h-full justify-center text-shadow-sm"><Clock3 className="w-3.5 h-3.5" />Hourly data unavailable.</motion.p>
                      )}
                      
                      {config.showDailySummary && dailyAggregatedForecast.length > 0 && (
                        <div className="flex-grow h-full flex flex-col">
                        <h4 className="text-xs font-semibold text-foreground/80 dark:text-white/70 mt-1 mb-1.5 ml-0.5 flex items-center gap-1.5 text-shadow-sm"><CalendarDays className="w-3.5 h-3.5" />Next Days</h4>
                        <div className="flex gap-1.5 items-stretch">
                          {dailyAggregatedForecast.map((day, index) => (
                          <motion.div
                            key={day.dt}
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 + index * 0.08, type: "spring", stiffness: 200, damping: 12 }}
                            className="flex-1 flex flex-col items-center justify-between p-1.5 rounded-lg bg-background/50 hover:bg-background/80 dark:bg-black/30 dark:hover:bg-black/50 shadow-md text-center space-y-0.5 transition-colors h-full text-shadow-sm">
                            <p className="text-[10px] font-semibold text-muted-foreground dark:text-white/60">{day.dayName}</p>
                            <DynamicWeatherIcon iconCode={day.icon} className="w-6 h-6 my-0" animate={false} />
                            <div className="text-xs font-medium text-foreground dark:text-white">
                              <AnimatedValue value={day.temp_max.toFixed(0)} />
                              <span className="opacity-70">
                                /<AnimatedValue value={day.temp_min.toFixed(0)} />°
                              </span>
                            </div>
                            {day.pop > 0.15 && <Badge variant="outline" className="text-[9px] scale-90 px-1 py-0 font-normal bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"><Droplets className="w-2 h-2 mr-0.5" />{(day.pop * 100).toFixed(0)}%</Badge>}
                          </motion.div>
                          ))}
                        </div>
                        </div>
                       )}
                       {config.showDailySummary && dailyAggregatedForecast.length === 0 && !isAnyForecastLoading && !isAnyForecastLoading && (
                           <motion.p layout className="text-xs text-muted-foreground/70 dark:text-white/60 flex items-center gap-1.5 pl-1 py-1 flex-grow h-full justify-center text-shadow-sm"><CalendarDays className="w-3.5 h-3.5" />Daily data unavailable.</motion.p>
                       )}
                      
                    </div>

                    {/* AQI Block */}
                    {config.showAirPollution && airPollutionData && currentAQI && (
                      <motion.div
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 120, damping: 20 }}
                        className="w-full sm:w-auto sm:max-w-xs sm:flex-shrink-0 h-full p-4 rounded-xl bg-background/50 dark:bg-black/30 backdrop-blur-sm hover:bg-background/70 dark:hover:bg-black/50 shadow-xl transition-colors text-shadow-sm" // Ensure consistent rounded for AQI
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

                              <hr className="my-4 w-full border-foreground/10 dark:border-white/10 opacity-70" />

                              <div className="w-full px-1 flex-grow flex flex-col">
                                <div className="flex justify-between items-baseline mb-2 px-1">
                                  <h5 className="text-xs font-semibold uppercase tracking-wide text-foreground/70 dark:text-white/60">Pollutants</h5>
                                  <span className="text-[11px] font-medium text-foreground/60 dark:text-white/50 ml-2">µg/m³</span>
                                </div>
                                <div className="space-y-1 w-full flex-grow">
                                  {airPollutionData.list[0].components && Object.entries(airPollutionData.list[0].components).map(([key, value], index) => (
                                    <motion.div
                                      key={key}
                                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      transition={{ delay: 0.7 + index * 0.06, type: "spring", stiffness: 180, damping: 15 }}
                                      className="flex justify-between items-center px-2.5 py-1.5 rounded-lg hover:bg-foreground/5 dark:hover:bg-white/5 transition-colors text-sm"
                                    >
                                      <span className="text-foreground/80 dark:text-white/80 font-medium">
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
                     {config.showAirPollution && (!airPollutionData || !currentAQI) && !isAnyForecastLoading && !config.showHourlyForecast && (
                        <motion.p layout className="hidden sm:flex text-xs text-muted-foreground/70 dark:text-white/60 items-center gap-1.5 pl-1 py-1 flex-grow h-full justify-center text-shadow-sm"><AirVent className="w-3.5 h-3.5" />AQI data unavailable.</motion.p>
                      )}
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
                      <p className="text-[9px] text-white/50 absolute bottom-1.5 left-2 hidden lg:block hover:text-white/80 transition-colors text-shadow-sm">From OpenWeatherMap API</p>

        </div>

        <AnimatePresence>
          {opcUaItemsToDisplay.length === 0 && !config.showForecast && (
            <motion.div
              key="inactive-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 dark:bg-card/85 backdrop-blur-lg z-20 p-6 text-center rounded-2xl"
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
      <style>{`
        .text-shadow { text-shadow: 0 1px 3px rgba(0,0,0,0.2); }
        .text-shadow-sm { text-shadow: 0 1px 2px rgba(0,0,0,0.15); }
      `}</style>
    </motion.div>
  );
};

// --- Animation Props ---
const contentFadeProps: MotionProps = { initial: { opacity: 0, y: 5 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -5 }, transition: { duration: 0.25, ease: "easeInOut" } };


export default WeatherCard;