export interface RadarFrame {
  time: number
  path: string
}

export interface RadarFrames {
  generated: number
  host: string
  frames: RadarFrame[]
}

const isSafeHost = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function parseRadarFrames(value: unknown): RadarFrames | null {
  if (!value || typeof value !== 'object') return null
  const data = value as {
    generated?: unknown
    host?: unknown
    radar?: { past?: unknown }
  }
  if (
    !Number.isFinite(data.generated) ||
    !isSafeHost(data.host) ||
    !Array.isArray(data.radar?.past)
  )
    return null

  const frames = data.radar.past.filter(
    (frame): frame is RadarFrame =>
      !!frame &&
      typeof frame === 'object' &&
      Number.isFinite((frame as RadarFrame).time) &&
      typeof (frame as RadarFrame).path === 'string' &&
      /^\/v2\/radar\/[a-f0-9]+$/.test((frame as RadarFrame).path)
  )
  if (!frames.length) return null

  return {
    generated: data.generated as number,
    host: data.host,
    frames: frames.sort((a, b) => a.time - b.time).slice(-5),
  }
}

export async function fetchRadarFrames(signal: AbortSignal) {
  const response = await fetch(
    'https://api.rainviewer.com/public/weather-maps.json',
    { signal }
  )
  if (!response.ok)
    throw new Error(`Radar service returned ${response.status}.`)
  const frames = parseRadarFrames(await response.json())
  if (!frames) throw new Error('Radar service returned incomplete data.')
  return frames
}

export const radarTileUrl = (host: string, path: string) =>
  `${host}${path}/256/{z}/{x}/{y}/2/1_1.png`
