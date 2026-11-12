import type { Course, Weekday } from '../../types'

const weekdays: Weekday[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export function getWeekday(date: Date): Weekday {
  return weekdays[date.getDay()]
}

export function getWeekDates(anchor: Date, weekOffset = 0): Date[] {
  const firstDay = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
  const mondayOffset = (firstDay.getDay() + 6) % 7
  firstDay.setDate(firstDay.getDate() - mondayOffset + weekOffset * 7)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(firstDay)
    date.setDate(firstDay.getDate() + index)
    return date
  })
}

export function getCoursesForDate(courses: Course[], date: Date): Course[] {
  const weekday = getWeekday(date)

  return courses
    .filter((course) => course.meetingDays.includes(weekday))
    .sort((left, right) => left.startTime.localeCompare(right.startTime))
}

export function formatMeetingTime(time: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)

  if (!match) {
    return time
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes))
}

export function formatScheduleDate(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(undefined, options).format(date)
}

export function getSafeMeetingUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}
