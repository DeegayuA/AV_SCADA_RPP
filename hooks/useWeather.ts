'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/appStore';
import { WEATHER_CARD_CONFIG_KEY, PLANT_LOCATION } from '@/config/constants';
import { WeatherCardConfig, OWMGeocodingResponseItem, OWMCurrentWeatherResponse, OWMForecastResponse, OWMAirPollutionResponse } from '@/types';

const defaultConfig: WeatherCardConfig = {
  opcUaItems: [],
  showForecast: true,
  forecastApiKey: undefined,
  forecastCityName: PLANT_LOCATION,
  showHourlyForecast: true,
  showDailySummary: true,
  showAirPollution: true,
  numOpcSensorsToShow: 3,
  numHourlyForecastsToShow: 5,
  numDailyForecastsToShow: 3,
};

export function useWeather() {
  const [config, setConfig] = useState<WeatherCardConfig>(defaultConfig);
  const [resolvedCoordinates, setResolvedCoordinates] = useState<{ lat: number, lon: number } | null>(null);
  const [isLoadingGeocoding, setIsLoadingGeocoding] = useState(false);
  const [errorGeocoding, setErrorGeocoding] = useState<string | null>(null);
  const [currentWeather, setCurrentWeather] = useState<OWMCurrentWeatherResponse | null>(null);
  const [forecast, setForecast] = useState<OWMForecastResponse | null>(null);
  const [airPollution, setAirPollution] = useState<OWMAirPollutionResponse | null>(null);
  const setSunsetTime = useAppStore((state) => state.setSunsetTime);
  const apiAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const storedConfig = localStorage.getItem(WEATHER_CARD_CONFIG_KEY);
    if (storedConfig) {
      try {
        const parsed = JSON.parse(storedConfig) as Partial<WeatherCardConfig>;
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse weather config from localStorage", e);
      }
    }
  }, []);

  const geocodeCity = useCallback(async () => {
    apiAbortControllerRef.current?.abort();
    apiAbortControllerRef.current = new AbortController();
    const signal = apiAbortControllerRef.current.signal;

    if (!config.showForecast || !config.forecastApiKey || !config.forecastCityName) {
      setResolvedCoordinates(null);
      return;
    }

    setIsLoadingGeocoding(true);
    setErrorGeocoding(null);
    try {
      const geocodeApiUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(config.forecastCityName)}&limit=1&appid=${config.forecastApiKey}`;
      const response = await fetch(geocodeApiUrl, { signal });
      if (!response.ok) throw new Error('Failed to geocode city');
      const data = await response.json() as OWMGeocodingResponseItem[];
      if (signal.aborted) return;
      if (data && data.length > 0) {
        setResolvedCoordinates({ lat: data[0].lat, lon: data[0].lon });
      } else {
        throw new Error(`City "${config.forecastCityName}" not found.`);
      }
    } catch (err: any) {
      if (signal.aborted) return;
      setErrorGeocoding(err.message);
    } finally {
      if (!signal.aborted) setIsLoadingGeocoding(false);
    }
  }, [config.showForecast, config.forecastApiKey, config.forecastCityName]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      geocodeCity();
    }, 700);
    return () => clearTimeout(debounceTimer);
  }, [geocodeCity]);

  useEffect(() => {
    if (!resolvedCoordinates || !config.forecastApiKey) return;

    apiAbortControllerRef.current?.abort();
    apiAbortControllerRef.current = new AbortController();
    const signal = apiAbortControllerRef.current.signal;
    const { lat, lon } = resolvedCoordinates;

    const fetchData = async () => {
      try {
        const [currentRes, forecastRes, airRes] = await Promise.all([
          fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${config.forecastApiKey}&units=metric`, { signal }),
          fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${config.forecastApiKey}&units=metric`, { signal }),
          fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${config.forecastApiKey}`, { signal })
        ]);

        if (signal.aborted) return;

        if (currentRes.ok) {
          const data = await currentRes.json();
          setCurrentWeather(data);
          if (data.sys.sunset) {
            setSunsetTime(data.sys.sunset);
          }
        }

        if (forecastRes.ok) setForecast(await forecastRes.json());
        if (airRes.ok) setAirPollution(await airRes.json());

      } catch (err) {
        if (signal.aborted) return;
        console.error("Failed to fetch weather data", err);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 30 * 60 * 1000); // 30 minutes
    return () => clearInterval(intervalId);
  }, [resolvedCoordinates, config.forecastApiKey, setSunsetTime]);

  const saveConfig = useCallback((newConfig: WeatherCardConfig) => {
    setConfig(newConfig);
    localStorage.setItem(WEATHER_CARD_CONFIG_KEY, JSON.stringify(newConfig));
  }, []);

  return {
    config,
    saveConfig,
    currentWeather,
    forecast,
    airPollution,
    isLoading: isLoadingGeocoding || (!currentWeather && !errorGeocoding),
    error: errorGeocoding,
  };
}
