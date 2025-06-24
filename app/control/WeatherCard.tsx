'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Thermometer, Droplets, Sun, Wind, MapPin, Edit3, Save, XCircle, CloudSun, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, Tornado, Umbrella, CloudFog, Cloud, Moon, CloudMoon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/appStore'; // For global edit mode
import { DataPoint } from '@/config/dataPoints'; // Assuming DataPoint interface is here
import { NodeData } from '@/app/DashboardData/dashboardInterfaces'; // For OPC UA data values

// Helper to get weather icon (simplified for now)
const getWeatherIcon = (iconCode?: string, isDay: boolean = true): React.ReactNode => {
  if (!iconCode) return <CloudSun className="w-8 h-8 text-yellow-400" />;
  switch (iconCode) {
    case '01d': return <Sun className="w-8 h-8 text-yellow-400" />;
    case '01n': return <Moon className="w-8 h-8 text-slate-400" />;
    case '02d': return <CloudSun className="w-8 h-8 text-yellow-400" />;
    case '02n': return <CloudMoon className="w-8 h-8 text-slate-400" />;
    case '03d': case '03n': return <Cloud className="w-8 h-8 text-sky-400" />;
    case '04d': case '04n': return <Cloud className="w-8 h-8 text-sky-600" />; // Broken clouds
    case '09d': case '09n': return <CloudDrizzle className="w-8 h-8 text-blue-400" />; // Shower rain
    case '10d': return <CloudRain className="w-8 h-8 text-blue-500" />; // Rain day
    case '10n': return <CloudRain className="w-8 h-8 text-blue-400" />; // Rain night
    case '11d': case '11n': return <CloudLightning className="w-8 h-8 text-yellow-500" />; // Thunderstorm
    case '13d': case '13n': return <CloudSnow className="w-8 h-8 text-blue-300" />; // Snow
    case '50d': case '50n': return <CloudFog className="w-8 h-8 text-slate-400" />; // Mist/Fog
    default: return <CloudSun className="w-8 h-8 text-yellow-400" />;
  }
};


interface WeatherItemConfig {
  id: string; // e.g., 'temperature', 'humidity'
  label: string;
  opcUaNodeId?: string;
  unit?: string;
  icon: React.ReactNode;
  dataPoint?: DataPoint; // Full DataPoint object if selected
}

export interface WeatherCardConfig {
  opcUaTemperatureNodeId?: string;
  opcUaHumidityNodeId?: string;
  opcUaSolarIrradianceNodeId?: string;
  opcUaWindSpeedNodeId?: string;
  opcUaWindDirectionNodeId?: string;
  forecastApiKey?: string;
  forecastLocation?: string; // e.g., "London,UK" or "lat,lon"
  showForecast: boolean;
}

interface WeatherCardProps {
  initialConfig: WeatherCardConfig;
  opcUaData: NodeData; // All OPC UA data from the dashboard
  allPossibleDataPoints: DataPoint[]; // For dropdowns
  onConfigChange: (newConfig: WeatherCardConfig) => void;
}

const WEATHER_CARD_CONFIG_KEY = `weatherCardConfig_${process.env.NEXT_PUBLIC_PLANT_NAME || 'defaultPlant'}`;

