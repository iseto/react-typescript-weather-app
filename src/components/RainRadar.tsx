import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet'
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Radar,
  RefreshCw,
  WifiOff,
} from 'lucide-react'
import { fetchRadarFrames, radarTileUrl, type RadarFrames } from '../lib/radar'
import type { Place } from '../lib/weather'

function RadarViewport({ place }: { place: Place }) {
  const map = useMap()
  useEffect(() => {
    map.setView([place.latitude, place.longitude], map.getZoom(), {
      animate: true,
    })
  }, [map, place.latitude, place.longitude])
  return null
}

const frameLabel = (time: number, timezone: string) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  }).format(time * 1000)

export function RainRadar({
  place,
  timezone,
  online,
}: {
  place: Place
  timezone: string
  online: boolean
}) {
  const [radar, setRadar] = useState<RadarFrames | null>(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const [requestState, setRequestState] = useState<'idle' | 'loading'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!online) return
    const controller = new AbortController()
    let active = true
    let timedOut = false
    const timeout = window.setTimeout(() => {
      timedOut = true
      controller.abort()
    }, 10000)
    fetchRadarFrames(controller.signal)
      .then((next) => {
        if (!active) return
        setRadar(next)
        setFrameIndex(next.frames.length - 1)
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!active) return
        if (timedOut) setError('Radar took too long to respond. Try again.')
        else
          setError(
            reason instanceof Error ? reason.message : 'Radar is unavailable.'
          )
      })
      .finally(() => {
        window.clearTimeout(timeout)
        if (active) setRequestState('idle')
      })
    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [online, refresh])

  useEffect(() => {
    if (!playing || !online || !radar || radar.frames.length < 2) return
    const interval = window.setInterval(
      () => setFrameIndex((current) => (current + 1) % radar.frames.length),
      900
    )
    return () => window.clearInterval(interval)
  }, [online, playing, radar])

  const frame = radar?.frames[frameIndex]
  const loading =
    requestState === 'loading' || (online && !radar && error === null)
  const moveFrame = (direction: -1 | 1) => {
    if (!radar) return
    setPlaying(false)
    setFrameIndex(
      (current) =>
        (current + direction + radar.frames.length) % radar.frames.length
    )
  }

  return (
    <section className="panel rain-radar" aria-labelledby="radar-title">
      <div className="radar-heading">
        <div>
          <span className="eyebrow">
            <Radar size={15} aria-hidden="true" /> RECENT PRECIPITATION
          </span>
          <h2 id="radar-title">Rain radar</h2>
          <p>See how precipitation has moved around {place.name}.</p>
        </div>
        <button
          className="icon-button radar-refresh"
          onClick={() => {
            setRequestState('loading')
            setError(null)
            setRefresh((value) => value + 1)
          }}
          disabled={!online || loading}
          aria-label="Refresh radar"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {!online && !radar && (
        <div className="radar-unavailable" role="status">
          <WifiOff size={23} aria-hidden="true" />
          <div>
            <strong>Radar needs a connection.</strong>
            <p>Your saved forecast remains available while you’re offline.</p>
          </div>
        </div>
      )}

      {online && !radar && loading && (
        <div className="radar-unavailable" role="status">
          <Radar size={23} className="radar-pulse" aria-hidden="true" />
          <div>
            <strong>Loading recent radar…</strong>
            <p>Fetching the latest observed precipitation frames.</p>
          </div>
        </div>
      )}

      {!radar && error && !loading && (
        <div className="radar-unavailable" role="status">
          <Radar size={23} aria-hidden="true" />
          <div>
            <strong>Radar is temporarily unavailable.</strong>
            <p>{error} The rest of your forecast is unaffected.</p>
          </div>
        </div>
      )}

      {radar && frame && (
        <>
          <div
            className="radar-map-wrap"
            role="region"
            aria-label={`Interactive rain radar map centered on ${place.name}`}
          >
            <MapContainer
              center={[place.latitude, place.longitude]}
              zoom={6}
              minZoom={3}
              maxZoom={7}
              scrollWheelZoom={false}
              className="radar-map"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={7}
                className="radar-base-tiles"
              />
              <TileLayer
                key={frame.path}
                attribution='<a href="https://www.rainviewer.com/">Radar: RainViewer</a>'
                url={radarTileUrl(radar.host, frame.path)}
                opacity={0.72}
                maxNativeZoom={7}
                maxZoom={7}
                zIndex={4}
                className="radar-precipitation-tiles"
              />
              <CircleMarker
                center={[place.latitude, place.longitude]}
                radius={5}
                pathOptions={{
                  color: '#fff',
                  fillColor: '#244c3c',
                  fillOpacity: 1,
                  weight: 2,
                }}
              />
              <RadarViewport place={place} />
            </MapContainer>
            <div className="radar-legend" aria-hidden="true">
              <span>Light</span>
              <i />
              <span>Heavy</span>
            </div>
            {!online && (
              <span className="radar-offline-badge">
                <WifiOff size={12} aria-hidden="true" /> Last loaded frame
              </span>
            )}
          </div>

          {error && (
            <p className="radar-inline-error" role="status">
              {error} Showing the last loaded frame.
            </p>
          )}

          <div className="radar-timeline">
            <button
              className="icon-button"
              onClick={() => moveFrame(-1)}
              aria-label="Previous radar frame"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="radar-play"
              onClick={() => setPlaying((value) => !value)}
              disabled={!online || radar.frames.length < 2}
              aria-label={
                playing ? 'Pause radar animation' : 'Play radar animation'
              }
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
              {playing ? 'Pause' : 'Play'}
            </button>
            <label>
              <span className="sr-only">Radar timeline</span>
              <input
                type="range"
                min="0"
                max={radar.frames.length - 1}
                value={frameIndex}
                onChange={(event) => {
                  setPlaying(false)
                  setFrameIndex(Number(event.target.value))
                }}
                aria-label="Radar timeline"
              />
            </label>
            <button
              className="icon-button"
              onClick={() => moveFrame(1)}
              aria-label="Next radar frame"
            >
              <ChevronRight size={18} />
            </button>
            <div className="radar-time" aria-live="polite">
              <span>Radar frame</span>
              <time dateTime={new Date(frame.time * 1000).toISOString()}>
                {frameLabel(frame.time, timezone)}
              </time>
            </div>
          </div>

          <p className="radar-note">
            Past observations, not a future forecast · Five recent frames · Use
            the map controls to pan and zoom
          </p>
        </>
      )}
    </section>
  )
}
