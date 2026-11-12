import { useState, type CSSProperties } from 'react'
import {
  formatMeetingTime,
  formatScheduleDate,
  getCoursesForDate,
  getWeekDates,
} from './scheduleUtils'
import { useTodayDate } from './useTodayDate'
import { useScheduleCourses } from './useScheduleCourses'

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
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
