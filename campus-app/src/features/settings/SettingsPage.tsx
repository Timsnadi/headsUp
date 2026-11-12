import { useEffect, useState } from 'react'
import { useThemeStore } from '../../store/themeStore'
import { isStoragePersisted, persistWebStorage } from '../../services/storage'

export function SettingsPage() {
  const { theme, setTheme } = useThemeStore()
  const [persisted, setPersisted] = useState(false)

  useEffect(() => {
    void (async () => {
      const stored = await isStoragePersisted()
      setPersisted(stored)
    })()
  }, [])

  const handlePersist = async () => {
    setPersisted(await persistWebStorage())
  }

  return (
    <section className="page-panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Personalization</h1>
        </div>
      </div>

      <div className="stack-list">
        <article className="settings-card">
          <h2>Appearance</h2>
          <div className="segmented-control" role="radiogroup" aria-label="Theme preference">
            {(['system', 'light', 'dark'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={theme === option ? 'segment active' : 'segment'}
                onClick={() => setTheme(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </article>

        <article className="settings-card">
          <h2>Storage</h2>
          <p>{persisted ? 'Persistent storage enabled.' : 'Persistent storage is off.'}</p>
          <button type="button" className="secondary-button" onClick={handlePersist}>
            Enable offline persistence
          </button>
        </article>

        <article className="settings-card">
          <h2>Data safety</h2>
          <p>
            This app stores your data locally on your device. Export a backup regularly to keep
            copies of your semester and class tracking.
          </p>
        </article>
      </div>
    </section>
  )
}
