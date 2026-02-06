export type WeatherCondition = 'Sunny' | 'Rainy' | 'Cloudy' | 'Snow' | 'Unknown';

export interface WeatherData {
  temperature: number;
  condition: WeatherCondition;
  location: string;
  timestamp: number;
}

const CACHE_KEY = 'nyc_weather_cache_v3';
const CACHE_DURATION = 30 * 60 * 1000;

function mapConditionsToWeatherCondition(conditions: string): WeatherCondition {
  const lower = conditions.toLowerCase();
  if (lower.includes('clear') || lower.includes('sunny')) return 'Sunny';
  if (lower.includes('rain')) return 'Rainy';
  if (lower.includes('snow')) return 'Snow';
  if (lower.includes('cloud') || lower.includes('fog') || lower.includes('storm')) return 'Cloudy';
  return 'Cloudy';
}

function getCachedWeather(): WeatherData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: WeatherData = JSON.parse(cached);

    if (!data.location) {
      return null;
    }

    const age = Date.now() - data.timestamp;

    if (age < CACHE_DURATION) {
      return data;
    }
  } catch (e) {
    console.error('Failed to read weather cache:', e);
  }
  return null;
}

function setCachedWeather(data: WeatherData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to cache weather:', e);
  }
}

export async function fetchNYCWeather(daysAhead: 0 | 1 = 0): Promise<WeatherData> {
  const cached = getCachedWeather();
  if (cached && daysAhead === 0) {
    return cached;
  }

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const location = daysAhead === 0 ? 'New York' : 'New York';
    const apiUrl = `${supabaseUrl}/functions/v1/weather?location=${encodeURIComponent(location)}`;

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    const weatherData: WeatherData = {
      temperature: data.temperature,
      condition: mapConditionsToWeatherCondition(data.conditions),
      location: data.location || 'New York',
      timestamp: Date.now()
    };

    if (daysAhead === 0) {
      setCachedWeather(weatherData);
    }

    return weatherData;
  } catch (error) {
    console.error('Failed to fetch weather:', error);

    const fallback = cached || {
      temperature: 59,
      condition: 'Cloudy' as WeatherCondition,
      location: 'New York',
      timestamp: Date.now()
    };

    return fallback;
  }
}

export function getSeasonsFromTemperature(tempF: number): string[] {
  if (tempF < 45) return ['winter'];
  if (tempF < 60) return ['winter', 'fall', 'spring'];
  if (tempF < 75) return ['spring', 'fall'];
  return ['summer', 'spring'];
}

export function getWeatherEmoji(condition: WeatherCondition): string {
  switch (condition) {
    case 'Sunny': return '☀️';
    case 'Rainy': return '🌧️';
    case 'Cloudy': return '☁️';
    case 'Snow': return '❄️';
    default: return '🌤️';
  }
}
