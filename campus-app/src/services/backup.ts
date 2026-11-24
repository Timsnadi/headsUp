import { appDataRepository, type RepositorySnapshot } from '../db/repositories'
import { migrateLegacyUnitReference, migrateLegacyUnits } from '../db/migrations'
import type { ThemeMode } from '../types'

export const BACKUP_SCHEMA_VERSION = 2

export type BackupData = RepositorySnapshot & {
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

function requiredStrings(item: unknown, keys: string[]): boolean {
  return isObject(item) && keys.every((key) => isString(item[key]))
}

function normalizeLegacyBackup(data: Record<string, unknown>): RepositorySnapshot {
  const { units, lessons } = migrateLegacyUnits(data.courses as unknown[])
  const migrateReferences = (records: unknown, name: string): Record<string, unknown>[] =>
    validateArray(records, name, (item) => isObject(item)).map((item) => {
      if (!isObject(item)) throw new Error(`Invalid backup: "${name}" contains invalid records.`)
      const record = { ...item }
      migrateLegacyUnitReference(record)
      return record
    })

  return {
    units,
    lessons,
    assignments: migrateReferences(data.assignments, 'assignments') as RepositorySnapshot['assignments'],
    exams: migrateReferences(data.exams, 'exams') as RepositorySnapshot['exams'],
    grades: migrateReferences(data.grades, 'grades') as RepositorySnapshot['grades'],
    notes: migrateReferences(data.notes, 'notes') as RepositorySnapshot['notes'],
    settings: validateArray(data.settings, 'settings', (item) =>
      requiredStrings(item, ['key', 'value', 'updatedAt']),
    ) as RepositorySnapshot['settings'],
  }
}

function validateCurrentData(data: Record<string, unknown>): RepositorySnapshot {
  validateArray(data.units, 'units', (item) =>
    requiredStrings(item, ['id', 'name', 'code', 'color', 'defaultMode', 'semester', 'updatedAt']),
  )
  const lessons = validateArray(data.lessons, 'lessons', (item) =>
    requiredStrings(item, [
      'id', 'unitId', 'day', 'startTime', 'endTime', 'type', 'mode', 'location', 'meetingLink',
    ]),
  )
  if (!lessons.every((lesson) => isObject(lesson) && ['physical', 'online'].includes(String(lesson.mode)) &&
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].includes(String(lesson.day)))) {
    throw new Error('Invalid backup: "lessons" contains invalid records.')
  }
  validateArray(data.assignments, 'assignments', (item) =>
    requiredStrings(item, ['id', 'unitId', 'title', 'dueDate', 'status', 'priority', 'updatedAt']),
  )
  validateArray(data.exams, 'exams', (item) =>
    requiredStrings(item, ['id', 'unitId', 'title', 'date', 'time', 'location', 'updatedAt']),
  )
  validateArray(data.grades, 'grades', (item) =>
    requiredStrings(item, ['id', 'unitId', 'title', 'updatedAt']),
  )
  validateArray(data.notes, 'notes', (item) =>
    requiredStrings(item, ['id', 'unitId', 'title', 'body', 'updatedAt']),
  )
  validateArray(data.settings, 'settings', (item) =>
    requiredStrings(item, ['key', 'value', 'updatedAt']),
  )
  return data as unknown as RepositorySnapshot
}

export function parseBackupJson(json: string): BackupEnvelope {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('The selected file is not valid JSON.')
  }
  if (!isObject(parsed) || ![1, BACKUP_SCHEMA_VERSION].includes(Number(parsed.schemaVersion))) {
    throw new Error('This backup format is unsupported.')
  }
  if (!isString(parsed.exportedAt) || !isObject(parsed.data)) {
    throw new Error('The selected file is missing backup metadata.')
  }

  const data = parsed.data
  if (!['system', 'light', 'dark'].includes(String(data.theme))) {
    throw new Error('The selected backup contains an invalid theme preference.')
  }

  let normalized: RepositorySnapshot
  if (parsed.schemaVersion === 1) {
    validateArray(data.courses, 'courses', (item) =>
      requiredStrings(item, ['id', 'name', 'code', 'mode', 'updatedAt']),
    )
    normalized = normalizeLegacyBackup(data)
  } else {
    normalized = validateCurrentData(data)
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: parsed.exportedAt,
    data: { ...normalized, theme: data.theme as ThemeMode },
  }
}

export async function createBackup(): Promise<BackupEnvelope> {
  const data = await appDataRepository.snapshot()
  let theme: ThemeMode = 'system'
  try {
    const persisted: unknown = JSON.parse(localStorage.getItem('campus-theme-preference') ?? '{}')
    if (isObject(persisted) && isObject(persisted.state) &&
      ['system', 'light', 'dark'].includes(String(persisted.state.theme))) {
      theme = persisted.state.theme as ThemeMode
    }
  } catch {
    theme = 'system'
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: { ...data, theme },
  }
}

export async function importBackup(envelope: BackupEnvelope, mode: 'replace' | 'merge'): Promise<void> {
  const { theme, ...data } = envelope.data
  await appDataRepository.import(data, mode)
  localStorage.setItem(
    'campus-theme-preference',
    JSON.stringify({ state: { theme }, version: 0 }),
  )
}
