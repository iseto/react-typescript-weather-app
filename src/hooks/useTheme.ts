import { useEffect, useState } from 'react'
import { readStorage, writeStorage } from '../lib/storage'
export type ThemePreference = 'system' | 'light' | 'dark'
const validPreference = (value: unknown): ThemePreference =>
  value === 'light' || value === 'dark' ? value : 'system'
export function useTheme() {
  const [preference, setPreference] = useState(() =>
    validPreference(readStorage<unknown>('atmos-theme', 'system'))
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const theme =
        preference === 'system'
          ? media.matches
            ? 'dark'
            : 'light'
          : preference
      document.documentElement.dataset.theme = theme
      document.documentElement.style.colorScheme = theme
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#121b17' : '#f6f7f2')
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [preference])
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === 'atmos-theme' || event.key === null)
        setPreference(
          validPreference(readStorage<unknown>('atmos-theme', 'system'))
        )
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])
  return {
    preference,
    changeTheme: (next: ThemePreference) => {
      setPreference(next)
      return writeStorage('atmos-theme', next)
    },
  }
}
