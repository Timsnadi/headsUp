import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { TabLayout } from './app/TabLayout'
import { CoursesPage } from './features/courses/CoursesPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { TodayPage } from './features/schedule/TodayPage'
import { WeekPage } from './features/schedule/WeekPage'
import { AssignmentsPage } from './features/assignments/AssignmentsPage'
import { ExamsPage } from './features/exams/ExamsPage'
import { ensureDatabaseReady } from './db/database'
import { registerPwaServiceWorker } from './services/pwa'
import { useThemeStore } from './store/themeStore'
import './App.css'

function AppShell() {
  const [bootState, setBootState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [bootAttempt, setBootAttempt] = useState(0)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const theme = useThemeStore((state) => state.theme)

  useEffect(() => {
    let active = true

    async function openLocalDatabase() {
      setBootState('loading')
      try {
        await Promise.all([
          ensureDatabaseReady(),
          new Promise<void>((resolve) => window.setTimeout(resolve, 420)),
        ])
        if (active) {
          setBootState('ready')
        }
      } catch {
        if (active) {
          setBootState('error')
        }
      }
    }

    void openLocalDatabase()
    return () => {
      active = false
    }
  }, [bootAttempt])

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

  if (bootState === 'loading') {
    return (
      <main className="app-loading" aria-label="Loading headsUp">
        <div className="loading-brand">
          <div className="loading-mark" aria-hidden="true">
            <img src="/icons/icon.svg" alt="" />
          </div>
          <p className="loading-title">headsUp</p>
          <p className="loading-caption">Getting your campus ready</p>
          <div className="loading-indicator" role="status" aria-label="Loading">
            <span />
            <span />
            <span />
          </div>
        </div>
      </main>
    )
  }

  if (bootState === 'error') {
    return (
      <main className="app-loading">
        <section className="app-boot-error" role="alert">
          <h1>Couldn’t open your local data</h1>
          <p>Your device storage wasn’t available. Please retry to open headsUp.</p>
          <button
            type="button"
            className="primary-button"
            onClick={() => setBootAttempt((attempt) => attempt + 1)}
          >
            Try again
          </button>
        </section>
      </main>
    )
  }

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
          <Route path="/assignments" element={<AssignmentsPage />} />
          <Route path="/exams" element={<ExamsPage />} />
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
