import { describe, expect, it } from 'vitest'
import { createCalendar } from '../src/services/calendar'
import type { Assignment, Exam, Lesson, Unit } from '../src/types'

const units: Unit[] = [{
  id: 'unit-1',
  name: 'Computing',
  code: 'CS1',
  defaultLecturer: 'Dr, Example',
  color: '#123456',
  defaultMode: 'physical',
  semester: 'Semester 1',
  updatedAt: '2026-11-21T12:00:00.000Z',
}]

const lessons: Lesson[] = [
  {
    id: 'lesson-1',
    unitId: 'unit-1',
    day: 'Monday',
    startTime: '07:00',
    endTime: '11:00',
    label: 'Part 1',
    type: 'lecture',
    mode: 'physical',
    location: 'S301, East',
    meetingLink: '',
  },
  {
    id: 'lesson-2',
    unitId: 'unit-1',
    day: 'Tuesday',
    startTime: '13:00',
    endTime: '14:00',
    type: 'tutorial',
    mode: 'online',
    location: '',
    meetingLink: 'https://meet.example.edu/tutorial',
  },
]

const assignments: Assignment[] = [{
  id: 'assignment-1',
  unitId: 'unit-1',
  title: 'Essay, final',
  dueDate: '2027-01-06T09:00:00.000Z',
  status: 'upcoming',
  priority: 'high',
  updatedAt: '2026-11-21T12:00:00.000Z',
}]

const exams: Exam[] = [{
  id: 'exam-1',
  unitId: 'unit-1',
  title: 'Final exam',
  date: '2027-01-07',
  time: '11:30',
  location: 'Hall; 4',
  weight: 40,
  updatedAt: '2026-11-21T12:00:00.000Z',
}]

describe('calendar export', () => {
  it('exports recurring lessons and single events with Nairobi times, alarms, escaped and folded text', () => {
    const ics = createCalendar({
      units,
      lessons,
      assignments,
      exams,
      semesterStartDate: '2027-01-04',
      semesterEndDate: '2027-04-30',
      reminderMinutes: 15,
      now: new Date('2026-12-01T10:00:00.000Z'),
    })

    expect(ics).toContain('TZID:Africa/Nairobi')
    expect(ics).toContain('DTSTART;TZID=Africa/Nairobi:20270104T0700')
    expect(ics).toContain('DTEND;TZID=Africa/Nairobi:20270104T1100')
    expect(ics).toContain('RRULE:FREQ=WEEKLY;UNTIL=20270430T205959Z')
    expect(ics).toContain('DTSTART;TZID=Africa/Nairobi:20270105T1300')
    expect(ics).toContain('LOCATION:https://meet.example.edu/tutorial')
    expect(ics).toContain('URL:https://meet.example.edu/tutorial')
    expect(ics).toContain('DTSTART;TZID=Africa/Nairobi:20270106T1200')
    expect(ics).toContain('DTSTART;TZID=Africa/Nairobi:20270107T1130')
    expect(ics).toContain('LOCATION:Hall\\; 4')
    expect(ics).toContain('SUMMARY:Essay\\, final')
    expect(ics).toContain('TRIGGER:-PT15M')
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(4)
    expect(ics.match(/UID:/g)).toHaveLength(4)
    expect(ics.endsWith('\r\n')).toBe(true)
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
  })

  it('rejects invalid semester dates or reminder values', () => {
    const base = {
      units, lessons, assignments, exams,
      semesterStartDate: '2027-04-30',
      semesterEndDate: '2027-01-01',
      reminderMinutes: 15,
    }
    expect(() => createCalendar(base)).toThrow('semester start and end')
    expect(() => createCalendar({ ...base, semesterStartDate: '2027-01-01', reminderMinutes: -1 }))
      .toThrow('Reminder time')
  })
})
