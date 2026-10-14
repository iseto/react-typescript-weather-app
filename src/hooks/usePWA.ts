import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
interface InstallEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
export function usePWA() {
  const [online, setOnline] = useState(navigator.onLine)
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
  const [installed, setInstalled] = useState(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      !!(navigator as Navigator & { standalone?: boolean }).standalone
  )
  const [registrationError, setRegistrationError] = useState(false)
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ onRegisterError: () => setRegistrationError(true) })
  useEffect(() => {
    const connection = () => setOnline(navigator.onLine)
    const install = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as InstallEvent)
    }
    const complete = () => {
      setInstalled(true)
      setInstallEvent(null)
    }
    window.addEventListener('online', connection)
    window.addEventListener('offline', connection)
    window.addEventListener('beforeinstallprompt', install)
    window.addEventListener('appinstalled', complete)
    return () => {
      window.removeEventListener('online', connection)
      window.removeEventListener('offline', connection)
      window.removeEventListener('beforeinstallprompt', install)
      window.removeEventListener('appinstalled', complete)
    }
  }, [])
  const install = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
  }
  return {
    online,
    installed,
    offlineReady,
    needRefresh,
    registrationError,
    canInstall: !!installEvent,
    install,
    update: () => updateServiceWorker(true),
  }
}
