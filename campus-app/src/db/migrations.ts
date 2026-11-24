import type { Lesson, LessonMode, Unit, Weekday } from '../types'

const weekdays: Weekday[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function migrateLegacyUnits(records: unknown[]): { units: Unit[]; lessons: Lesson[] } {
  const units: Unit[] = []
  const lessons: Lesson[] = []

  records.forEach((value) => {
    if (!isRecord(value) || typeof value.id !== 'string') return

    const oldMode: LessonMode = value.mode === 'online' ? 'online' : 'physical'
    const unit: Unit = {
      id: value.id,
      name: stringValue(value.name),
      code: stringValue(value.code),
      defaultLecturer: stringValue(value.instructor) || undefined,
      color: stringValue(value.color),
      defaultMode: oldMode,
      semester: stringValue(value.semester),
      updatedAt: stringValue(value.updatedAt),
    }
    units.push(unit)

    const days = Array.isArray(value.meetingDays) ? value.meetingDays : []
    for (const day of days) {
      if (typeof day !== 'string' || !weekdays.includes(day as Weekday)) continue
      const location =
        oldMode === 'physical'
          ? [stringValue(value.building), stringValue(value.room)].filter(Boolean).join(' · ')
          : ''
      lessons.push({
        id: `legacy-${value.id}-${day.toLowerCase()}`,
        unitId: value.id,
        day: day as Weekday,
        startTime: stringValue(value.startTime),
        endTime: stringValue(value.endTime),
        type: 'lecture',
        mode: oldMode,
        location,
        meetingLink: oldMode === 'online' ? stringValue(value.meetingLink) : '',
      })
    }
  })

  return { units, lessons }
}

export function migrateLegacyUnitReference(record: Record<string, unknown>): void {
  if (typeof record.courseId === 'string') {
    record.unitId = record.courseId
    delete record.courseId
  }
}
