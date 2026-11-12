import Dexie, { type Table } from 'dexie'
import type {
  AppSetting,
  Assignment,
  Course,
  Exam,
  GradeEntry,
  Note,
} from '../types'

class CampusDatabase extends Dexie {
  courses!: Table<Course, string>
  assignments!: Table<Assignment, string>
  exams!: Table<Exam, string>
  grades!: Table<GradeEntry, string>
  notes!: Table<Note, string>
  appSettings!: Table<AppSetting, string>

  constructor() {
    super('campus-app-db')

    this.version(1).stores({
      courses:
        'id, code, semester, mode, updatedAt',
      assignments:
        'id, courseId, dueDate, status, updatedAt',
      exams:
        'id, courseId, date, updatedAt',
      grades:
        'id, courseId, updatedAt',
      notes:
        'id, courseId, updatedAt',
      appSettings:
        'key, updatedAt',
    })

    this.version(2)
      .stores({
        courses: 'id, code, semester, mode, updatedAt',
        assignments: 'id, courseId, dueDate, status, updatedAt',
        exams: 'id, courseId, date, updatedAt',
        grades: 'id, courseId, updatedAt',
        notes: 'id, courseId, updatedAt',
        appSettings: 'key, updatedAt',
      })
      .upgrade((transaction) =>
        transaction
          .table('courses')
          .toCollection()
          .modify((storedCourse: Record<string, unknown>) => {
            const legacyLocation =
              typeof storedCourse.location === 'string' ? storedCourse.location : ''

            if (storedCourse.mode === 'online') {
              storedCourse.meetingLink =
                typeof storedCourse.meetingLink === 'string'
                  ? storedCourse.meetingLink
                  : legacyLocation
            } else {
              storedCourse.building =
                typeof storedCourse.building === 'string'
                  ? storedCourse.building
                  : legacyLocation
              storedCourse.room =
                typeof storedCourse.room === 'string' ? storedCourse.room : ''
              storedCourse.meetingLink = ''
            }

            delete storedCourse.location
          }),
      )
  }
}

export const db = new CampusDatabase()

export async function ensureDatabaseReady(): Promise<void> {
  await db.open()
}
