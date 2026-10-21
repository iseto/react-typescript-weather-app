import { useEffect, useRef, useState } from 'react'
import {
  createAppearance,
  initialAppearance,
  type Appearance,
} from './appearance'
import type { ThemePreference, ContrastPreference } from './appearance'
export function useAppearance(prefix: string) {
  const [appearance, setAppearance] = useState<Appearance>(initialAppearance)
  const controller = useRef<ReturnType<typeof createAppearance> | null>(null)
  useEffect(() => {
    const active = createAppearance(prefix, setAppearance)
    controller.current = active
    return () => {
      active.destroy()
      controller.current = null
    }
  }, [prefix])
  return {
    ...appearance,
    changeTheme: (value: ThemePreference) =>
      controller.current?.changeTheme(value) ?? false,
    changeContrast: (value: ContrastPreference) =>
      controller.current?.changeContrast(value) ?? false,
  }
}
