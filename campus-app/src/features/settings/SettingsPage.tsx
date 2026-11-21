import { useEffect, useState } from 'react'
import { useThemeStore } from '../../store/themeStore'
import { isStoragePersisted, persistWebStorage } from '../../services/storage'
import { createBackup, parseBackupJson, importBackup, type BackupEnvelope } from '../../services/backup'
import { appSettingRepository } from '../../db/repositories'
import { useRef } from 'react'

export function SettingsPage() {
  const { theme, setTheme } = useThemeStore()
  const [persisted, setPersisted] = useState(false)
  const [lastExport, setLastExport] = useState<string | null>(null)
  const [backupError, setBackupError] = useState('')
  const [importPreview, setImportPreview] = useState<BackupEnvelope | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void (async () => {
      const stored = await isStoragePersisted()
      setPersisted(stored)
      const savedExport = await appSettingRepository.get('lastExport')
      setLastExport(savedExport?.value ?? null)
    })()
  }, [])

  const handlePersist = async () => {
    setPersisted(await persistWebStorage())
  }

  const exportData = async () => {
    setBackupError('')
    try {
      const backup = await createBackup()
      const now = new Date().toISOString()
      await appSettingRepository.put({
        key: 'lastExport',
        value: now,
        updatedAt: now,
      })
      setLastExport(now)
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `headsUp-backup-${now.slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setBackupError('The backup could not be created.')
    }
  }

  const readImport = async (file: File) => {
    setBackupError('')
    try {
      const preview = parseBackupJson(await file.text())
      setImportPreview(preview)
    } catch (error) {
      setImportPreview(null)
      setBackupError(error instanceof Error ? error.message : 'This backup could not be read.')
    }
  }

  const applyImport = async (mode: 'replace' | 'merge') => {
    if (!importPreview) return
    setImporting(true)
    setBackupError('')
    try {
      await importBackup(importPreview, mode)
      setImportPreview(null)
      window.location.reload()
    } catch {
      setBackupError('Import failed. No data was partially changed.')
    } finally {
      setImporting(false)
    }
  }

  const exportAgeDays = lastExport
    ? Math.floor((Date.now() - new Date(lastExport).getTime()) / 86_400_000)
    : null

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
        <article className="settings-card">
          <h2>Backup</h2>
          <p>
            {lastExport
              ? `Last export: ${new Date(lastExport).toLocaleString()}`
              : 'No backup has been exported from this device.'}
          </p>
          {exportAgeDays !== null && exportAgeDays > 14 ? (
            <p className="backup-reminder">It has been more than 14 days. Export a fresh backup.</p>
          ) : null}
          {backupError ? <p className="form-error" role="alert">{backupError}</p> : null}
          <div className="backup-actions">
            <button type="button" className="secondary-button" onClick={() => void exportData()}>Export JSON</button>
            <button type="button" className="secondary-button" onClick={() => fileInput.current?.click()}>Import JSON</button>
            <input
              ref={fileInput}
              className="visually-hidden"
              type="file"
              accept=".json,application/json"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void readImport(file)
                event.target.value = ''
              }}
            />
          </div>
        </article>
      </div>
      {importPreview ? (
        <div className="sheet-backdrop" role="presentation">
          <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="import-title">
            <div className="sheet-handle" />
            <div className="sheet-header"><div><p className="eyebrow">Import backup</p><h2 id="import-title">Review contents</h2></div></div>
            <div className="import-summary">
              {Object.entries({
                Courses: importPreview.data.courses.length,
                Assignments: importPreview.data.assignments.length,
                Exams: importPreview.data.exams.length,
                Grades: importPreview.data.grades.length,
                Notes: importPreview.data.notes.length,
                Settings: importPreview.data.settings.length,
              }).map(([label, count]) => <div key={label}><span>{label}</span><strong>{count}</strong></div>)}
            </div>
            <p className="backup-warning">Replace removes existing data. Merge keeps existing records and updates matching IDs.</p>
            <div className="sheet-actions">
              <button type="button" className="secondary-button" onClick={() => setImportPreview(null)} disabled={importing}>Cancel</button>
              <button type="button" className="secondary-button" onClick={() => void applyImport('merge')} disabled={importing}>Merge</button>
              <button type="button" className="primary-button" onClick={() => void applyImport('replace')} disabled={importing}>{importing ? 'Importing…' : 'Replace'}</button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
