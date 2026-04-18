import { DEFAULT_HOLIDAY_REGION, DEFAULT_HOLIDAY_WINDOW_DAYS, HOLIDAY_CACHE_TTL_MS, WEATHER_CACHE_TTL_MS } from './config.js';
import { filterUpcomingHolidays } from './domain.js';

const weatherCache = new Map();
const holidayCache = new Map();

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'replit-dashboard-v1/1.0'
    }
  });
  if (!response.ok) {
    throw new Error(`FETCH_FAILED:${response.status}`);
  }
  return response.json();
}

export async function searchCities(query) {
  const trimmed = String(query || '').trim();
  if (!trimmed) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=8&language=zh&format=json`;
  const data = await fetchJson(url);
  return (data.results || []).map((item) => ({
    name: item.name,
    country: item.country || '',
    latitude: item.latitude,
    longitude: item.longitude,
    timezone: item.timezone || 'Asia/Shanghai',
    admin1: item.admin1 || ''
  }));
}

export async function getWeather(city) {
  const cacheKey = `${city.latitude},${city.longitude}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(city.latitude)}&longitude=${encodeURIComponent(city.longitude)}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=${encodeURIComponent(city.timezone || 'auto')}`;
  const data = await fetchJson(url);
  const current = data.current || {};
  const value = {
    cityName: city.name,
    country: city.country,
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    weatherCode: current.weather_code,
    weatherLabel: weatherCodeToChinese(current.weather_code),
    observedAt: current.time || null
  };
  weatherCache.set(cacheKey, { value, expiresAt: Date.now() + WEATHER_CACHE_TTL_MS });
  return value;
}

export async function getUpcomingHolidays(countryCode = DEFAULT_HOLIDAY_REGION, days = DEFAULT_HOLIDAY_WINDOW_DAYS) {
  const year = new Date().getUTCFullYear();
  const cacheKey = `${countryCode}-${year}`;
  const cached = holidayCache.get(cacheKey);
  let yearData;
  if (cached && cached.expiresAt > Date.now()) {
    yearData = cached.value;
  } else {
    const currentYearData = await fetchJson(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
    let nextYearData = [];
    if (new Date().getUTCMonth() >= 9) {
      nextYearData = await fetchJson(`https://date.nager.at/api/v3/PublicHolidays/${year + 1}/${countryCode}`);
    }
    yearData = [...currentYearData, ...nextYearData];
    holidayCache.set(cacheKey, { value: yearData, expiresAt: Date.now() + HOLIDAY_CACHE_TTL_MS });
  }
  return filterUpcomingHolidays(yearData.map((holiday) => ({
    date: holiday.date,
    localName: holiday.localName,
    name: holiday.name,
    types: holiday.types || []
  })), new Date(), days);
}

function weatherCodeToChinese(code) {
  const map = new Map([
    [0, '晴朗'],
    [1, '大致晴朗'],
    [2, '局部多云'],
    [3, '阴天'],
    [45, '有雾'],
    [48, '冻雾'],
    [51, '小毛毛雨'],
    [53, '毛毛雨'],
    [55, '强毛毛雨'],
    [61, '小雨'],
    [63, '中雨'],
    [65, '大雨'],
    [71, '小雪'],
    [73, '中雪'],
    [75, '大雪'],
    [80, '阵雨'],
    [81, '强阵雨'],
    [82, '暴雨'],
    [95, '雷暴']
  ]);
  return map.get(code) || '未知天气';
}
