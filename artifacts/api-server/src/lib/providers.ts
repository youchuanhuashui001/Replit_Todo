import { logger } from "./logger";

const weatherCache = new Map<string, { value: WeatherData; expiresAt: number }>();
const holidayCache = new Map<string, { value: HolidayRaw[]; expiresAt: number }>();
const WEATHER_CACHE_TTL = 10 * 60 * 1000;
const HOLIDAY_CACHE_TTL = 24 * 60 * 60 * 1000;

export interface WeatherData {
  cityName: string;
  country?: string | null;
  temperature?: number | null;
  humidity?: number | null;
  windSpeed?: number | null;
  weatherCode?: number | null;
  weatherLabel: string;
  observedAt?: string | null;
}

export interface CitySearchResult {
  name: string;
  country?: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  admin1?: string | null;
}

interface HolidayRaw {
  date: string;
  localName?: string | null;
  name: string;
  types?: string[];
}

export interface Holiday {
  date: string;
  localName?: string | null;
  name: string;
  types: string[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": "replit-dashboard/1.0" } });
  if (!res.ok) throw new Error(`FETCH_FAILED:${res.status}`);
  return res.json() as Promise<T>;
}

export async function searchCities(query: string): Promise<CitySearchResult[]> {
  const trimmed = String(query || "").trim();
  if (!trimmed) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=8&language=zh&format=json`;
  const data = await fetchJson<{ results?: { name: string; country?: string; latitude: number; longitude: number; timezone?: string; admin1?: string }[] }>(url);
  return (data.results || []).map((item) => ({
    name: item.name,
    country: item.country || null,
    latitude: item.latitude,
    longitude: item.longitude,
    timezone: item.timezone || "Asia/Shanghai",
    admin1: item.admin1 || null,
  }));
}

export async function getWeather(city: { name: string; country?: string | null; latitude: number; longitude: number; timezone: string }): Promise<WeatherData> {
  const cacheKey = `${city.latitude},${city.longitude}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(city.latitude)}&longitude=${encodeURIComponent(city.longitude)}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=${encodeURIComponent(city.timezone || "auto")}`;
  const data = await fetchJson<{ current?: { temperature_2m?: number; relative_humidity_2m?: number; weather_code?: number; wind_speed_10m?: number; time?: string } }>(url);
  const current = data.current || {};

  const value: WeatherData = {
    cityName: city.name,
    country: city.country || null,
    temperature: current.temperature_2m ?? null,
    humidity: current.relative_humidity_2m ?? null,
    windSpeed: current.wind_speed_10m ?? null,
    weatherCode: current.weather_code ?? null,
    weatherLabel: weatherCodeToChinese(current.weather_code),
    observedAt: current.time || null,
  };
  weatherCache.set(cacheKey, { value, expiresAt: Date.now() + WEATHER_CACHE_TTL });
  return value;
}

export async function getUpcomingHolidays(countryCode = "CN", days = 90): Promise<Holiday[]> {
  const year = new Date().getUTCFullYear();
  const cacheKey = `${countryCode}-${year}`;
  const cached = holidayCache.get(cacheKey);
  let yearData: HolidayRaw[];

  if (cached && cached.expiresAt > Date.now()) {
    yearData = cached.value;
  } else {
    const current = await fetchJson<HolidayRaw[]>(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
    let next: HolidayRaw[] = [];
    if (new Date().getUTCMonth() >= 9) {
      try {
        next = await fetchJson<HolidayRaw[]>(`https://date.nager.at/api/v3/PublicHolidays/${year + 1}/${countryCode}`);
      } catch {
        logger.warn("Failed to fetch next year holidays");
      }
    }
    yearData = [...current, ...next];
    holidayCache.set(cacheKey, { value: yearData, expiresAt: Date.now() + HOLIDAY_CACHE_TTL });
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + days * 24 * 60 * 60 * 1000;

  return yearData
    .filter((h) => {
      const ts = Date.parse(h.date);
      return Number.isFinite(ts) && ts >= start && ts <= end;
    })
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .map((h) => ({ date: h.date, localName: h.localName || null, name: h.name, types: h.types || [] }));
}

function weatherCodeToChinese(code?: number): string {
  if (code == null) return "未知天气";
  const map: Record<number, string> = {
    0: "晴朗", 1: "大致晴朗", 2: "局部多云", 3: "阴天",
    45: "有雾", 48: "冻雾", 51: "小毛毛雨", 53: "毛毛雨", 55: "强毛毛雨",
    61: "小雨", 63: "中雨", 65: "大雨", 71: "小雪", 73: "中雪", 75: "大雪",
    80: "阵雨", 81: "强阵雨", 82: "暴雨", 95: "雷暴",
  };
  return map[code] || "未知天气";
}
