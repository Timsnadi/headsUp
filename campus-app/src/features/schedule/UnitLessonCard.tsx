import type { CSSProperties } from 'react'
import type { ScheduledLesson } from './scheduleUtils'
import { formatMeetingTime, getSafeMeetingUrl } from './scheduleUtils'

type Props = {
  lesson: ScheduledLesson
  onAddLink?: (lesson: ScheduledLesson) => void
}

export function UnitLessonCard({ lesson, onAddLink }: Props) {
  const meetingUrl = lesson.mode === 'online' ? getSafeMeetingUrl(lesson.meetingLink) : null
  const lecturer = lesson.lecturer || lesson.unit.defaultLecturer

  return (
    <article
      className="info-card meeting-card"
      style={{ '--course-color': lesson.unit.color } as CSSProperties}
    >
      <div className="meeting-time">
        <span className="meeting-dot" aria-hidden="true" />
        <time>{formatMeetingTime(lesson.startTime)}</time>
        <span className="meeting-time-separator" aria-hidden="true">–</span>
        <time>{formatMeetingTime(lesson.endTime)}</time>
      </div>
      <div className="meeting-content">
        <p className="meeting-code">{lesson.unit.code} · {lesson.type}</p>
        <h2>{lesson.unit.name}{lesson.label ? ` · ${lesson.label}` : ''}</h2>
        {lecturer ? <p>{lecturer}</p> : null}
        {lesson.mode === 'physical' ? <p>{lesson.location}</p> : null}
      </div>
      {meetingUrl ? (
        <a className="join-button" href={meetingUrl} target="_blank" rel="noreferrer">Join</a>
      ) : lesson.mode === 'online' ? (
        <div className="online-actions">
          <span className="course-mode">Online</span>
          {!meetingUrl ? <button type="button" className="text-button" onClick={() => onAddLink?.(lesson)}>Add link</button> : null}
        </div>
      ) : null}
    </article>
  )
}
