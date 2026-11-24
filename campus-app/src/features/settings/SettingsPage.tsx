import { useEffect, useState } from 'react'
import { useThemeStore } from '../../store/themeStore'
import { isStoragePersisted, persistWebStorage } from '../../services/storage'
import { createBackup, parseBackupJson, importBackup, type BackupEnvelope } from '../../services/backup'
import {
  appSettingRepository,
  assignmentRepository,
  examRepository,
  lessonRepository,
  unitRepository,
} from '../../db/repositories'
import { createCalendar } from '../../services/calendar'
import { useRef } from 'react'

export function SettingsPage() {
  const { theme, setTheme } = useThemeStore()
  const [persisted, setPersisted] = useState(false)
  const [lastExport, setLastExport] = useState<string | null>(null)
  const [backupError, setBackupError] = useState('')
  const [importPreview, setImportPreview] = useState<BackupEnvelope | null>(null)
  const [importing, setImporting] = useState(false)
  const [semesterStartDate, setSemesterStartDate] = useState('')
  const [semesterEndDate, setSemesterEndDate] = useState('')
  const [reminderMinutes, setReminderMinutes] = useState('15')
  const [settingsMessage, setSettingsMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void (async () => {
      const stored = await isStoragePersisted()
      setPersisted(stored)
      const savedExport = await appSettingRepository.get('lastExport')
      setLastExport(savedExport?.value ?? null)
      const [start, end, reminder] = await Promise.all([
        appSettingRepository.get('semesterStartDate'),
        appSettingRepository.get('semesterEndDate'),
        appSettingRepository.get('reminderMinutes'),
      ])
      setSemesterStartDate(start?.value ?? '')
      setSemesterEndDate(end?.value ?? '')
      setReminderMinutes(reminder?.value ?? '15')
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

  const saveCalendarSettings = async () => {
    setSettingsMessage('')
    const minutes = Number(reminderMinutes)
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 10080) {
      setSettingsMessage('Reminder time must be between 0 and 10080 minutes.')
      return
    }
    if (semesterStartDate && semesterEndDate && semesterEndDate < semesterStartDate) {
      setSettingsMessage('Semester end date must be on or after the start date.')
      return
    }
    try {
      const updatedAt = new Date().toISOString()
      await Promise.all([
        appSettingRepository.put({ key: 'semesterStartDate', value: semesterStartDate, updatedAt }),
        appSettingRepository.put({ key: 'semesterEndDate', value: semesterEndDate, updatedAt }),
        appSettingRepository.put({ key: 'reminderMinutes', value: String(minutes), updatedAt }),
      ])
      setSettingsMessage('Calendar settings saved.')
    } catch {
      setSettingsMessage('Calendar settings could not be saved.')
    }
  }

  const exportCalendar = async () => {
    setSettingsMessage('')
    try {
      const [units, lessons, assignments, exams] = await Promise.all([
        unitRepository.list(),
        lessonRepository.list(),
        assignmentRepository.list(),
        examRepository.list(),
      ])
      const calendar = createCalendar({
        units,
        lessons,
        assignments,
        exams,
        semesterStartDate,
        semesterEndDate,
        reminderMinutes: Number(reminderMinutes),
      })
      const blob = new Blob([calendar], { type: 'text/calendar;charset=utf-8' })
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = 'headsUp-calendar.ics'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      setSettingsMessage(error instanceof Error ? error.message : 'Calendar could not be exported.')
    }
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
          <h2>Calendar and reminders</h2>
          <p>Reminders appear only while the app is open. Use Add to Calendar for alerts when it's closed.</p>
          <div className="form-grid">
            <label className="form-field">Semester start<input type="date" value={semesterStartDate} onChange={(event) => setSemesterStartDate(event.target.value)} /></label>
            <label className="form-field">Semester end<input type="date" value={semesterEndDate} onChange={(event) => setSemesterEndDate(event.target.value)} /></label>
          </div>
          <label className="form-field">Calendar alert (minutes before)<input type="number" min="0" max="10080" step="1" value={reminderMinutes} onChange={(event) => setReminderMinutes(event.target.value)} /></label>
          {settingsMessage ? <p role="status">{settingsMessage}</p> : null}
          <div className="backup-actions">
            <button type="button" className="secondary-button" onClick={() => void saveCalendarSettings()}>Save calendar settings</button>
            <button type="button" className="primary-button" onClick={() => void exportCalendar()}>Add to Calendar (.ics)</button>
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
                Units: importPreview.data.units.length,
                Lessons: importPreview.data.lessons.length,
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
