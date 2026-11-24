export type LessonMode = 'physical' | 'online'
export type LessonType = 'lecture' | 'tutorial' | 'lab' | 'other'

export type Weekday =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday'

export type ThemeMode = 'system' | 'light' | 'dark'

export type Unit = {
  id: string
  name: string
  code: string
  defaultLecturer?: string
  color: string
  defaultMode: LessonMode
  semester: string
  updatedAt: string
}

export type Lesson = {
  id: string
  unitId: string
  day: Weekday
  startTime: string
  endTime: string
  label?: string
  type: LessonType
  mode: LessonMode
  location: string
  meetingLink: string
  lecturer?: string
  note?: string
}

export type AssignmentStatus = 'upcoming' | 'in-progress' | 'done' | 'overdue'

export type Assignment = {
  id: string
  unitId: string
  title: string
  dueDate: string
  status: AssignmentStatus
  priority: 'low' | 'medium' | 'high'
  notes?: string
  updatedAt: string
}

export type Exam = {
  id: string
  unitId: string
  title: string
  date: string
  time: string
  location: string
  weight: number
  updatedAt: string
}

export type GradeEntry = {
  id: string
  unitId: string
  title: string
  score: number
  maxScore: number
  weight: number
  updatedAt: string
}

export type Note = {
  id: string
  unitId: string
  title: string
  body: string
  links: string[]
  updatedAt: string
}

export type AppSetting = {
  key: string
  value: string
  updatedAt: string
}
