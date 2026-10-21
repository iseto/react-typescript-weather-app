import { useAppearance } from '../lib/useAppearance'
export type { ThemePreference, ContrastPreference } from '../lib/appearance'
export function useTheme() {
  const appearance = useAppearance('atmos')
  return { ...appearance, preference: appearance.theme }
}
