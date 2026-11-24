import type {
  AppSetting,
  Assignment,
  Exam,
  GradeEntry,
  Lesson,
  Note,
  Unit,
} from '../types'
import { db } from './database'

export const unitRepository = {
  list: async (): Promise<Unit[]> => db.courses.orderBy('updatedAt').reverse().toArray(),
  put: async (unit: Unit): Promise<string> => db.courses.put(unit),
  saveWithLessons: async (unit: Unit, lessons: Lesson[]): Promise<void> => {
    await db.transaction('rw', db.courses, db.lessons, async () => {
      await db.courses.put(unit)
      await db.lessons.where('unitId').equals(unit.id).delete()
      await db.lessons.bulkPut(lessons)
    })
  },
  remove: async (id: string): Promise<void> => {
    await db.transaction(
      'rw',
      [db.courses, db.lessons, db.assignments, db.exams, db.grades, db.notes],
      async () => {
        await Promise.all([
          db.courses.delete(id),
          db.lessons.where('unitId').equals(id).delete(),
          db.assignments.where('unitId').equals(id).delete(),
          db.exams.where('unitId').equals(id).delete(),
          db.grades.where('unitId').equals(id).delete(),
          db.notes.where('unitId').equals(id).delete(),
        ])
      },
    )
  },
}

export const lessonRepository = {
  list: async (): Promise<Lesson[]> => db.lessons.toArray(),
  listForUnit: async (unitId: string): Promise<Lesson[]> =>
    db.lessons.where('unitId').equals(unitId).toArray(),
  put: async (lesson: Lesson): Promise<string> => db.lessons.put(lesson),
  putMany: async (lessons: Lesson[]): Promise<void> => {
    await db.lessons.bulkPut(lessons)
  },
  remove: async (id: string): Promise<void> => {
    await db.lessons.delete(id)
  },
  removeForUnit: async (unitId: string): Promise<void> => {
    await db.lessons.where('unitId').equals(unitId).delete()
  },
  replaceForUnit: async (unitId: string, lessons: Lesson[]): Promise<void> => {
    await db.transaction('rw', db.lessons, async () => {
      await db.lessons.where('unitId').equals(unitId).delete()
      await db.lessons.bulkPut(lessons)
    })
  },
}

export const assignmentRepository = {
  list: async (): Promise<Assignment[]> => db.assignments.orderBy('dueDate').toArray(),
  put: async (assignment: Assignment): Promise<string> => db.assignments.put(assignment),
  remove: async (id: string): Promise<void> => {
    await db.assignments.delete(id)
  },
}

export const examRepository = {
  list: async (): Promise<Exam[]> => db.exams.orderBy('date').toArray(),
  put: async (exam: Exam): Promise<string> => db.exams.put(exam),
  remove: async (id: string): Promise<void> => {
    await db.exams.delete(id)
  },
}

export const gradeRepository = {
  list: async (): Promise<GradeEntry[]> => db.grades.orderBy('updatedAt').reverse().toArray(),
  put: async (grade: GradeEntry): Promise<string> => db.grades.put(grade),
  remove: async (id: string): Promise<void> => {
    await db.grades.delete(id)
  },
}

export const noteRepository = {
  list: async (): Promise<Note[]> => db.notes.orderBy('updatedAt').reverse().toArray(),
  put: async (note: Note): Promise<string> => db.notes.put(note),
  remove: async (id: string): Promise<void> => {
    await db.notes.delete(id)
  },
}

export const appSettingRepository = {
  get: async (key: string): Promise<AppSetting | undefined> => db.appSettings.get(key),
  list: async (): Promise<AppSetting[]> => db.appSettings.toArray(),
  put: async (setting: AppSetting): Promise<string> => db.appSettings.put(setting),
  remove: async (key: string): Promise<void> => {
    await db.appSettings.delete(key)
  },
}

export type RepositorySnapshot = {
  units: Unit[]
  lessons: Lesson[]
  assignments: Assignment[]
  exams: Exam[]
  grades: GradeEntry[]
  notes: Note[]
  settings: AppSetting[]
}

export const appDataRepository = {
  snapshot: async (): Promise<RepositorySnapshot> => {
    const [units, lessons, assignments, exams, grades, notes, settings] = await Promise.all([
      unitRepository.list(),
      lessonRepository.list(),
      assignmentRepository.list(),
      examRepository.list(),
      gradeRepository.list(),
      noteRepository.list(),
      appSettingRepository.list(),
    ])
    return { units, lessons, assignments, exams, grades, notes, settings }
  },
  import: async (data: RepositorySnapshot, mode: 'replace' | 'merge'): Promise<void> => {
    await db.transaction(
      'rw',
      [db.courses, db.lessons, db.assignments, db.exams, db.grades, db.notes, db.appSettings],
      async () => {
        if (mode === 'replace') {
          await Promise.all([
            db.courses.clear(),
            db.lessons.clear(),
            db.assignments.clear(),
            db.exams.clear(),
            db.grades.clear(),
            db.notes.clear(),
            db.appSettings.clear(),
          ])
        }
        await Promise.all([
          db.courses.bulkPut(data.units),
          db.lessons.bulkPut(data.lessons),
          db.assignments.bulkPut(data.assignments),
          db.exams.bulkPut(data.exams),
          db.grades.bulkPut(data.grades),
          db.notes.bulkPut(data.notes),
          db.appSettings.bulkPut(data.settings),
        ])
      },
    )
  },
}
