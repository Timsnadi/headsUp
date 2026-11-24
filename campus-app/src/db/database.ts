import Dexie, { type Table } from 'dexie'
import type {
  AppSetting,
  Assignment,
  Exam,
  GradeEntry,
  Lesson,
  Note,
  Unit,
} from '../types'
import { migrateLegacyUnitReference, migrateLegacyUnits } from './migrations'

class CampusDatabase extends Dexie {
  courses!: Table<Unit, string>
  lessons!: Table<Lesson, string>
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

    this.version(3)
      .stores({
        courses: 'id, code, semester, defaultMode, updatedAt',
        lessons: 'id, unitId, day, startTime, endTime',
        assignments: 'id, unitId, dueDate, status, updatedAt',
        exams: 'id, unitId, date, updatedAt',
        grades: 'id, unitId, updatedAt',
        notes: 'id, unitId, updatedAt',
        appSettings: 'key, updatedAt',
      })
      .upgrade(async (transaction) => {
        const courses = transaction.table('courses')
        const legacyRecords = (await courses.toArray()) as Record<string, unknown>[]
        const { units, lessons } = migrateLegacyUnits(legacyRecords)
        await courses.clear()
        await courses.bulkPut(units)
        await transaction.table('lessons').bulkPut(lessons)
        await Promise.all(
          (['assignments', 'exams', 'grades', 'notes'] as const).map((tableName) =>
            transaction.table(tableName).toCollection().modify((record: Record<string, unknown>) => {
              migrateLegacyUnitReference(record)
            }),
          ),
        )
      })
  }
}

export const db = new CampusDatabase()

export async function ensureDatabaseReady(): Promise<void> {
  await db.open()
}
