import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { assignmentRepository, lessonRepository, unitRepository } from '../../db/repositories'
import type { Assignment } from '../../types'
import { UnitLessonCard } from './UnitLessonCard'
import { formatScheduleDate, getDateKey, getLessonsForDate } from './scheduleUtils'
import { useScheduleUnits } from './useScheduleUnits'
import { useTodayDate } from './useTodayDate'

export function TodayPage() {
  const { lessons, loading, error, reload } = useScheduleUnits()
  const today = useTodayDate()
  const todayLessons = getLessonsForDate(lessons, today)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [unitColors, setUnitColors] = useState<Map<string, string>>(new Map())
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    void Promise.all([assignmentRepository.list(), unitRepository.list()])
      .then(([savedAssignments, units]) => {
        setAssignments(savedAssignments)
        setUnitColors(new Map(units.map((unit) => [unit.id, unit.color])))
      })
      .catch(() => setActionError('Your assignments could not be loaded.'))
  }, [])

  const now = Date.now()
  const dueSoon = assignments
    .filter((item) => item.status !== 'done')
    .filter((item) => {
      const due = new Date(item.dueDate).getTime()
      return due >= now && due - now <= 48 * 60 * 60 * 1000
    })
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate))

  const completeAssignment = async (assignment: Assignment) => {
    const updated = { ...assignment, status: 'done' as const, updatedAt: new Date().toISOString() }
    await assignmentRepository.put(updated)
    setAssignments((current) => current.map((item) => item.id === updated.id ? updated : item))
  }

  const addMeetingLink = async (lessonId: string) => {
    const value = window.prompt('Enter an HTTPS meeting link')
    if (!value) return
    try {
      const url = new URL(value.trim())
      if (url.protocol !== 'https:') throw new Error('Use an HTTPS link.')
      const lesson = await lessonRepository.list()
      const target = lesson.find((item) => item.id === lessonId)
      if (!target) throw new Error('This lesson could not be found.')
      await lessonRepository.put({ ...target, meetingLink: url.href })
      await reload()
      setActionError('')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The meeting link could not be saved.')
    }
  }

  return (
    <section className="page-panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">{formatScheduleDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1>Today</h1>
        </div>
        <Link className="chip-button accent" to="/units?new=1">+ Add unit</Link>
      </div>
      {error || actionError ? <div className="feedback-card error-card" role="alert">{error || actionError}</div> : null}
      {loading ? (
        <div className="stack-list" aria-label="Loading today’s schedule" aria-busy="true">
          {[0, 1].map((item) => <div className="skeleton-card" key={item} />)}
        </div>
      ) : todayLessons.length > 0 ? (
        <div className="stack-list">
          {todayLessons.map((lesson) => (
            <UnitLessonCard key={lesson.id} lesson={lesson} onAddLink={(item) => void addMeetingLink(item.id)} />
          ))}
        </div>
      ) : !error ? (
        <div className="empty-state schedule-empty">
          <span className="empty-state-mark" aria-hidden="true">7</span>
          <h2>A little room to breathe</h2>
          <p>No lessons are scheduled for today. Add a unit and its lessons to see them here.</p>
          <Link className="primary-button" to="/units?new=1">Add a unit</Link>
        </div>
      ) : null}
      {dueSoon.length > 0 ? (
        <section className="today-due">
          <div className="section-heading"><h2>Due soon</h2><Link to="/assignments">View all</Link></div>
          <div className="inset-list">
            {dueSoon.map((item) => (
              <article className="assignment-row" key={item.id} style={{ '--course-color': unitColors.get(item.unitId) ?? '#777' } as CSSProperties}>
                <button type="button" className="complete-check" aria-label={`Mark ${item.title} complete`} onClick={() => void completeAssignment(item)} />
                <div className="assignment-copy">
                  <strong>{item.title}</strong>
                  <span>{getDateKey(new Date(item.dueDate))} · {new Intl.DateTimeFormat([], { timeZone: 'Africa/Nairobi', hour: 'numeric', minute: '2-digit' }).format(new Date(item.dueDate))}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  )
}
