import { useEffect, useRef, useState } from 'react'
import { Search, X, MapPin, LoaderCircle } from 'lucide-react'
import { searchPlaces, type Place } from '../lib/weather'
export function PlaceSearch({ onSelect }: { onSelect: (p: Place) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [active, setActive] = useState(-1)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const controller = new AbortController()
    if (query.trim().length < 2) return
    const timer = setTimeout(() => {
      searchPlaces(query.trim(), controller.signal)
        .then((places) => {
          setResults(places)
          setStatus(places.length ? '' : 'No places found. Try another city.')
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setStatus('Search unavailable. Check your connection.')
        })
        .finally(() => {
          if (!controller.signal.aborted) setBusy(false)
        })
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])
  useEffect(() => {
    const dismiss = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [])
  const updateQuery = (value: string) => {
    setQuery(value)
    setResults([])
    setActive(-1)
    setStatus('')
    setBusy(value.trim().length >= 2)
  }
  const select = (place: Place) => {
    onSelect(place)
    updateQuery('')
    setOpen(false)
  }
  const expanded = open && query.trim().length >= 2
  return (
    <div className="search" ref={root}>
      <Search size={18} aria-hidden="true" />
      <input
        aria-label="Search for a city"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? 'place-results' : undefined}
        aria-activedescendant={active >= 0 ? `place-${active}` : undefined}
        placeholder="Find a city…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          updateQuery(e.target.value)
          setOpen(true)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => Math.min(i + 1, results.length - 1))
            setOpen(true)
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          }
          if (e.key === 'Enter' && results[active >= 0 ? active : 0])
            select(results[active >= 0 ? active : 0])
        }}
      />
      {query && (
        <button
          className="icon-button clear-search"
          aria-label="Clear search"
          onClick={() => updateQuery('')}
        >
          <X size={16} />
        </button>
      )}
      {expanded && (
        <div className="search-results">
          <div role="listbox" id="place-results" aria-label="Cities">
            {results.map((p, i) => (
              <button
                role="option"
                aria-selected={i === active}
                id={`place-${i}`}
                className={i === active ? 'active' : ''}
                key={`${p.latitude},${p.longitude}`}
                onClick={() => select(p)}
              >
                <MapPin size={17} />
                <span>
                  <strong>{p.name}</strong>
                  <small>
                    {[p.admin1, p.country].filter(Boolean).join(', ')}
                  </small>
                </span>
              </button>
            ))}
          </div>
          {busy && (
            <p role="status">
              <LoaderCircle size={16} className="spin" /> Searching…
            </p>
          )}
          {status && <p role="status">{status}</p>}
        </div>
      )}
    </div>
  )
}
