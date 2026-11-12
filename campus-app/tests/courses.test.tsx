import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { courseRepository } from '../src/db/repositories'
import { CoursesPage } from '../src/features/courses/CoursesPage'
import type { Course } from '../src/types'

describe('CoursesPage', () => {
  const savedCourses: Course[] = []

  beforeEach(() => {
    savedCourses.length = 0
    vi.restoreAllMocks()
    vi.spyOn(courseRepository, 'list').mockImplementation(async () => [...savedCourses])
    vi.spyOn(courseRepository, 'put').mockImplementation(async (course) => {
      const existingIndex = savedCourses.findIndex(({ id }) => id === course.id)
      if (existingIndex < 0) {
        savedCourses.push(course)
      } else {
        savedCourses[existingIndex] = course
      }
      return course.id
    })
  })

  it('creates a course and shows it in the course list', async () => {
    render(
      <MemoryRouter>
        <CoursesPage />
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Add your first course' }))
    fireEvent.change(screen.getByLabelText('Course name'), {
      target: { value: 'Design Systems' },
    })
    fireEvent.change(screen.getByLabelText('Course code'), { target: { value: 'DS 210' } })
    fireEvent.change(screen.getByLabelText('Building'), { target: { value: 'Arts Hall' } })
    fireEvent.change(screen.getByLabelText('Room'), { target: { value: '204' } })
    fireEvent.change(screen.getByLabelText('Semester'), { target: { value: 'Fall 2026' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Meets Monday' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add course' }))

    expect(await screen.findByRole('heading', { name: 'Design Systems' })).toBeInTheDocument()
    await waitFor(() => expect(courseRepository.put).toHaveBeenCalledTimes(1))
    expect(savedCourses[0]).toMatchObject({
      code: 'DS 210',
      building: 'Arts Hall',
      room: '204',
      meetingDays: ['Monday'],
      semester: 'Fall 2026',
    })
  })
})
