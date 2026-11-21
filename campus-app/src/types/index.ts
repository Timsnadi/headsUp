export type CourseMode = 'online' | 'in-person'

export type Weekday =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday'

export type ThemeMode = 'system' | 'light' | 'dark'

export type Course = {
  id: string
  name: string
  code: string
  instructor: string
  color: string
  mode: CourseMode
  building: string
  room: string
  meetingLink: string
  meetingDays: Weekday[]
  startTime: string
  endTime: string
  semester: string
  updatedAt: string
}

export type AssignmentStatus = 'upcoming' | 'in-progress' | 'done' | 'overdue'

export type Assignment = {
  id: string
  courseId: string
  title: string
  dueDate: string
  status: AssignmentStatus
  priority: 'low' | 'medium' | 'high'
  notes?: string
  updatedAt: string
}

export type Exam = {
  id: string
  courseId: string
  title: string
  date: string
  time: string
  location: string
  weight: number
  updatedAt: string
}

export type GradeEntry = {
  id: string
  courseId: string
  title: string
  score: number
  maxScore: number
  weight: number
  updatedAt: string
}

export type Note = {
  id: string
  courseId: string
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
