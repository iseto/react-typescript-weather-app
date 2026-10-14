import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from 'lucide-react'
export function WeatherIcon({
  code,
  day = 1,
  size = 26,
}: {
  code: number
  day?: number
  size?: number
}) {
  const Icon =
    code === 0
      ? day
        ? Sun
        : Moon
      : code <= 2
        ? day
          ? CloudSun
          : CloudMoon
        : code === 3
          ? Cloud
          : code <= 48
            ? CloudFog
            : code <= 57
              ? CloudDrizzle
              : code <= 67
                ? CloudRain
                : code <= 77
                  ? CloudSnow
                  : code <= 82
                    ? CloudRain
                    : code <= 86
                      ? CloudSnow
                      : CloudLightning
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" />
}
