# Atmos — Weather, thoughtfully.

A minimalist, responsive weather dashboard built with React and TypeScript. A portfolio project demonstrating asynchronous API integration, accessible interactions, data visualization, and progressive web app capabilities.

## Run locally

Requires Node.js 22.12+ (Node 24 LTS recommended).

```sh
npm ci
npm run dev
```

No API key or environment variables are required. Weather and city search use [Open-Meteo](https://open-meteo.com/). The free endpoint is for non-commercial use; review its terms before commercial deployment.

## Features

- Current conditions, 24-hour forecast and temperature trend, seven-day temperature ranges, sunrise/sunset, humidity, wind, and daily peak UV.
- City search with debouncing, request cancellation, keyboard navigation, loading states, and useful errors.
- Approximate IP-based default city on first visit, with IP fallback when device location is denied or unavailable. Returning visitors keep their last selected city; shared links take priority.
- Explicit opt-in geolocation, persistent Celsius/Fahrenheit preferences, and up to eight saved places.
- A suggested outdoor hour based on daylight, temperature (8–28°C), precipitation probability below 30%, and weather code. This is a simple forecast heuristic, not a safety recommendation.
- Weather times and dates use the selected place’s timezone. Wind is in km/h in either temperature mode.
- Responsive layouts, semantic HTML, visible focus, reduced-motion support, accessible search and a native modal dialog.

## PWA capabilities

Build and serve the production app to test the service worker:

```sh
npm run build
npm run preview
```

- **Install:** web manifest, standalone display, maskable icons, desktop/Android install prompt when available, and manual Safari instructions. Availability depends on browser support and HTTPS (localhost is allowed).
- **Offline:** Workbox precaches the app shell. Successfully fetched forecasts are validated and stored locally by coordinates, along with retrieval timestamps. Previously loaded forecasts remain accessible offline; fresh weather and city search need connectivity. Data refreshes when the connection returns. Cached data may be old: the UI explicitly labels it.
- **Share:** native Web Share where supported; clipboard fallback otherwise. Shared URLs contain coordinates and a place label and open the same place’s forecast.
- **Updates:** a user-controlled update banner when a new service worker version is ready.

Device geolocation is requested only after user interaction. Approximate city lookup uses [ipwho.is](https://ipwhois.io/documentation) over HTTPS on first visit and when device location fails. The provider sees the visitor’s IP address; the app requests only city, country and coordinates and does not store raw IP addresses. A five-second timeout, malformed responses, rate limits, and connectivity failures fall back to Berlin on first visit or retain the current selected city on a failed location request. VPNs and network routing can make the estimate inaccurate. The provider’s free tier has a shared per-domain daily request limit; see its documentation before high-traffic deployment. Coordinates are sent to Open-Meteo for forecasts. Saved places, preferences, and forecasts are stored in localStorage on the current device; clearing browser data removes them. Browser storage restrictions can prevent persistence. No push notifications or background weather monitoring are implemented; those require additional infrastructure and permission design.

The service worker is disabled in development. Google Fonts is an optional progressive enhancement with system font fallbacks; the app shell and weather icons do not depend on remote image assets. Deploy `dist/` to an HTTPS static host with SPA fallback. For subdirectory hosting, set Vite’s `base` before building; the manifest and precache paths follow that base.

## Quality checks

```sh
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests run against the production preview with deterministic API fixtures. They cover mobile overflow, city selection, temperature preferences, saved places, share links, errors, and offline reload after service-worker activation. Unit tests cover weather validation, conversions, timezone formatting, outdoor suggestions, and defensive browser storage.

## Stack

React 19 · TypeScript 6 · Vite 8 · Lucide icons · CSS · Workbox / vite-plugin-pwa · ESLint flat config · Vitest · Playwright.

## Automated dependency maintenance

Weekly Dependabot updates and daily full dependency audits are configured.
See [automation schedules and notification behavior](docs/AUTOMATIONS.md).
