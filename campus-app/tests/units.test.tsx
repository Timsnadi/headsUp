import './setup'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { lessonRepository, unitRepository } from '../src/db/repositories'
import { UnitsPage } from '../src/features/units/UnitsPage'
import type { Lesson, Unit } from '../src/types'

describe('UnitsPage', () => {
  const savedUnits: Unit[] = []
  const savedLessons: Lesson[] = []

  beforeEach(() => {
    savedUnits.length = 0
    savedLessons.length = 0
    vi.restoreAllMocks()
    vi.spyOn(unitRepository, 'list').mockImplementation(async () => [...savedUnits])
    vi.spyOn(lessonRepository, 'list').mockImplementation(async () => [...savedLessons])
    vi.spyOn(unitRepository, 'saveWithLessons').mockImplementation(async (unit, lessons) => {
      savedUnits.push(unit)
      savedLessons.push(...lessons)
    })
  })

  it('creates a unit and a lesson for each selected day', async () => {
    render(
      <MemoryRouter>
        <UnitsPage />
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Add your first unit' }))
    fireEvent.change(screen.getByLabelText('Unit name'), { target: { value: 'Design Systems' } })
    fireEvent.change(screen.getByLabelText('Unit code'), { target: { value: 'DS 210' } })
    fireEvent.change(screen.getByLabelText('Semester'), { target: { value: 'Semester 1, 2027' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Add lesson' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Lesson day Monday' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Lesson day Wednesday' }))
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'S301' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add selected lessons' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add unit' }))

    expect(await screen.findByRole('heading', { name: 'Design Systems' })).toBeInTheDocument()
    await waitFor(() => expect(unitRepository.saveWithLessons).toHaveBeenCalledTimes(1))
    expect(savedUnits[0]).toMatchObject({ code: 'DS 210', semester: 'Semester 1, 2027' })
    expect(savedLessons.map(({ day, location }) => ({ day, location }))).toEqual([
      { day: 'Monday', location: 'S301' },
      { day: 'Wednesday', location: 'S301' },
    ])
  })
})
