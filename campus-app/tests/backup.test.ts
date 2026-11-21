import { describe, expect, it } from 'vitest'
import { BACKUP_SCHEMA_VERSION, parseBackupJson, type BackupEnvelope } from '../src/services/backup'

function validBackup(): BackupEnvelope {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: '2026-11-21T12:00:00.000Z',
    data: {
      courses: [{
        id: 'course-1',
        name: 'Physics',
        code: 'PHY101',
        instructor: 'Dr. Smith',
        color: '#343633',
        mode: 'in-person',
        building: 'Science',
        room: '204',
        meetingLink: '',
        meetingDays: ['Monday'],
        startTime: '09:00',
        endTime: '10:00',
        semester: 'Fall',
        updatedAt: '2026-11-21T12:00:00.000Z',
      }],
      assignments: [{
        id: 'assignment-1',
        courseId: 'course-1',
        title: 'Lab report',
        dueDate: '2026-11-22T12:00:00.000Z',
        status: 'upcoming',
        priority: 'high',
        notes: 'Include the graph.',
        updatedAt: '2026-11-21T12:00:00.000Z',
      }],
      exams: [],
      grades: [],
      notes: [],
      settings: [],
      theme: 'system',
    },
  }
}

describe('backup JSON', () => {
  it('round trips a valid export', () => {
    const backup = validBackup()
    const parsed = parseBackupJson(JSON.stringify(backup))

    expect(parsed.schemaVersion).toBe(BACKUP_SCHEMA_VERSION)
    expect(parsed.data).toEqual(backup.data)
  })

  it('rejects malformed JSON safely', () => {
    expect(() => parseBackupJson('{not-json')).toThrow('not valid JSON')
  })

  it('rejects unsupported schema versions', () => {
    const backup = validBackup()
    backup.schemaVersion = BACKUP_SCHEMA_VERSION + 1
    expect(() => parseBackupJson(JSON.stringify(backup))).toThrow('unsupported')
  })

  it('rejects invalid assignment records', () => {
    const backup = validBackup()
    backup.data.assignments = [{ id: 'broken' } as never]
    expect(() => parseBackupJson(JSON.stringify(backup))).toThrow('Invalid backup')
  })
})
