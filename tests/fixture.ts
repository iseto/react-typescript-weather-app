import type { Weather } from '../src/lib/weather'
const start = Date.UTC(2026, 9, 14, 8) / 1000
export const fixture: Weather = {
  timezone: 'Europe/Berlin',
  current: {
    time: start,
    temperature_2m: 18,
    apparent_temperature: 17,
    relative_humidity_2m: 64,
    weather_code: 2,
    wind_speed_10m: 12,
    wind_direction_10m: 230,
    is_day: 1,
  },
  hourly: {
    time: Array.from({ length: 48 }, (_, i) => start + i * 3600),
    temperature_2m: Array.from(
      { length: 48 },
      (_, i) => 16 + Math.round(Math.sin(i / 4) * 5)
    ),
    precipitation_probability: Array.from({ length: 48 }, (_, i) =>
      i < 9 ? 10 : 35
    ),
    weather_code: Array.from({ length: 48 }, (_, i) => (i < 6 ? 2 : 3)),
    is_day: Array.from({ length: 48 }, (_, i) => (i % 24 < 10 ? 1 : 0)),
  },
  daily: {
    time: Array.from({ length: 7 }, (_, i) => start + i * 86400),
    temperature_2m_max: [21, 19, 17, 20, 22, 18, 16],
    temperature_2m_min: [12, 11, 10, 12, 13, 11, 9],
    weather_code: [2, 3, 61, 2, 0, 3, 61],
    precipitation_probability_max: [10, 25, 80, 15, 5, 30, 65],
    sunrise: Array.from({ length: 7 }, (_, i) => start - 10800 + i * 86400),
    sunset: Array.from({ length: 7 }, (_, i) => start + 25200 + i * 86400),
    uv_index_max: [3.2, 3, 2, 3, 4, 2, 1],
  },
}
