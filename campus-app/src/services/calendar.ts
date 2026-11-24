import type { Assignment, Exam, Lesson, Unit } from '../types'
import { getDateKey, NAIROBI_TIME_ZONE } from '../features/schedule/scheduleUtils'

type CalendarInput = {
  units: Unit[]
  lessons: Lesson[]
  assignments: Assignment[]
  exams: Exam[]
  semesterStartDate: string
  semesterEndDate: string
  reminderMinutes: number
  now?: Date
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

function foldLine(line: string): string {
  const result: string[] = []
  let current = ''
  let bytes = 0
  for (const character of line) {
    const size = new TextEncoder().encode(character).length
    if (bytes + size > 75) {
      result.push(current)
      current = ` ${character}`
      bytes = 1 + size
    } else {
      current += character
      bytes += size
    }
  }
  result.push(current)
  return result.join('\r\n')
}

function dateTimeStamp(value: string): string {
  return value.replace(/[-:]/g, '').slice(0, 15)
}

function utcStamp(value: Date): string {
  return value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function eventDateTime(value: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: NAIROBI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}

function durationEndLocal(date: string, time: string, minutes: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const end = new Date(Date.UTC(year, month - 1, day, hour, minute + minutes))
  const endDate = `${end.getUTCFullYear()}${String(end.getUTCMonth() + 1).padStart(2, '0')}${String(end.getUTCDate()).padStart(2, '0')}`
  const endTime = `${String(end.getUTCHours()).padStart(2, '0')}${String(end.getUTCMinutes()).padStart(2, '0')}`
  return `${endDate}T${endTime}00`
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

export function createCalendar(input: CalendarInput): string {
  const {
    units, lessons, assignments, exams, semesterStartDate, semesterEndDate,
    reminderMinutes, now = new Date(),
  } = input
  if (!validDate(semesterStartDate) || !validDate(semesterEndDate) || semesterEndDate < semesterStartDate) {
    throw new Error('Set valid semester start and end dates before adding events to your calendar.')
  }
  if (!Number.isInteger(reminderMinutes) || reminderMinutes < 0 || reminderMinutes > 10080) {
    throw new Error('Reminder time must be between 0 and 10080 minutes.')
  }

  const unitsById = new Map(units.map((unit) => [unit.id, unit]))
  const stamp = utcStamp(now)
  const events: string[] = []
  const addEvent = (uid: string, summary: string, description: string, start: string, end: string,
    location: string, recurrence?: string, url?: string) => {
    events.push([
      'BEGIN:VEVENT',
      `UID:${encodeURIComponent(uid)}@headsup.local`,
      `DTSTAMP:${stamp}`,
      start,
      end,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(description)}`,
      ...(location ? [`LOCATION:${escapeText(location)}`] : []),
      ...(url ? [`URL:${url}`] : []),
      ...(recurrence ? [`RRULE:${recurrence}`] : []),
      'BEGIN:VALARM',
      `TRIGGER:-PT${reminderMinutes}M`,
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(summary)}`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n'))
  }

  const until = `${semesterEndDate.replace(/-/g, '')}T205959Z`
  for (const lesson of lessons) {
    const unit = unitsById.get(lesson.unitId)
    if (!unit) continue
    const daysFromMonday: Record<string, number> = {
      Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
      Friday: 4, Saturday: 5, Sunday: 6,
    }
    const first = new Date(`${semesterStartDate}T00:00:00Z`)
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: NAIROBI_TIME_ZONE, weekday: 'long',
    }).format(first)
    const mondayOffset = (daysFromMonday[weekday] + 7) % 7
    const lessonOffset = daysFromMonday[lesson.day]
    let startDate = new Date(first)
    startDate.setUTCDate(startDate.getUTCDate() + ((lessonOffset - mondayOffset + 7) % 7))
    const startKey = getDateKey(startDate)
    if (startKey > semesterEndDate) continue
    const place = lesson.mode === 'online' ? lesson.meetingLink : lesson.location
    const lessonStart = `DTSTART;TZID=${NAIROBI_TIME_ZONE}:${dateTimeStamp(startKey)}T${lesson.startTime.replace(':', '')}00`
      .replace(/(\d{8}T\d{4})00$/, '$1')
    const lessonEnd = `DTEND;TZID=${NAIROBI_TIME_ZONE}:${dateTimeStamp(startKey)}T${lesson.endTime.replace(':', '')}00`
      .replace(/(\d{8}T\d{4})00$/, '$1')
    addEvent(
      `lesson-${lesson.id}`,
      `${unit.code}: ${lesson.label || lesson.type}`,
      [lesson.note ?? '', lesson.lecturer || unit.defaultLecturer || ''].filter(Boolean).join('\n'),
      lessonStart,
      lessonEnd,
      place,
      `FREQ=WEEKLY;UNTIL=${until}`,
      lesson.mode === 'online' ? lesson.meetingLink : undefined,
    )
  }

  for (const assignment of assignments) {
    const unit = unitsById.get(assignment.unitId)
    const { date, time } = eventDateTime(assignment.dueDate)
    addEvent(`assignment-${assignment.id}`, assignment.title, unit?.code ?? '',
      `DTSTART;TZID=${NAIROBI_TIME_ZONE}:${dateTimeStamp(date)}T${time.replace(':', '')}`,
      `DTEND;TZID=${NAIROBI_TIME_ZONE}:${durationEndLocal(date, time, 30)}`, '')
  }
  for (const exam of exams) {
    const unit = unitsById.get(exam.unitId)
    addEvent(`exam-${exam.id}`, exam.title, unit?.code ?? '', `DTSTART;TZID=${NAIROBI_TIME_ZONE}:${dateTimeStamp(exam.date)}T${exam.time.replace(':', '')}`,
      `DTEND;TZID=${NAIROBI_TIME_ZONE}:${durationEndLocal(exam.date, exam.time, 120)}`,
      exam.location)
  }

  const calendar = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//headsUp//Campus Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-TIMEZONE:${NAIROBI_TIME_ZONE}`,
    'BEGIN:VTIMEZONE',
    `TZID:${NAIROBI_TIME_ZONE}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0300',
    'TZOFFSETTO:+0300',
    'TZNAME:EAT',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...events,
    'END:VCALENDAR',
    '',
  ].join('\r\n')
  return calendar.split('\r\n').map(foldLine).join('\r\n')
}
