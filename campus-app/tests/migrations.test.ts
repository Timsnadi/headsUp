import { describe, expect, it } from 'vitest'
import { migrateLegacyUnitReference, migrateLegacyUnits } from '../src/db/migrations'

describe('legacy unit migration', () => {
  it('preserves unit details and converts every legacy meeting day to a lesson', () => {
    const result = migrateLegacyUnits([{
      id: 'legacy-1',
      name: 'Physics',
      code: 'PHY101',
      instructor: 'Dr. Smith',
      color: '#123456',
      mode: 'in-person',
      building: 'Science',
      room: '204',
      meetingDays: ['Monday', 'Wednesday'],
      startTime: '09:00',
      endTime: '10:30',
      semester: 'Semester 1',
      updatedAt: '2026-11-21T12:00:00.000Z',
    }])

    expect(result.units).toEqual([{
      id: 'legacy-1',
      name: 'Physics',
      code: 'PHY101',
      defaultLecturer: 'Dr. Smith',
      color: '#123456',
      defaultMode: 'physical',
      semester: 'Semester 1',
      updatedAt: '2026-11-21T12:00:00.000Z',
    }])
    expect(result.lessons).toHaveLength(2)
    expect(result.lessons.map(({ unitId, day, startTime, endTime, mode, location }) =>
      ({ unitId, day, startTime, endTime, mode, location }),
    )).toEqual([
      { unitId: 'legacy-1', day: 'Monday', startTime: '09:00', endTime: '10:30', mode: 'physical', location: 'Science · 204' },
      { unitId: 'legacy-1', day: 'Wednesday', startTime: '09:00', endTime: '10:30', mode: 'physical', location: 'Science · 204' },
    ])
  })

  it('preserves legacy online links and changes linked records to unit IDs', () => {
    const { units, lessons } = migrateLegacyUnits([{
      id: 'legacy-online',
      name: 'Online Maths',
      code: 'MAT1',
      color: '#abcdef',
      mode: 'online',
      meetingLink: 'https://meet.example.edu/room',
      meetingDays: ['Friday'],
      startTime: '13:00',
      endTime: '14:00',
      semester: 'Semester 2',
      updatedAt: '2026-11-21T12:00:00.000Z',
    }])
    const linkedRecord: Record<string, unknown> = { courseId: 'legacy-online', title: 'Essay' }

    migrateLegacyUnitReference(linkedRecord)

    expect(units[0].defaultMode).toBe('online')
    expect(lessons[0]).toMatchObject({
      unitId: 'legacy-online',
      mode: 'online',
      meetingLink: 'https://meet.example.edu/room',
      location: '',
    })
    expect(linkedRecord).toEqual({ unitId: 'legacy-online', title: 'Essay' })
  })
})
