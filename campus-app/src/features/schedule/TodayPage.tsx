import { Link } from 'react-router-dom'
import { CourseMeetingCard } from './CourseMeetingCard'
import { getCoursesForDate, formatScheduleDate } from './scheduleUtils'
import { useTodayDate } from './useTodayDate'
import { useScheduleCourses } from './useScheduleCourses'

export function TodayPage() {
  const { courses, loading, error } = useScheduleCourses()
  const today = useTodayDate()
  const todayCourses = getCoursesForDate(courses, today)

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
    </section>
  )
}