const WeatherCard: React.FC<WeatherCardProps> = ({
  initialConfig,
  opcUaData,
  allPossibleDataPoints,
  onConfigChange,
}) => {
  const [config, setConfig] = useState<WeatherCardConfig>(initialConfig);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [forecastData, setForecastData] = useState<any>(null); // Replace 'any' with a proper type
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [errorForecast, setErrorForecast] = useState<string | null>(null);

  const { isEditMode } = useAppStore();

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  // Fetch forecast data when config changes (API key, location) or card mounts
  useEffect(() => {
    const fetchForecast = async () => {
      if (!config.showForecast || !config.forecastApiKey || !config.forecastLocation) {
        setForecastData(null);
        return;
      }
      setIsLoadingForecast(true);
      setErrorForecast(null);
      try {
        // Example: OpenWeatherMap API
        // Note: Ensure compliance with API terms (e.g., no excessive calls)
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${config.forecastLocation}&appid=${config.forecastApiKey}&units=metric`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error: ${response.status}`);
        }
        const data = await response.json();
        setForecastData(data);
      } catch (err: any) {
        console.error('Failed to fetch forecast:', err);
        setErrorForecast(err.message || 'Failed to load forecast.');
        setForecastData(null);
      } finally {
        setIsLoadingForecast(false);
      }
    };

    fetchForecast();
    // Optionally, set up an interval to refetch forecast periodically
    const intervalId = setInterval(fetchForecast, 30 * 60 * 1000); // every 30 minutes
    return () => clearInterval(intervalId);
  }, [config.forecastApiKey, config.forecastLocation, config.showForecast]);

  const handleConfigSave = () => {
    onConfigChange(config);
    setIsConfiguring(false);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(WEATHER_CARD_CONFIG_KEY, JSON.stringify(config));
    }
  };

  const handleConfigCancel = () => {
    setConfig(initialConfig); // Reset to last saved config
    setIsConfiguring(false);
  };


  const weatherItems: WeatherItemConfig[] = [
    { id: 'temperature', label: 'Temperature', opcUaNodeId: config.opcUaTemperatureNodeId, unit: '°C', icon: <Thermometer className="w-5 h-5 text-red-500" /> },
    { id: 'humidity', label: 'Humidity', opcUaNodeId: config.opcUaHumidityNodeId, unit: '%', icon: <Droplets className="w-5 h-5 text-blue-500" /> },
    { id: 'solarIrradiance', label: 'Solar Irradiance', opcUaNodeId: config.opcUaSolarIrradianceNodeId, unit: 'W/m²', icon: <Sun className="w-5 h-5 text-yellow-500" /> },
    { id: 'windSpeed', label: 'Wind Speed', opcUaNodeId: config.opcUaWindSpeedNodeId, unit: 'm/s', icon: <Wind className="w-5 h-5 text-gray-500" /> },
    // Wind direction might need special handling for display (e.g., arrow icon)
    { id: 'windDirection', label: 'Wind Direction', opcUaNodeId: config.opcUaWindDirectionNodeId, unit: '°', icon: <MapPin className="w-5 h-5 text-green-500" /> },
  ].map(item => ({
    ...item,
    dataPoint: allPossibleDataPoints.find(dp => dp.nodeId === item.opcUaNodeId)
  }));

  const getOpcUaValue = (nodeId?: string, dataPoint?: DataPoint) => {
    if (!nodeId || !opcUaData || opcUaData[nodeId] === undefined) return 'N/A';
    let value = opcUaData[nodeId];
    // Apply factor if available
    if (dataPoint?.factor) {
      value = Number(value) * dataPoint.factor;
    }
    // Apply precision if available
    if (typeof value === 'number' && dataPoint?.precision !== undefined) {
      return value.toFixed(dataPoint.precision);
    }
    return String(value);
  };

  if (isConfiguring) {
    return (
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Configure Weather Card
            <div>
              <Button variant="ghost" size="icon" onClick={handleConfigSave} title="Save Configuration">
                <Save className="w-5 h-5 text-green-600" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleConfigCancel} title="Cancel Edits">
                <XCircle className="w-5 h-5 text-red-600" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 max-h-[60vh] overflow-y-auto">
          <h3 className="text-md font-semibold mb-2 border-b pb-1">OPC UA Data Points</h3>
          {weatherItems.map(item => (
            <div key={item.id} className="space-y-1">
              <Label htmlFor={`select-${item.id}`}>{item.label} (OPC UA)</Label>
              <Select
                value={config[`opcUa${item.label.replace(/\s+/g, '')}NodeId` as keyof WeatherCardConfig] || ''}
                onValueChange={(nodeId) =>
                  setConfig(prev => ({ ...prev, [`opcUa${item.label.replace(/\s+/g, '')}NodeId`]: nodeId || undefined }))
                }
              >
                <SelectTrigger id={`select-${item.id}`}>
                  <SelectValue placeholder={`Select ${item.label} source...`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {allPossibleDataPoints
                    .filter(dp => dp.category === 'weather' || !dp.category || dp.dataType === 'Float' || dp.dataType === 'Double' || dp.dataType.includes('Int')) // Basic filter
                    .map(dp => (
                    <SelectItem key={dp.id} value={dp.nodeId}>
                      {dp.name} ({dp.nodeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          <h3 className="text-md font-semibold mb-2 pt-3 border-b pb-1">Weather Forecast (OpenWeatherMap)</h3>
           <div className="flex items-center space-x-2">
            <Switch
              id="show-forecast-switch"
              checked={config.showForecast}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, showForecast: checked }))}
            />
            <Label htmlFor="show-forecast-switch">Show Weather Forecast</Label>
          </div>

          {config.showForecast && (
            <>
              <div className="space-y-1">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter OpenWeatherMap API Key"
                  value={config.forecastApiKey || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, forecastApiKey: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., London,UK or lat,lon"
                  value={config.forecastLocation || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, forecastLocation: e.target.value }))}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Filter out items that are not configured
  const configuredWeatherItems = weatherItems.filter(item => !!item.opcUaNodeId);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="relative"
    >
      <Card className="shadow-md bg-card/80 backdrop-blur-sm border-border/50">
        {isEditMode && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 z-10 h-7 w-7"
            onClick={() => setIsConfiguring(true)}
            title="Configure Weather Card"
          >
            <Edit3 className="w-4 h-4" />
          </Button>
        )}
        <CardContent className="p-2 sm:p-3 text-xs">
          <div className="flex flex-col space-y-2">
            {/* Real-time OPC UA Data Section */}
            {configuredWeatherItems.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1">
                {configuredWeatherItems.map(item => (
                  <motion.div
                    key={item.id}
                    className="flex items-center space-x-1.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 * weatherItems.indexOf(item) }}
                  >
                    {React.cloneElement(item.icon as React.ReactElement, { className: "w-4 h-4" })}
                    <div>
                      <span className="font-medium">{getOpcUaValue(item.opcUaNodeId, item.dataPoint)}</span>
                      <span className="text-muted-foreground">{item.dataPoint?.unit || item.unit}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
             {configuredWeatherItems.length === 0 && !config.showForecast && (
                <div className="text-center text-muted-foreground py-4">
                    <Settings className="w-6 h-6 mx-auto mb-1" />
                    Weather card not configured.
                    {isEditMode && " Click edit icon."}
                </div>
            )}


            {/* Forecast Section */}
            {config.showForecast && (
              <>
                {configuredWeatherItems.length > 0 && <hr className="my-1 border-border/50" />}
                <div className="pt-1">
                  {isLoadingForecast && <p className="text-muted-foreground text-center">Loading forecast...</p>}
                  {errorForecast && <p className="text-red-500 text-center text-xs">{errorForecast}</p>}
                  {forecastData && (
                    <motion.div
                      className="flex items-center justify-between"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="flex items-center space-x-2">
                        {getWeatherIcon(forecastData.weather[0]?.icon, new Date().getHours() >= 6 && new Date().getHours() <= 18)}
                        <div>
                          <p className="font-semibold text-sm">{forecastData.main.temp.toFixed(1)}°C</p>
                          <p className="text-muted-foreground text-xs capitalize">{forecastData.weather[0]?.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{forecastData.name}</p>
                        <p className="text-muted-foreground">Feels like: {forecastData.main.feels_like.toFixed(1)}°C</p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default WeatherCard;

// Function to load config from localStorage (to be called in the parent component)
export const loadWeatherCardConfigFromStorage = (): WeatherCardConfig => {
  if (typeof window !== 'undefined') {
    const storedConfig = localStorage.getItem(WEATHER_CARD_CONFIG_KEY);
    if (storedConfig) {
      try {
        return JSON.parse(storedConfig) as WeatherCardConfig;
      } catch (e) {
        console.error("Failed to parse weather card config from localStorage", e);
      }
    }
  }
  // Default config if nothing in storage or error
  return {
    showForecast: true,
    // Other fields will be undefined initially
  };
};
