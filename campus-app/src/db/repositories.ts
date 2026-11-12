import type { AppSetting, Assignment, Course, Exam, GradeEntry, Note } from '../types'
import { db } from './database'

export const courseRepository = {
  list: async (): Promise<Course[]> => db.courses.orderBy('updatedAt').reverse().toArray(),
  put: async (course: Course): Promise<string> => db.courses.put(course),
  remove: async (id: string): Promise<void> => {
    await db.transaction(
      'rw',
      db.courses,
      db.assignments,
      db.exams,
      db.grades,
      db.notes,
      async () => {
        await Promise.all([
          db.courses.delete(id),
          db.assignments.where('courseId').equals(id).delete(),
          db.exams.where('courseId').equals(id).delete(),
          db.grades.where('courseId').equals(id).delete(),
          db.notes.where('courseId').equals(id).delete(),
        ])
      },
    )
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
