# Rain radar

Atmos displays recent precipitation observations for the selected city using the [RainViewer Weather Maps API](https://www.rainviewer.com/api/weather-maps-api.html), [Leaflet](https://leafletjs.com/), and the [OpenStreetMap standard tile layer](https://operations.osmfoundation.org/policies/tiles/).

## Data behavior

- The browser requests RainViewer's public manifest and keeps the five newest past frames returned by the service.
- Radar uses the Universal Blue palette, zoom levels 3–7, and a 900 ms animation interval. Playback starts only after the user asks for it.
- The displayed time is the radar frame time in the selected place's timezone. It is an observation timestamp, not a forecast time or retrieval time.
- Changing places recenters the existing map and does not trigger a separate weather request.

## Failure and offline behavior

Radar is an optional enhancement. Manifest failures and timeouts stay inside the radar panel and do not affect current conditions, forecasts, saved places, or the activity planner. If a refresh fails after radar has loaded, Atmos keeps the previous frame and labels it accordingly.

The PWA does not prefetch or package map and radar tiles for offline use. When the browser goes offline, an already loaded frame remains on screen when available; otherwise the panel explains that radar needs a connection. This respects OpenStreetMap's prohibition on bulk and offline tile downloading.

## Privacy and attribution

Radar and map tile providers receive ordinary browser requests for the visible map tiles, which reveal the viewed geographic area and the site's referrer. Atmos does not send saved-place lists or device-location metadata to those providers. OpenStreetMap and RainViewer attribution remains visible on the map.
