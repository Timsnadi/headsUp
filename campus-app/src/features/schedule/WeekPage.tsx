import { useEffect, useState, type CSSProperties } from 'react'
import {
  formatMeetingTime,
  formatScheduleDate,
  getCoursesForDate,
  getWeekDates,
} from './scheduleUtils'
import { useTodayDate } from './useTodayDate'
import { useScheduleCourses } from './useScheduleCourses'
import { assignmentRepository, examRepository } from '../../db/repositories'
import type { Assignment, Exam } from '../../types'

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function WeekPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const { courses, loading, error } = useScheduleCourses()
  const today = useTodayDate()
  const dates = getWeekDates(today, weekOffset)
  const weekLabel = `${formatScheduleDate(dates[0], { month: 'short', day: 'numeric' })} – ${formatScheduleDate(dates[6], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [exams, setExams] = useState<Exam[]>([])

  useEffect(() => {
    void Promise.all([assignmentRepository.list(), examRepository.list()])
      .then(([savedAssignments, savedExams]) => {
        setAssignments(savedAssignments)
        setExams(savedExams)
      })
  }, [])

  return (
    <section className="page-panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">Weekly overview</p>
          <h1>Your week</h1>
          <p className="week-range">{weekLabel}</p>
        </div>
        <div className="week-controls" aria-label="Choose week">
          <button
            type="button"
            className="icon-button week-nav-button"
            aria-label="Previous week"
            onClick={() => setWeekOffset((offset) => offset - 1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="icon-button week-nav-button"
            aria-label="Next week"
            onClick={() => setWeekOffset((offset) => offset + 1)}
          >
            ›
          </button>
        </div>
      </div>

      {error ? <div className="feedback-card error-card" role="alert">{error}</div> : null}
      {loading ? (
        <div className="week-grid" aria-label="Loading weekly schedule" aria-busy="true">
          {dates.map((date) => <div className="skeleton-card" key={date.toISOString()} />)}
        </div>
      ) : (
        <div className="week-grid">
          {dates.map((date) => {
            const dayCourses = getCoursesForDate(courses, date)
            const isToday = date.toDateString() === today.toDateString()
            const dateKey = localDateKey(date)
            const dayAssignments = assignments.filter((item) =>
              item.status !== 'done' && localDateKey(new Date(item.dueDate)) === dateKey,
            )
            const dayExams = exams.filter((item) => item.date === dateKey)

            return (
              <article className={isToday ? 'week-card today-card' : 'week-card'} key={date.toISOString()}>
                <div className="week-card-heading">
                  <h2>{formatScheduleDate(date, { weekday: 'short' })}</h2>
                  <time>{formatScheduleDate(date, { month: 'short', day: 'numeric' })}</time>
                </div>
                {dayCourses.length > 0 ? (
                  <div className="week-meetings">
                    {dayCourses.map((course) => (
                      <div
                        className="week-meeting"
                        key={course.id}
                        style={{ '--course-color': course.color } as CSSProperties}
                      >
                        <time>{formatMeetingTime(course.startTime)}</time>
                        <strong>{course.name}</strong>
                        <span>{course.code}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="week-no-classes">Nothing scheduled</p>
                )}
                {dayExams.map((exam) => (
                  <div className="week-extra exam-extra" key={exam.id}><strong>Exam: {exam.title}</strong><span>{exam.time}</span></div>
                ))}
                {dayAssignments.map((assignment) => (
                  <div className="week-extra assignment-extra" key={assignment.id}><strong>{assignment.title}</strong><span>Due · {new Date(assignment.dueDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>
                ))}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
