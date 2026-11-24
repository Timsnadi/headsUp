import type { Lesson, Unit, Weekday } from '../../types'

export const NAIROBI_TIME_ZONE = 'Africa/Nairobi'

export type ScheduledLesson = Lesson & { unit: Unit }

export function getNairobiDateParts(date: Date): {
  year: number
  month: number
  day: number
  weekday: Weekday
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: NAIROBI_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'long',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return {
    year: Number(value('year')),
    month: Number(value('month')),
    day: Number(value('day')),
    weekday: value('weekday') as Weekday,
  }
}

export function getDateKey(date: Date): string {
  const { year, month, day } = getNairobiDateParts(date)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getWeekday(date: Date): Weekday {
  return getNairobiDateParts(date).weekday
}

function dateFromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function getWeekDates(anchor: Date, weekOffset = 0): Date[] {
  const firstDay = dateFromKey(getDateKey(anchor))
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7
  firstDay.setUTCDate(firstDay.getUTCDate() - mondayOffset + weekOffset * 7)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(firstDay)
    date.setUTCDate(firstDay.getUTCDate() + index)
    return date
  })
}

export function getLessonsForDate(lessons: ScheduledLesson[], date: Date): ScheduledLesson[] {
  const weekday = getWeekday(date)
  return lessons
    .filter((lesson) => lesson.day === weekday)
    .sort((left, right) => left.startTime.localeCompare(right.startTime))
}

export function getScheduledLessons(lessons: Lesson[], units: Unit[]): ScheduledLesson[] {
  const unitsById = new Map(units.map((unit) => [unit.id, unit]))
  return lessons.flatMap((lesson) => {
    const unit = unitsById.get(lesson.unitId)
    return unit ? [{ ...lesson, unit }] : []
  })
}

export function formatMeetingTime(time: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)

  if (!match) {
    return time
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  return new Intl.DateTimeFormat(undefined, {
    timeZone: NAIROBI_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(Date.UTC(2020, 0, 1, hours - 3, minutes)))
}

export function formatScheduleDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: NAIROBI_TIME_ZONE }).format(date)
}

export function getSafeMeetingUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
