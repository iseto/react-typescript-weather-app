import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  Cloud,
  Code2,
  Globe2,
  LocateFixed,
  MapPin,
  RefreshCw,
  Share2,
  ShieldCheck,
  Smartphone,
  Sun,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import { PlaceSearch } from './components/PlaceSearch'
import { Forecast } from './components/Forecast'
import { WeatherIcon } from './components/WeatherIcon'
import { useWeather } from './hooks/useWeather'
import { usePWA } from './hooks/usePWA'
import {
  formatTime,
  placeKey,
  temperature,
  weatherLabel,
  type Place,
} from './lib/weather'
import { readPlaces, readStorage, writeStorage } from './lib/storage'
import { fetchIPPlace } from './lib/location'

export default function App() {
  const {
    place,
    setPlace,
    snapshot,
    loading,
    error,
    cached,
    refresh,
    detecting,
    locationHint,
  } = useWeather()
  const pwa = usePWA()
  const [unit, setUnit] = useState<'C' | 'F'>(() =>
    readStorage<unknown>('atmos-unit', 'C') === 'F' ? 'F' : 'C'
  )
  const [places, setPlaces] = useState(readPlaces)
  const [notice, setNotice] = useState('')
  const [locating, setLocating] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const locationRequest = useRef<AbortController | null>(null)
  useEffect(() => () => locationRequest.current?.abort(), [])
  const w = snapshot?.weather
  const saved = places.some((p) => placeKey(p) === placeKey(place))
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 6500)
    return () => clearTimeout(timer)
  }, [notice])
  const changeUnit = (next: 'C' | 'F') => {
    setUnit(next)
    if (!writeStorage('atmos-unit', next))
      setNotice('Your browser couldn’t save this preference.')
  }
  const savePlace = () => {
    if (!saved && places.length >= 8) {
      setNotice('You can save up to 8 places. Remove one to add another.')
      return
    }
    const next = saved
      ? places.filter((p) => placeKey(p) !== placeKey(place))
      : [...places, place]
    setPlaces(next)
    setNotice(
      writeStorage('atmos-places', next)
        ? saved
          ? 'Place removed.'
          : `${place.name} saved for your next visit.`
        : 'Place updated for this session. Browser storage is unavailable.'
    )
  }
  const locate = () => {
    locationRequest.current?.abort()
    const controller = new AbortController()
    locationRequest.current = controller
    setLocating(true)
    const approximate = async () => {
      try {
        const next = await fetchIPPlace(controller.signal)
        if (!controller.signal.aborted) {
          selectPlace(next)
          setNotice(
            `Using ${next.name}, estimated from your IP. Search to change it.`
          )
        }
      } catch {
        if (!controller.signal.aborted) {
          setLocating(false)
          setNotice(
            'Location and IP lookup unavailable. Keeping your current city — search to change it.'
          )
        }
      }
    }
    if (!navigator.geolocation) {
      void approximate()
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (controller.signal.aborted) return
        selectPlace({
          name: 'Your location',
          country: 'Local forecast',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: 'device',
        })
      },
      () => {
        if (!controller.signal.aborted) void approximate()
      },
      { timeout: 12000, maximumAge: 300000 }
    )
  }
  const share = async () => {
    if (!w) return
    const url = new URL(window.location.href)
    url.searchParams.set('lat', String(place.latitude))
    url.searchParams.set('lon', String(place.longitude))
    url.searchParams.set('city', place.name)
    url.searchParams.set('country', place.country)
    const data = {
      title: `${place.name} · Atmos`,
      text: `${temperature(w.current.temperature_2m, unit)}°${unit}, ${weatherLabel(w.current.weather_code).toLowerCase()} in ${place.name}.`,
      url: url.toString(),
    }
    try {
      if (navigator.share) await navigator.share(data)
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${data.text}\n${data.url}`)
        setNotice('Forecast link copied to clipboard.')
      } else
        setNotice(
          'Sharing is unavailable in this browser. You can copy the page address.'
        )
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError'))
        setNotice('Couldn’t share this forecast. Please try again.')
    }
  }
  const selectPlace = (p: Place) => {
    locationRequest.current?.abort()
    setLocating(false)
    setPlace(p)
    if (window.location.search)
      window.history.replaceState(null, '', window.location.pathname)
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#forecast">
        Skip to forecast
      </a>
      <header className="site-header">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="Atmos home"
        >
          <span className="brand-icon">
            <Sun size={21} />
          </span>
          atmos<span className="brand-dot">.</span>
        </a>
        <span className="brand-caption">
          A little perspective on the weather.
        </span>
        <div className="header-actions">
          <span className={`connection ${!pwa.online ? 'offline' : ''}`}>
            {pwa.online ? <Wifi size={14} /> : <WifiOff size={14} />}
            {pwa.online ? 'Connected' : 'Offline'}
          </span>
          <button
            className="button install-button"
            onClick={() => dialog.current?.showModal()}
          >
            <ArrowDownToLine size={16} />
            <span>{pwa.installed ? 'App details' : 'Get the app'}</span>
          </button>
        </div>
      </header>
      <main id="forecast">
        {locationHint && (
          <p className="status-banner" role="status">
            {locationHint}
          </p>
        )}
        <div className="intro">
          <div>
            <span className="eyebrow">YOUR EVERYDAY WEATHER COMPANION</span>
            <h1>Look up. Head out.</h1>
            <p>A clearer forecast for whatever’s ahead.</p>
          </div>
          <div className="date-label">
            <Globe2 size={17} />
            <span>
              {w
                ? new Intl.DateTimeFormat('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    timeZone: w.timezone,
                  }).format(w.current.time * 1000)
                : 'Your next forecast awaits'}
            </span>
          </div>
        </div>
        <div className="toolbar">
          <PlaceSearch onSelect={selectPlace} />
          <button
            className="button location-button"
            disabled={locating}
            onClick={locate}
          >
            <LocateFixed size={17} className={locating ? 'spin' : ''} />
            <span>{locating ? 'Locating…' : 'Use my location'}</span>
          </button>
          <div className="unit-switch" aria-label="Temperature unit">
            <button
              aria-pressed={unit === 'C'}
              className={unit === 'C' ? 'selected' : ''}
              onClick={() => changeUnit('C')}
            >
              °C
            </button>
            <button
              aria-pressed={unit === 'F'}
              className={unit === 'F' ? 'selected' : ''}
              onClick={() => changeUnit('F')}
            >
              °F
            </button>
          </div>
        </div>
        {!!places.length && (
          <nav className="saved-places" aria-label="Saved places">
            <Bookmark size={14} />
            <span>YOUR PLACES</span>
            {places.map((p) => (
              <button
                className={placeKey(p) === placeKey(place) ? 'selected' : ''}
                key={placeKey(p)}
                onClick={() => selectPlace(p)}
              >
                {p.name}
                <ArrowUpRight size={13} />
              </button>
            ))}
          </nav>
        )}
        {(!pwa.online || error) && (
          <div className="status-banner" role="status">
            <WifiOff size={17} />
            <span>
              {!pwa.online
                ? snapshot
                  ? 'You’re offline. Your last saved forecast is available below.'
                  : 'You’re offline. Search needs a connection; try a previously loaded place.'
                : error}
            </span>
            <button disabled={loading} onClick={refresh}>
              Retry
            </button>
          </div>
        )}
        {pwa.needRefresh && (
          <div className="status-banner">
            <RefreshCw size={17} />
            <span>A fresh version of Atmos is ready.</span>
            <button onClick={() => void pwa.update()}>Update app</button>
          </div>
        )}
        <div className="hero-grid">
          <section
            className="current-card"
            aria-label="Current weather"
            aria-busy={loading}
          >
            <div className="current-top">
              <span className="eyebrow">
                <span className="live-dot" />
                {cached
                  ? 'SAVED FORECAST'
                  : loading
                    ? 'GETTING THE FORECAST'
                    : 'RIGHT HERE, RIGHT NOW'}
              </span>
              <div className="current-actions">
                <button
                  className="icon-button"
                  disabled={loading}
                  onClick={refresh}
                  aria-label="Refresh forecast"
                >
                  <RefreshCw size={17} className={loading ? 'spin' : ''} />
                </button>
                <button
                  className="icon-button"
                  onClick={savePlace}
                  aria-label={saved ? 'Remove saved place' : 'Save place'}
                  aria-pressed={saved}
                >
                  <Bookmark size={18} fill={saved ? 'currentColor' : 'none'} />
                </button>
                <button
                  className="icon-button"
                  disabled={!w}
                  onClick={() => void share()}
                  aria-label="Share forecast"
                >
                  <Share2 size={17} />
                </button>
              </div>
            </div>
            <div className="current-content">
              <div className="current-copy">
                <h2>
                  {detecting ? 'Finding your city…' : place.name}
                  <MapPin size={18} />
                </h2>
                <p className="country">
                  {place.country}
                  {place.source === 'ip' && ' · Approximate city (IP)'}
                </p>
                {w ? (
                  <>
                    <div className="temperature">
                      {temperature(w.current.temperature_2m, unit)}
                      <span>°</span>
                    </div>
                    <div className="condition">
                      <WeatherIcon
                        code={w.current.weather_code}
                        day={w.current.is_day}
                        size={22}
                      />
                      <span>{weatherLabel(w.current.weather_code)}</span>
                    </div>
                    <p className="high-low">
                      High {temperature(w.daily.temperature_2m_max[0], unit)}°{' '}
                      <span> / </span> Low{' '}
                      {temperature(w.daily.temperature_2m_min[0], unit)}°
                    </p>
                  </>
                ) : (
                  <div className="weather-empty">
                    <Cloud size={40} />
                    <h3>
                      {loading
                        ? detecting
                          ? 'Finding a forecast near you.'
                          : 'A fresh forecast is on its way.'
                        : 'Let’s try that again.'}
                    </h3>
                    <p>
                      {loading
                        ? 'Taking a quick look at the skies.'
                        : 'Refresh or choose another place.'}
                    </p>
                  </div>
                )}
              </div>
              <div
                className={`weather-art ${w && !w.current.is_day ? 'night' : ''}`}
                aria-hidden="true"
              >
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="art-sun" />
                <div className="art-cloud cloud-back" />
                <div className="art-cloud cloud-front" />
                <div className="art-horizon" />
                <span>
                  {w?.current.is_day === 0 ? 'AFTER HOURS' : 'A WORLD ABOVE'}
                </span>
              </div>
            </div>
            <div className="current-footer">
              <span>
                {snapshot
                  ? `${cached ? 'Saved' : 'Updated'} ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: w?.timezone }).format(snapshot.updatedAt)} · ${w ? formatTime(w.current.time, w.timezone) : ''} local time`
                  : 'Live weather from Open-Meteo'}
              </span>
              <span>°{unit}</span>
            </div>
          </section>
          <aside className="pwa-card">
            <span className="eyebrow">
              <Smartphone size={15} /> SMALL APP. MORE POSSIBILITIES.
            </span>
            <h2>
              Your forecast.
              <br />
              Anywhere you go.
            </h2>
            <p>
              A home on your screen. A forecast when the connection disappears.
            </p>
            <div className="pwa-features">
              <span>
                <Check size={15} /> Installable
              </span>
              <span>
                <Check size={15} /> Offline ready
              </span>
              <span>
                <Check size={15} /> No API key
              </span>
            </div>
            <button
              className="pwa-link"
              onClick={() => dialog.current?.showModal()}
            >
              Explore the app <ArrowRight size={18} />
            </button>
            <div className="pwa-art" aria-hidden="true">
              <div className="mini-phone">
                <span />
                <Sun size={25} />
                <strong>atmos.</strong>
                <div />
                <div />
              </div>
              <div className="mini-offline">
                <WifiOff size={18} />
              </div>
            </div>
          </aside>
        </div>
        {w && <Forecast weather={w} unit={unit} />}
        {!w && !loading && (
          <section className="panel empty-panel">
            <h2>No forecast yet</h2>
            <p>Check your connection, then refresh or search for a city.</p>
            <button className="button" onClick={refresh}>
              <RefreshCw size={16} /> Try again
            </button>
          </section>
        )}
        <section className="project-strip">
          <Code2 size={21} />
          <div>
            <strong>Thoughtfully built for the web.</strong>
            <p>
              React + TypeScript · Accessible by design · A progressive web app
            </p>
          </div>
          <a
            href="https://github.com/iseto/react-typescript-weather-app"
            target="_blank"
            rel="noreferrer"
          >
            Behind the build <ArrowUpRight size={16} />
          </a>
        </section>
      </main>
      <footer className="site-footer">
        <span>
          atmos. <span>Weather, thoughtfully.</span>
        </span>
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Weather data by Open-Meteo <ArrowUpRight size={12} />
        </a>
        <span>Made for a little more outside.</span>
      </footer>
      <div
        className={`toast ${notice ? 'visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        {notice}
      </div>
      <dialog
        ref={dialog}
        className="app-dialog"
        aria-labelledby="dialog-title"
      >
        <button
          className="icon-button dialog-close"
          aria-label="Close app details"
          onClick={() => dialog.current?.close()}
        >
          <X size={20} />
        </button>
        <div className="dialog-icon">
          <Smartphone size={28} />
        </div>
        <span className="eyebrow">THE WEB, WITH A LITTLE EXTRA</span>
        <h2 id="dialog-title">Meet your pocket forecast.</h2>
        <p>
          Atmos is a progressive web app: a website that can feel right at home
          on your device.
        </p>
        <div className="capability">
          <ArrowDownToLine size={22} />
          <div>
            <h3>Make it feel like an app</h3>
            <p>
              {pwa.installed
                ? 'You’re already using the installed app.'
                : pwa.canInstall
                  ? 'Install Atmos for a standalone window and quick access from your home screen.'
                  : 'On iPhone or iPad, open Safari → Share → Add to Home Screen. On other browsers, look for Install app in the browser menu. Installation requires HTTPS and browser support.'}
            </p>
          </div>
        </div>
        <div className="capability">
          <WifiOff size={22} />
          <div>
            <h3>Keep the forecast close</h3>
            <p>
              {pwa.offlineReady
                ? 'The app is cached and ready for offline use. Load a place once, then revisit its saved forecast without a connection.'
                : pwa.registrationError
                  ? 'Offline setup couldn’t complete. Reload on a secure connection to try again.'
                  : 'Offline caching becomes available after your first production visit. Forecasts you load are saved on this device.'}{' '}
              Saved forecasts show their timestamp and refresh when you
              reconnect.
            </p>
          </div>
        </div>
        <div className="capability">
          <Share2 size={22} />
          <div>
            <h3>Share a little perspective</h3>
            <p>
              Use the share button on a forecast to open your device’s share
              sheet, or copy a link when native sharing isn’t available.
            </p>
          </div>
        </div>
        <div className="capability">
          <ShieldCheck size={22} />
          <div>
            <h3>Your places stay on your device</h3>
            <p>
              On your first visit, or if device location is unavailable,
              ipwho.is estimates your city from your IP address. This is
              approximate and may reflect a VPN or network location. Your IP is
              visible to that provider; Atmos does not store it.
            </p>
            <p>
              No account needed. Saved places and preferences live in your
              browser. Location is requested only when you tap “Use my location”
              and coordinates are sent to Open-Meteo to retrieve weather.
            </p>
          </div>
        </div>
        {pwa.canInstall && !pwa.installed && (
          <button
            className="button primary"
            onClick={() =>
              void pwa
                .install()
                .catch(() =>
                  setNotice(
                    'Installation couldn’t start. Try your browser’s Install app menu.'
                  )
                )
            }
          >
            <ArrowDownToLine size={17} /> Install Atmos
          </button>
        )}
        <button
          className="button dialog-done"
          onClick={() => dialog.current?.close()}
        >
          Got it <Check size={16} />
        </button>
      </dialog>
    </div>
  )
}
