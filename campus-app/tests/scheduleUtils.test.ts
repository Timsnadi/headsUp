import { describe, expect, it } from 'vitest'
import type { Lesson, Unit, Weekday } from '../src/types'
import {
  formatMeetingTime,
  getDateKey,
  getLessonsForDate,
  getSafeMeetingUrl,
  getScheduledLessons,
  getWeekDates,
} from '../src/features/schedule/scheduleUtils'

const unit: Unit = {
  id: 'unit-1',
  name: 'Unit unit-1',
  code: 'U1',
  color: '#000000',
  defaultMode: 'physical',
  semester: 'Semester 1',
  updatedAt: new Date(0).toISOString(),
}

function makeLesson(id: string, startTime: string, day: Weekday): Lesson {
  return {
    id,
    unitId: unit.id,
    day,
    startTime,
    endTime: '12:00',
    type: 'lecture',
    mode: 'physical',
    location: 'S301',
    meetingLink: '',
  }
}

describe('schedule utilities', () => {
  it('returns Monday-to-Sunday dates in the Africa/Nairobi calendar', () => {
    const dates = getWeekDates(new Date('2026-11-11T22:30:00.000Z'))
    expect(dates).toHaveLength(7)
    expect(getDateKey(dates[0])).toBe('2026-11-09')
    expect(getDateKey(dates[6])).toBe('2026-11-15')
    expect(getDateKey(new Date('2026-11-11T22:30:00.000Z'))).toBe('2026-11-12')
  })

  it('filters a day’s lessons and sorts them by start time', () => {
    const lessons = [
      makeLesson('late', '14:00', 'Thursday'),
      makeLesson('wrong-day', '08:00', 'Friday'),
      makeLesson('early', '09:00', 'Thursday'),
    ]
    const scheduled = getScheduledLessons(lessons, [unit])
    expect(getLessonsForDate(scheduled, new Date('2026-11-12T08:00:00.000Z')).map(({ id }) => id))
      .toEqual(['early', 'late'])
  })

  it('formats Nairobi lesson times and only accepts HTTPS join links', () => {
    expect(formatMeetingTime('09:05')).toMatch(/9:05/)
    expect(formatMeetingTime('25:90')).toBe('25:90')
    expect(getSafeMeetingUrl('https://meet.example.edu/room')).toBe('https://meet.example.edu/room')
    expect(getSafeMeetingUrl('http://meet.example.edu/room')).toBeNull()
    expect(getSafeMeetingUrl('javascript:alert(1)')).toBeNull()
    expect(getSafeMeetingUrl('not a url')).toBeNull()
  })
})
