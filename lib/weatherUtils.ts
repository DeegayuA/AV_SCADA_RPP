import { Sun, CloudSun, Cloud, Cloudy, CloudDrizzle, CloudRain, CloudLightning, CloudSnow, CloudFog, Moon, CloudMoon } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export const degreesToCardinalSimple = (deg: number | undefined): string => {
  if (deg === undefined || deg === null || isNaN(deg)) return '';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(deg / 45) % 8];
};

export const getAqiString = (aqi: number | undefined): { text: string, colorClass: string, iconColor: string } => {
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

export const getPollutantDisplayName = (key: string) => {
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

export const DynamicWeatherIcon: React.FC<{ iconCode?: string; isDay?: boolean; className?: string; animate?: boolean }> = React.memo(({ iconCode, isDay = true, className = "w-12 h-12", animate = true }) => {
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
