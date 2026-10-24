import { useState } from 'react'
import { Activity, Bike, Droplets, Footprints, TreePine } from 'lucide-react'
import { useMinuteClock } from '../hooks/useMinuteClock'
import {
  activityProfile,
  activityProfiles,
  planActivityWindows,
  type ActivityId,
} from '../lib/activityPlanner'
import {
  formatTime,
  temperature,
  weatherLabel,
  type Weather,
} from '../lib/weather'
import { WeatherIcon } from './WeatherIcon'

const activityIcon = (id: ActivityId) => {
  if (id === 'walk') return <Footprints size={17} aria-hidden="true" />
  if (id === 'run') return <Activity size={17} aria-hidden="true" />
  if (id === 'cycle') return <Bike size={17} aria-hidden="true" />
  return <TreePine size={17} aria-hidden="true" />
}

const windowDate = (time: number, timezone: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: timezone,
  }).format(time * 1000)

export function ActivityPlanner({
  weather,
  unit,
}: {
  weather: Weather
  unit: 'C' | 'F'
}) {
  const [activity, setActivity] = useState<ActivityId>('walk')
  const now = useMinuteClock()
  const profile = activityProfile(activity)
  const windows = planActivityWindows(weather, activity, now)

  return (
    <section className="panel activity-planner" aria-labelledby="planner-title">
      <div className="activity-planner-heading">
        <div>
          <span className="eyebrow">
            <Activity size={15} aria-hidden="true" /> PLAN AROUND THE WEATHER
          </span>
          <h2 id="planner-title">Activity planner</h2>
          <p>Find a promising daylight window in the next three days.</p>
        </div>
        <span className="planner-horizon">72-hour outlook</span>
      </div>

      <div className="activity-options" aria-label="Choose an activity">
        {activityProfiles.map((option) => (
          <button
            type="button"
            key={option.id}
            aria-pressed={activity === option.id}
            onClick={() => setActivity(option.id)}
          >
            {activityIcon(option.id)}
            {option.label}
          </button>
        ))}
      </div>

      {windows.length ? (
        <div className="activity-results" aria-live="polite">
          {windows.map((window, index) => {
            const low = Math.min(...window.temperatures)
            const high = Math.max(...window.temperatures)
            const lowLabel = temperature(low, unit)
            const highLabel = temperature(high, unit)
            return (
              <article className="activity-window" key={window.start}>
                <div className="activity-window-time">
                  <span>
                    {index === 0 ? 'Best match' : `Option ${index + 1}`}
                  </span>
                  <strong>{windowDate(window.start, weather.timezone)}</strong>
                  <time dateTime={new Date(window.start * 1000).toISOString()}>
                    {formatTime(window.start, weather.timezone)}–
                    {formatTime(window.end, weather.timezone)}
                  </time>
                </div>
                <WeatherIcon code={window.weatherCode} size={24} />
                <div className="activity-window-weather">
                  <strong>
                    {lowLabel === highLabel
                      ? `${lowLabel}°${unit}`
                      : `${lowLabel}–${highLabel}°${unit}`}
                  </strong>
                  <span>{weatherLabel(window.weatherCode)}</span>
                </div>
                <div className="activity-window-rain">
                  <Droplets size={14} aria-hidden="true" />
                  <strong>{window.maxRain}%</strong>
                  <span>rain</span>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="activity-empty" aria-live="polite">
          <strong>
            No comfortable {profile.label.toLowerCase()} window found.
          </strong>
          <p>
            The next 72 hours do not meet this activity’s daylight, temperature,
            conditions, and rain thresholds.
          </p>
        </div>
      )}

      <p className="activity-disclaimer">
        Suggestions use forecast probabilities and comfort ranges. Check local
        conditions before heading out.
      </p>
    </section>
  )
}
