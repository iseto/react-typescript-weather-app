import { useEffect, useRef } from 'react'
import { CalendarDays, Droplets, Sun, Sunrise, Sunset, X } from 'lucide-react'
import { localDateKey } from '../lib/briefing'
import {
  formatTime,
  temperature,
  weatherLabel,
  type Weather,
} from '../lib/weather'
import { WeatherIcon } from './WeatherIcon'

const fullDate = (time: number, timezone: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: timezone,
  }).format(time * 1000)

const uvLabel = (value: number) =>
  value < 3
    ? 'Low'
    : value < 6
      ? 'Moderate'
      : value < 8
        ? 'High'
        : value < 11
          ? 'Very high'
          : 'Extreme'

const daylightLabel = (sunrise: number, sunset: number) => {
  const minutes = Math.max(0, Math.round((sunset - sunrise) / 60))
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export function DayDetailDialog({
  weather,
  day,
  unit,
  onClose,
}: {
  weather: Weather
  day: number | null
  unit: 'C' | 'F'
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (day !== null && !dialog.current?.open) dialog.current?.showModal()
  }, [day])

  if (day === null) return null

  const dateKey = localDateKey(weather.daily.time[day], weather.timezone)
  const hours = weather.hourly.time
    .map((time, index) => ({
      time,
      temp: weather.hourly.temperature_2m[index],
      rain: weather.hourly.precipitation_probability[index],
      code: weather.hourly.weather_code[index],
      daylight: weather.hourly.is_day[index],
    }))
    .filter((hour) => localDateKey(hour.time, weather.timezone) === dateKey)
  const sunrise = weather.daily.sunrise[day]
  const sunset = weather.daily.sunset[day]
  const title = fullDate(weather.daily.time[day], weather.timezone)

  return (
    <dialog
      ref={dialog}
      className="day-dialog"
      aria-labelledby="day-dialog-title"
      onClose={onClose}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <div className="day-dialog-shell">
        <button
          className="icon-button day-dialog-close"
          onClick={() => dialog.current?.close()}
          aria-label="Close day details"
        >
          <X size={18} />
        </button>

        <header className="day-detail-header">
          <div>
            <span className="eyebrow">
              <CalendarDays size={15} aria-hidden="true" /> DAY FORECAST
            </span>
            <h2 id="day-dialog-title">{title}</h2>
            <p>{weatherLabel(weather.daily.weather_code[day])}</p>
          </div>
          <div className="day-detail-condition" aria-hidden="true">
            <WeatherIcon code={weather.daily.weather_code[day]} size={38} />
            <strong>
              {temperature(weather.daily.temperature_2m_max[day], unit)}°
            </strong>
            <span>
              {temperature(weather.daily.temperature_2m_min[day], unit)}° low
            </span>
          </div>
        </header>

        <div className="day-detail-metrics" aria-label="Daily highlights">
          <div>
            <Droplets size={17} aria-hidden="true" />
            <span>Rain chance</span>
            <strong>{weather.daily.precipitation_probability_max[day]}%</strong>
          </div>
          <div>
            <Sun size={17} aria-hidden="true" />
            <span>Peak UV</span>
            <strong>
              {weather.daily.uv_index_max[day].toFixed(1)} ·{' '}
              {uvLabel(weather.daily.uv_index_max[day])}
            </strong>
          </div>
          <div>
            <Sunrise size={17} aria-hidden="true" />
            <span>Sunrise</span>
            <strong>{formatTime(sunrise, weather.timezone)}</strong>
          </div>
          <div>
            <Sunset size={17} aria-hidden="true" />
            <span>Sunset</span>
            <strong>{formatTime(sunset, weather.timezone)}</strong>
          </div>
        </div>

        <div className="day-detail-section-heading">
          <div>
            <h3>Hour by hour</h3>
            <p>{daylightLabel(sunrise, sunset)} of daylight</p>
          </div>
          <span>Local time</span>
        </div>

        {hours.length ? (
          <div
            className="day-detail-hours"
            tabIndex={0}
            aria-label={`Hourly forecast for ${title}, scroll for more hours`}
          >
            {hours.map((hour) => (
              <div className="day-detail-hour" key={hour.time}>
                <time dateTime={new Date(hour.time * 1000).toISOString()}>
                  {formatTime(hour.time, weather.timezone)}
                </time>
                <WeatherIcon code={hour.code} day={hour.daylight} size={21} />
                <strong>{temperature(hour.temp, unit)}°</strong>
                <small>
                  <Droplets size={11} aria-hidden="true" /> {hour.rain}%
                </small>
                <span className="sr-only">{weatherLabel(hour.code)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="day-detail-empty">
            Hourly detail is not available in this saved forecast.
          </p>
        )}

        <p className="day-detail-note">
          Rain percentages show probability for each hour. Times use the
          forecast location’s timezone.
        </p>
      </div>
    </dialog>
  )
}
