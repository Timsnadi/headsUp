import { describe, expect, it } from 'vitest'
import type { Course } from '../src/types'
import {
  formatMeetingTime,
  getCoursesForDate,
  getSafeMeetingUrl,
  getWeekDates,
} from '../src/features/schedule/scheduleUtils'

function makeCourse(id: string, startTime: string, meetingDays: Course['meetingDays']): Course {
  return {
    id,
    name: `Course ${id}`,
    code: id,
    instructor: '',
    color: '#000000',
    mode: 'in-person',
    building: '',
    room: '',
    meetingLink: '',
    meetingDays,
    startTime,
    endTime: '12:00',
    semester: 'Fall',
    updatedAt: new Date(0).toISOString(),
  }
}

describe('schedule utilities', () => {
  it('returns the Monday-to-Sunday dates for the anchor week', () => {
    const dates = getWeekDates(new Date(2026, 10, 12))

    expect(dates).toHaveLength(7)
    expect(dates[0].getDay()).toBe(1)
    expect(dates[0].getDate()).toBe(9)
    expect(dates[6].getDay()).toBe(0)
    expect(dates[6].getDate()).toBe(15)
  })

  it('filters a day’s courses and sorts them by start time', () => {
    const courses = [
      makeCourse('late', '14:00', ['Thursday']),
      makeCourse('wrong-day', '08:00', ['Friday']),
      makeCourse('early', '09:00', ['Thursday']),
    ]

    expect(getCoursesForDate(courses, new Date(2026, 10, 12)).map(({ id }) => id)).toEqual([
      'early',
      'late',
    ])
  })

  it('formats local meeting times and accepts only HTTP(S) join links', () => {
    expect(formatMeetingTime('09:05')).toMatch(/9:05/)
    expect(formatMeetingTime('25:90')).toBe('25:90')
    expect(getSafeMeetingUrl('https://meet.example.edu/room')).toBe('https://meet.example.edu/room')
    expect(getSafeMeetingUrl('javascript:alert(1)')).toBeNull()
    expect(getSafeMeetingUrl('not a url')).toBeNull()
  })
})
