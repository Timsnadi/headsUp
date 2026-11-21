import { db } from '../db/database'
import type {
  AppSetting,
  Assignment,
  Course,
  Exam,
  GradeEntry,
  Note,
  ThemeMode,
} from '../types'

export const BACKUP_SCHEMA_VERSION = 1

export type BackupData = {
  courses: Course[]
  assignments: Assignment[]
  exams: Exam[]
  grades: GradeEntry[]
  notes: Note[]
  settings: AppSetting[]
  theme: ThemeMode
}

export type BackupEnvelope = {
  schemaVersion: number
  exportedAt: string
  data: BackupData
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isString = (value: unknown): value is string => typeof value === 'string'

function validateArray(value: unknown, name: string, validate: (item: unknown) => boolean): unknown[] {
  if (!Array.isArray(value) || !value.every(validate)) {
    throw new Error(`Invalid backup: "${name}" contains invalid records.`)
  }
  return value
}

export function parseBackupJson(json: string): BackupEnvelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('The selected file is not valid JSON.')
  }
  if (!isObject(parsed) || parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error('This backup format is unsupported.')
  }
  if (!isString(parsed.exportedAt) || !isObject(parsed.data)) {
    throw new Error('The selected file is missing backup metadata.')
  }

  const data = parsed.data
  const requiredStrings = (item: unknown, keys: string[]) =>
    isObject(item) && keys.every((key) => isString(item[key]))

  validateArray(data.courses, 'courses', (item) => requiredStrings(item, ['id', 'name', 'code', 'mode', 'updatedAt']))
  validateArray(data.assignments, 'assignments', (item) => requiredStrings(item, ['id', 'courseId', 'title', 'dueDate', 'status', 'priority', 'updatedAt']))
  validateArray(data.exams, 'exams', (item) => requiredStrings(item, ['id', 'courseId', 'title', 'date', 'time', 'location', 'updatedAt']))
  validateArray(data.grades, 'grades', (item) => requiredStrings(item, ['id', 'courseId', 'title', 'updatedAt']))
  validateArray(data.notes, 'notes', (item) => requiredStrings(item, ['id', 'courseId', 'title', 'body', 'updatedAt']))
  validateArray(data.settings, 'settings', (item) => requiredStrings(item, ['key', 'value', 'updatedAt']))

  if (!['system', 'light', 'dark'].includes(String(data.theme))) {
    throw new Error('The selected backup contains an invalid theme preference.')
  }

  return parsed as unknown as BackupEnvelope
}

export async function createBackup(): Promise<BackupEnvelope> {
  const [courses, assignments, exams, grades, notes, settings] = await Promise.all([
    db.courses.toArray(),
    db.assignments.toArray(),
    db.exams.toArray(),
    db.grades.toArray(),
    db.notes.toArray(),
    db.appSettings.toArray(),
  ])
  let theme: ThemeMode = 'system'
  try {
    const persisted = JSON.parse(localStorage.getItem('campus-theme-preference') ?? '{}') as { state?: { theme?: ThemeMode } }
    if (persisted.state?.theme) theme = persisted.state.theme
  } catch {
    theme = 'system'
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: { courses, assignments, exams, grades, notes, settings, theme },
  }
}

export async function importBackup(envelope: BackupEnvelope, mode: 'replace' | 'merge'): Promise<void> {
  await db.transaction(
    'rw',
    [db.courses, db.assignments, db.exams, db.grades, db.notes, db.appSettings],
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.courses.clear(),
          db.assignments.clear(),
          db.exams.clear(),
          db.grades.clear(),
          db.notes.clear(),
          db.appSettings.clear(),
        ])
      }
      await Promise.all([
        db.courses.bulkPut(envelope.data.courses),
        db.assignments.bulkPut(envelope.data.assignments),
        db.exams.bulkPut(envelope.data.exams),
        db.grades.bulkPut(envelope.data.grades),
        db.notes.bulkPut(envelope.data.notes),
        db.appSettings.bulkPut(envelope.data.settings),
      ])
    },
  )
  localStorage.setItem(
    'campus-theme-preference',
    JSON.stringify({ state: { theme: envelope.data.theme }, version: 0 }),
  )
}
