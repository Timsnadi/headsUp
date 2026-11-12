import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { TabLayout } from './app/TabLayout'
import { CoursesPage } from './features/courses/CoursesPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { TodayPage } from './features/schedule/TodayPage'
import { WeekPage } from './features/schedule/WeekPage'
import { registerPwaServiceWorker } from './services/pwa'
import { useThemeStore } from './store/themeStore'
import './App.css'

function AppShell() {
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const resolvedTheme = theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.style.colorScheme = resolvedTheme
  }, [theme])

  useEffect(() => {
    const updateSW = registerPwaServiceWorker()

    const handleUpdate = () => {
      setNeedsRefresh(true)
    }

    const handleOffline = () => {
      setOfflineReady(true)
    }

    window.addEventListener('app:needs-refresh', handleUpdate)
    window.addEventListener('app:offline-ready', handleOffline)

    return () => {
      window.removeEventListener('app:needs-refresh', handleUpdate)
      window.removeEventListener('app:offline-ready', handleOffline)
      void updateSW()
    }
  }, [])

  return (
    <>
      {needsRefresh ? (
        <div className="app-toast">
          <span>Update available</span>
          <button type="button" className="secondary-button" onClick={() => void registerPwaServiceWorker()()}>
            Refresh
          </button>
        </div>
      ) : null}

      {offlineReady ? <div className="app-toast success">Offline shell ready</div> : null}

      <Routes>
        <Route element={<TabLayout />}>
          <Route index element={<TodayPage />} />
          <Route path="/week" element={<WeekPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
