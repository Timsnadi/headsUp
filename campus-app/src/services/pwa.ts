import { registerSW } from 'virtual:pwa-register'

export function registerPwaServiceWorker(): () => Promise<void> {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('app:needs-refresh'))
    },
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('app:offline-ready'))
    },
  })

  return updateSW
}
