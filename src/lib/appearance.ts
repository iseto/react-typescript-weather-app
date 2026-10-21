export type ThemePreference = 'system' | 'light' | 'dark'
export type ContrastPreference = 'system' | 'standard' | 'more'
export interface Appearance {
  theme: ThemePreference
  contrast: ContrastPreference
  resolvedTheme: 'light' | 'dark'
  resolvedContrast: 'standard' | 'more'
  forcedColors: boolean
}
export const initialAppearance: Appearance = {
  theme: 'system',
  contrast: 'system',
  resolvedTheme: 'light',
  resolvedContrast: 'standard',
  forcedColors: false,
}
export function createAppearance(
  prefix: string,
  notify: (value: Appearance) => void
) {
  const dark = matchMedia('(prefers-color-scheme: dark)')
  const more = matchMedia('(prefers-contrast: more)')
  const forced = matchMedia('(forced-colors: active)')
  const read = (key: string) => {
    try {
      return JSON.parse(localStorage.getItem(`${prefix}-${key}`) || 'null')
    } catch {
      return null
    }
  }
  const validTheme = (value: unknown): ThemePreference =>
    value === 'light' || value === 'dark' ? value : 'system'
  const validContrast = (value: unknown): ContrastPreference =>
    value === 'standard' || value === 'more' ? value : 'system'
  let theme = validTheme(read('theme'))
  let contrast = validContrast(read('contrast'))
  const apply = () => {
    const state: Appearance = {
      theme,
      contrast,
      resolvedTheme:
        theme === 'system' ? (dark.matches ? 'dark' : 'light') : theme,
      resolvedContrast:
        contrast === 'system' ? (more.matches ? 'more' : 'standard') : contrast,
      forcedColors: forced.matches,
    }
    const root = document.documentElement
    root.dataset.theme = state.resolvedTheme
    root.dataset.contrast = state.resolvedContrast
    root.style.colorScheme = state.resolvedTheme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        'content',
        state.resolvedTheme === 'dark' ? '#121b17' : '#f6f7f2'
      )
    notify(state)
  }
  const sync = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === `${prefix}-theme` ||
      event.key === `${prefix}-contrast`
    ) {
      theme = validTheme(read('theme'))
      contrast = validContrast(read('contrast'))
      apply()
    }
  }
  for (const media of [dark, more, forced])
    media.addEventListener('change', apply)
  window.addEventListener('storage', sync)
  apply()
  return {
    changeTheme(value: ThemePreference) {
      theme = validTheme(value)
      return save('theme', theme)
    },
    changeContrast(value: ContrastPreference) {
      contrast = validContrast(value)
      return save('contrast', contrast)
    },
    destroy() {
      for (const media of [dark, more, forced])
        media.removeEventListener('change', apply)
      window.removeEventListener('storage', sync)
    },
  }
  function save(key: string, value: string) {
    let saved = true
    try {
      localStorage.setItem(`${prefix}-${key}`, JSON.stringify(value))
    } catch {
      saved = false
    }
    apply()
    return saved
  }
}
