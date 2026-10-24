import { useState } from 'react'
import {
  ArrowUpRight,
  Droplets,
  Wind,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Clock3,
} from 'lucide-react'
import {
  formatDay,
  formatTime,
  outdoorWindow,
  temperature,
  upcomingHours,
  weatherLabel,
  type Place,
  type Weather,
} from '../lib/weather'
import { WeatherIcon } from './WeatherIcon'
import { useMinuteClock } from '../hooks/useMinuteClock'
import { formatOffset, formatTimestamp } from '../lib/forecastTime'
import { DayDetailDialog } from './DayDetailDialog'
import { ActivityPlanner } from './ActivityPlanner'
import { RainRadar } from './RainRadar'
export function Forecast({
  weather: w,
  unit,
  place,
  online,
}: {
  weather: Weather
  unit: 'C' | 'F'
  place: Place
  online: boolean
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const hours = upcomingHours(w)
  const hourLabels = hours.map((h) => formatTime(h.time, w.timezone))
  const now = useMinuteClock()
  const expired = now >= (w.hourly.time[w.hourly.time.length - 1] + 3600) * 1000
  const window = outdoorWindow(w, now / 1000)
  const lows = w.daily.temperature_2m_min
  const highs = w.daily.temperature_2m_max
  const min = Math.min(...lows),
    max = Math.max(...highs),
    range = Math.max(max - min, 1)
  return (
    <>
      <section className="metrics" aria-label="Current weather details">
        <div>
          <span className="metric-label">
            <Thermometer size={17} /> Feels like
          </span>
          <strong>
            {temperature(w.current.apparent_temperature, unit)}
            <span>°{unit}</span>
          </strong>
          <small>Your comfort, at a glance</small>
        </div>
        <div>
          <span className="metric-label">
            <Wind size={17} /> Wind
          </span>
          <strong>
            {Math.round(w.current.wind_speed_10m)}
            <span> km/h</span>
          </strong>
          <small>
            {
              ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][
                Math.round(w.current.wind_direction_10m / 45) % 8
              ]
            }{' '}
            · at 10 meters
          </small>
        </div>
        <div>
          <span className="metric-label">
            <Droplets size={17} /> Humidity
          </span>
          <strong>
            {w.current.relative_humidity_2m}
            <span>%</span>
          </strong>
          <small>
            {w.current.relative_humidity_2m > 70
              ? 'A little moisture in the air'
              : 'Relative humidity'}
          </small>
        </div>
        <div>
          <span className="metric-label">
            <Sun size={17} /> UV index
          </span>
          <strong>
            {w.daily.uv_index_max[0].toFixed(1)}
            <span> / 11+</span>
          </strong>
          <small>
            Daily peak ·{' '}
            {w.daily.uv_index_max[0] < 3
              ? 'Low'
              : w.daily.uv_index_max[0] < 6
                ? 'Moderate'
                : w.daily.uv_index_max[0] < 8
                  ? 'High'
                  : 'Very high'}
          </small>
        </div>
      </section>
      <div className="forecast-grid">
        <section className="panel hourly">
          <div className="section-heading">
            <h2>The next 24 hours</h2>
            <span>From forecast time</span>
          </div>
          <div
            className="hourly-scroll"
            tabIndex={0}
            aria-label="Hourly forecast, scroll for more hours"
          >
            <div className="hourly-columns">
              {hours.map((h, i) => (
                <div className={`hour ${i === 0 ? 'now' : ''}`} key={h.time}>
                  <span title={formatTimestamp(h.time * 1000, w.timezone)}>
                    <time dateTime={new Date(h.time * 1000).toISOString()}>
                      {hourLabels[i]}
                    </time>
                    {hourLabels.indexOf(hourLabels[i]) !==
                      hourLabels.lastIndexOf(hourLabels[i]) && (
                      <small className="hour-offset">
                        {formatOffset(h.time, w.timezone)}
                      </small>
                    )}
                  </span>
                  <WeatherIcon code={h.code} day={h.day} />
                  <strong>{temperature(h.temp, unit)}°</strong>
                  <small>
                    <Droplets size={11} />
                    {h.rain}%
                  </small>
                  <span className="sr-only">{weatherLabel(h.code)}</span>
                </div>
              ))}
            </div>
            <svg
              className="temperature-curve"
              viewBox={`0 0 ${hours.length * 76} 72`}
              role="img"
              aria-label="Hourly temperature trend"
            >
              <defs>
                <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9caf7a" stopOpacity=".18" />
                  <stop offset="100%" stopColor="#9caf7a" stopOpacity="0" />
                </linearGradient>
              </defs>
              {hours.length > 0 &&
                (() => {
                  const low = Math.min(...hours.map((h) => h.temp)),
                    high = Math.max(...hours.map((h) => h.temp))
                  const points = hours
                    .map(
                      (h, i) =>
                        `${i * 76 + 38},${52 - ((h.temp - low) / Math.max(high - low, 1)) * 35}`
                    )
                    .join(' ')
                  return (
                    <>
                      <polygon
                        points={`38,72 ${points} ${hours.length * 76 - 38},72`}
                        fill="url(#chart-fill)"
                      />
                      <polyline
                        points={points}
                        fill="none"
                        stroke="#8b9f70"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </>
                  )
                })()}
            </svg>
          </div>
          <div className="panel-note">
            <Droplets size={14} />
            <span>Percentages show the chance of precipitation.</span>
          </div>
        </section>
        <section className="panel weekly">
          <div className="section-heading">
            <h2>The week ahead</h2>
            <span>7 days</span>
          </div>
          <div className="days">
            {w.daily.time.map((time, i) => (
              <button
                className="day"
                key={time}
                type="button"
                aria-haspopup="dialog"
                aria-label={`View details for ${new Intl.DateTimeFormat(
                  'en-GB',
                  {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    timeZone: w.timezone,
                  }
                ).format(time * 1000)}`}
                onClick={() => setSelectedDay(i)}
              >
                <strong>{formatDay(time, w.timezone)}</strong>
                <span
                  className="day-icon"
                  title={weatherLabel(w.daily.weather_code[i])}
                >
                  <WeatherIcon code={w.daily.weather_code[i]} size={21} />
                  <span className="sr-only">
                    {weatherLabel(w.daily.weather_code[i])}
                  </span>
                </span>
                <small className="day-rain">
                  {w.daily.precipitation_probability_max[i]}%
                </small>
                <span className="low">{temperature(lows[i], unit)}°</span>
                <span className="range">
                  <span
                    style={{
                      left: `${((lows[i] - min) / range) * 100}%`,
                      width: `${Math.max(((highs[i] - lows[i]) / range) * 100, 2)}%`,
                    }}
                  />
                </span>
                <span className="high">{temperature(highs[i], unit)}°</span>
                <ArrowUpRight
                  className="day-open"
                  size={14}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </section>
      </div>
      <RainRadar place={place} timezone={w.timezone} online={online} />
      <ActivityPlanner weather={w} unit={unit} />
      <div className="bottom-grid">
        <section className="panel daylight">
          <div className="section-heading">
            <h2>A little daylight</h2>
            <Sun size={18} />
          </div>
          <div className="sun-times">
            <div>
              <Sunrise size={26} />
              <small>Sunrise</small>
              <strong>{formatTime(w.daily.sunrise[0], w.timezone)}</strong>
            </div>
            <div className="sun-arc" aria-hidden="true">
              <span>☀</span>
            </div>
            <div>
              <Sunset size={26} />
              <small>Sunset</small>
              <strong>{formatTime(w.daily.sunset[0], w.timezone)}</strong>
            </div>
          </div>
          <p>
            {Math.floor((w.daily.sunset[0] - w.daily.sunrise[0]) / 3600)}h{' '}
            {Math.floor(((w.daily.sunset[0] - w.daily.sunrise[0]) % 3600) / 60)}
            m of daylight in this forecast day
          </p>
        </section>
        <section className="outdoor-card">
          <span className="eyebrow">
            <Clock3 size={15} /> MAKE ROOM FOR OUTSIDE
          </span>
          <h2>
            {expired
              ? 'A fresh forecast is needed.'
              : window
                ? 'A good moment to step out.'
                : 'A little planning goes a long way.'}
          </h2>
          <p>
            {expired
              ? 'This forecast period has ended. Reconnect and refresh before planning time outside.'
              : window
                ? `Around ${formatTime(window.time, w.timezone)}, expect ${weatherLabel(window.code).toLowerCase()}, ${temperature(window.temp, unit)}°${unit} and a ${window.rain}% chance of rain.`
                : 'No mild, mostly dry daylight hour in the next 12 hours. Check the hourly forecast before heading out.'}
          </p>
          <span className="outdoor-detail">
            Based on temperature, daylight & rain <ArrowUpRight size={17} />
          </span>
        </section>
      </div>
      <DayDetailDialog
        weather={w}
        day={selectedDay}
        unit={unit}
        onClose={() => setSelectedDay(null)}
      />
    </>
  )
}
