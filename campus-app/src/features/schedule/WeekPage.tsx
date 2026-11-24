import { useEffect, useState, type CSSProperties } from 'react'
import {
  assignmentRepository,
  examRepository,
  lessonRepository,
} from '../../db/repositories'
import type { Assignment, Exam } from '../../types'
import {
  formatMeetingTime,
  formatScheduleDate,
  getDateKey,
  getLessonsForDate,
  getSafeMeetingUrl,
  getWeekDates,
} from './scheduleUtils'
import { useScheduleUnits } from './useScheduleUnits'
import { useTodayDate } from './useTodayDate'

function durationHours(start: string, end: string): number {
  const [startHour, startMinute] = start.split(':').map(Number)
  const [endHour, endMinute] = end.split(':').map(Number)
  return (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60
}

export function WeekPage() {
  const [weekOffset, setWeekOffset] = useState(0)
  const { lessons, loading, error, reload } = useScheduleUnits()
  const today = useTodayDate()
  const dates = getWeekDates(today, weekOffset)
  const weekLabel = `${formatScheduleDate(dates[0], { month: 'short', day: 'numeric' })} – ${formatScheduleDate(dates[6], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    void Promise.all([assignmentRepository.list(), examRepository.list()])
      .then(([savedAssignments, savedExams]) => {
        setAssignments(savedAssignments)
        setExams(savedExams)
      })
      .catch(() => setActionError('Your assignments and exams could not be loaded.'))
  }, [])

  const addMeetingLink = async (lessonId: string) => {
    const value = window.prompt('Enter an HTTPS meeting link')
    if (!value) return
    try {
      const url = new URL(value.trim())
      if (url.protocol !== 'https:') throw new Error('Use an HTTPS link.')
      const savedLessons = await lessonRepository.list()
      const target = savedLessons.find((item) => item.id === lessonId)
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
          <p className="eyebrow">Weekly overview</p>
          <h1>Your week</h1>
          <p className="week-range">{weekLabel}</p>
        </div>
        <div className="week-controls" aria-label="Choose week">
          <button type="button" className="icon-button week-nav-button" aria-label="Previous week" onClick={() => setWeekOffset((offset) => offset - 1)}>‹</button>
          <button type="button" className="icon-button week-nav-button" aria-label="Next week" onClick={() => setWeekOffset((offset) => offset + 1)}>›</button>
        </div>
      </div>
      {error || actionError ? <div className="feedback-card error-card" role="alert">{error || actionError}</div> : null}
      {loading ? (
        <div className="week-grid" aria-label="Loading weekly schedule" aria-busy="true">
          {dates.map((date) => <div className="skeleton-card" key={date.toISOString()} />)}
        </div>
      ) : (
        <div className="week-grid">
          {dates.map((date) => {
            const dayLessons = getLessonsForDate(lessons, date)
            const dateKey = getDateKey(date)
            const isToday = dateKey === getDateKey(today)
            const dayAssignments = assignments.filter((item) =>
              item.status !== 'done' && getDateKey(new Date(item.dueDate)) === dateKey,
            )
            const dayExams = exams.filter((item) => item.date === dateKey)
            return (
              <article className={isToday ? 'week-card today-card' : 'week-card'} key={dateKey}>
                <div className="week-card-heading">
                  <h2>{formatScheduleDate(date, { weekday: 'short' })}</h2>
                  <time>{formatScheduleDate(date, { month: 'short', day: 'numeric' })}</time>
                </div>
                {dayLessons.length > 0 ? (
                  <div className="week-meetings">
                    {dayLessons.map((lesson) => {
                      const height = `${Math.max(3, durationHours(lesson.startTime, lesson.endTime) * 3)}rem`
                      return (
                        <div
                          className="week-meeting"
                          key={lesson.id}
                          style={{ '--course-color': lesson.unit.color, minHeight: height } as CSSProperties}
                        >
                          <time>{formatMeetingTime(lesson.startTime)}–{formatMeetingTime(lesson.endTime)}</time>
                          <strong>{lesson.unit.name}{lesson.label ? ` · ${lesson.label}` : ''}</strong>
                          <span>{lesson.unit.code} · {lesson.type}</span>
                          {lesson.lecturer || lesson.unit.defaultLecturer ? <span>{lesson.lecturer || lesson.unit.defaultLecturer}</span> : null}
                          {lesson.mode === 'physical' ? <span>{lesson.location}</span> : null}
                          {lesson.mode === 'online' ? (
                            getSafeMeetingUrl(lesson.meetingLink) ? (
                              <a className="join-button" href={getSafeMeetingUrl(lesson.meetingLink) ?? undefined} target="_blank" rel="noreferrer">Join</a>
                            ) : (
                              <div className="online-actions"><span className="course-mode">Online</span><button type="button" className="text-button" onClick={() => void addMeetingLink(lesson.id)}>Add link</button></div>
                            )
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ) : <p className="week-no-classes">Nothing scheduled</p>}
                {dayExams.map((exam) => (
                  <div className="week-extra exam-extra" key={exam.id}><strong>Exam: {exam.title}</strong><span>{exam.time}</span></div>
                ))}
                {dayAssignments.map((assignment) => (
                  <div className="week-extra assignment-extra" key={assignment.id}><strong>{assignment.title}</strong><span>Due · {new Intl.DateTimeFormat([], { timeZone: 'Africa/Nairobi', hour: 'numeric', minute: '2-digit' }).format(new Date(assignment.dueDate))}</span></div>
                ))}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
