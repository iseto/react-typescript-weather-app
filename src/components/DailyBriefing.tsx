import { Droplets, Sunrise, Thermometer } from 'lucide-react'
import { buildBriefing } from '../lib/briefing'
import { formatTimestamp } from '../lib/forecastTime'
import { useMinuteClock } from '../hooks/useMinuteClock'
import type { Snapshot } from '../lib/weather'
import type { ForecastPhase } from '../lib/forecastState'
export function DailyBriefing({
  snapshot,
  phase,
  unit,
}: {
  snapshot: Snapshot | null
  phase: ForecastPhase
  unit: 'C' | 'F'
}) {
  const now = useMinuteClock()
  const briefing = snapshot ? buildBriefing(snapshot.weather, unit, now) : null
  return (
    <section className="daily-briefing" aria-labelledby="briefing-title">
      <div className="briefing-heading">
        <div>
          <span className="eyebrow">
            <Sunrise size={16} aria-hidden="true" /> TODAY AT A GLANCE
          </span>
          <h1 id="briefing-title">Today's briefing</h1>
        </div>
        {snapshot && (
          <span className="briefing-date">
            {new Intl.DateTimeFormat('en-GB', {
              day: 'numeric',
              month: 'short',
              timeZone: snapshot.weather.timezone,
            }).format(now)}
          </span>
        )}
      </div>
      {briefing && snapshot ? (
        <>
          <p className="briefing-summary">{briefing.summary}</p>
          <div className="briefing-insights">
            {briefing.temperature && (
              <p>
                <Thermometer size={17} aria-hidden="true" />
                <span>{briefing.temperature}</span>
              </p>
            )}
            {briefing.precipitation && (
              <p>
                <Droplets size={17} aria-hidden="true" />
                <span>{briefing.precipitation}</span>
              </p>
            )}
          </div>
          {!briefing.temperature && (
            <p className="briefing-note">
              Today's daily range is available, but no remaining hourly detail
              is saved. Refresh for a fuller briefing.
            </p>
          )}
          <p className="briefing-note">
            {phase === 'ready'
              ? 'From the latest fetched forecast'
              : 'From the previous forecast'}{' '}
            · Retrieved{' '}
            <time dateTime={new Date(snapshot.updatedAt).toISOString()}>
              {formatTimestamp(snapshot.updatedAt, snapshot.weather.timezone)}
            </time>
            . Hourly chances describe precipitation, not exact rain start times.
          </p>
        </>
      ) : (
        <p className="briefing-note">
          {snapshot
            ? `This forecast does not cover today in ${snapshot.place.name}. Connect and refresh to get today's briefing.`
            : phase === 'loading' || phase === 'locating'
              ? "Loading today's forecast…"
              : phase === 'offline'
                ? "You're offline. Choose a saved place or reconnect to get today's briefing."
                : "Choose a city or refresh to get today's briefing."}
        </p>
      )}
    </section>
  )
}
