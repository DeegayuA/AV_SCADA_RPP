import schedule from 'node-schedule';
import fs from 'fs/promises';
import path from 'path';

const WEATHER_CONFIG_FILE = path.resolve(process.cwd(), 'config/weather.config.json');

interface WeatherConfig {
  enabled: boolean;
  forecastApiKey?: string;
  forecastCityName?: string;
}

async function getWeatherConfig(): Promise<WeatherConfig | null> {
  try {
    const data = await fs.readFile(WEATHER_CONFIG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading weather config for scheduler:', error);
    return null;
  }
}

async function getSunsetTime(apiKey: string, city: string): Promise<Date | null> {
  try {
    const geocodeApiUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;
    const geoResponse = await fetch(geocodeApiUrl);
    if (!geoResponse.ok) {
      console.error('Failed to geocode city for sunset time');
      return null;
    }
    const geoData = await geoResponse.json();
    if (!geoData || geoData.length === 0) {
      console.error('City not found for sunset time');
      return null;
    }
    const { lat, lon } = geoData[0];

    const weatherApiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const weatherResponse = await fetch(weatherApiUrl);
    if (!weatherResponse.ok) {
      console.error('Failed to get weather data for sunset time');
      return null;
    }
    const weatherData = await weatherResponse.json();
    const sunsetTimestamp = weatherData.sys.sunset;
    if (sunsetTimestamp) {
      // OpenWeatherMap provides sunset time in UTC seconds
      return new Date(sunsetTimestamp * 1000);
    }
    return null;
  } catch (error) {
    console.error('Error fetching sunset time:', error);
    return null;
  }
}

function scheduleSunsetEmail(sunsetTime: Date) {
  schedule.scheduleJob(sunsetTime, async () => {
    console.log(`It's sunset! Triggering email send process...`);
    try {
      // This will be replaced with a call to the email sending API endpoint
      console.log('TODO: Call the email sending API endpoint');
      // Assuming the app runs on port 3000. A more robust solution would use an environment variable.
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      await fetch(`${baseUrl}/api/cron/send-sunset-email`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // We might need some form of authentication here to prevent unauthorized access
            // For now, we'll assume it's an internal service call
        },
      });
    } catch (error) {
      console.error('Error triggering sunset email job:', error);
    }
  });
  console.log(`Sunset email job scheduled for: ${sunsetTime.toLocaleTimeString()}`);
}

async function initializeSunsetScheduler() {
  const weatherConfig = await getWeatherConfig();
  if (weatherConfig && weatherConfig.enabled && weatherConfig.forecastApiKey && weatherConfig.forecastCityName) {
    const sunsetTime = await getSunsetTime(weatherConfig.forecastApiKey, weatherConfig.forecastCityName);
    if (sunsetTime) {
      // Check if sunset time is in the future
      if (sunsetTime > new Date()) {
        scheduleSunsetEmail(sunsetTime);
      } else {
        console.log('Sunset time has already passed for today.');
      }
    }
  } else {
    console.log('Sunset email scheduler is disabled or not configured.');
  }
}

// Schedule the scheduler to run once a day to get the new sunset time
// This will run every day at 1:00 AM local time
schedule.scheduleJob('0 1 * * *', () => {
  console.log('Running daily task to schedule sunset email...');
  initializeSunsetScheduler();
});

// Also run it once on startup
console.log('Initializing sunset scheduler on startup...');
initializeSunsetScheduler();
