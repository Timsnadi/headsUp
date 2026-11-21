import { Link } from 'react-router-dom'
import { CourseMeetingCard } from './CourseMeetingCard'
import { getCoursesForDate, formatScheduleDate } from './scheduleUtils'
import { useTodayDate } from './useTodayDate'
import { useScheduleCourses } from './useScheduleCourses'
import { useEffect, useState, type CSSProperties } from 'react'
import { assignmentRepository, courseRepository } from '../../db/repositories'
import type { Assignment, Course } from '../../types'

export function TodayPage() {
  const { courses, loading, error } = useScheduleCourses()
  const today = useTodayDate()
  const todayCourses = getCoursesForDate(courses, today)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [allCourses, setAllCourses] = useState<Course[]>([])

  useEffect(() => {
    void Promise.all([assignmentRepository.list(), courseRepository.list()])
      .then(([savedAssignments, savedCourses]) => {
        setAssignments(savedAssignments)
        setAllCourses(savedCourses)
      })
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

  return (
    <section className="page-panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">{formatScheduleDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1>Today</h1>
        </div>
        <Link className="chip-button accent" to="/courses?new=1">
          + Add class
        </Link>
      </div>

      {error ? <div className="feedback-card error-card" role="alert">{error}</div> : null}
      {loading ? (
        <div className="stack-list" aria-label="Loading today’s schedule" aria-busy="true">
          {[0, 1].map((item) => <div className="skeleton-card" key={item} />)}
        </div>
      ) : todayCourses.length > 0 ? (
        <div className="stack-list">
          {todayCourses.map((course) => <CourseMeetingCard key={course.id} course={course} />)}
        </div>
      ) : !error ? (
        <div className="empty-state schedule-empty">
          <span className="empty-state-mark" aria-hidden="true">7</span>
          <h2>A little room to breathe</h2>
          <p>No classes are scheduled for today. Add a course and its meeting days to see it here.</p>
          <Link className="primary-button" to="/courses?new=1">Add a course</Link>
        </div>
      ) : null}
      {dueSoon.length > 0 ? (
        <section className="today-due">
          <div className="section-heading"><h2>Due soon</h2><Link to="/assignments">View all</Link></div>
          <div className="inset-list">
            {dueSoon.map((item) => {
              const course = allCourses.find((entry) => entry.id === item.courseId)
              return (
                <article className="assignment-row" key={item.id} style={{ '--course-color': course?.color ?? '#777' } as CSSProperties}>
                  <button type="button" className="complete-check" aria-label={`Mark ${item.title} complete`} onClick={() => void completeAssignment(item)} />
                  <div className="assignment-copy"><strong>{item.title}</strong><span>{course?.code || 'Course'} · {new Date(item.dueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></div>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}
    </section>
  )
}
