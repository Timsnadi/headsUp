import type { CSSProperties } from 'react'
import type { Course } from '../../types'
import { formatMeetingTime, getSafeMeetingUrl } from './scheduleUtils'

type Props = {
  course: Course
}

export function CourseMeetingCard({ course }: Props) {
  const meetingUrl = course.mode === 'online' ? getSafeMeetingUrl(course.meetingLink) : null
  const place =
    course.mode === 'online'
      ? 'Online class'
      : [course.building, course.room].filter(Boolean).join(' · ') || 'Location not set'

  return (
    <article
      className="info-card meeting-card"
      style={{ '--course-color': course.color } as CSSProperties}
    >
      <div className="meeting-time">
        <span className="meeting-dot" aria-hidden="true" />
        <time>{formatMeetingTime(course.startTime)}</time>
        <span className="meeting-time-separator" aria-hidden="true">–</span>
        <time>{formatMeetingTime(course.endTime)}</time>
      </div>
      <div className="meeting-content">
        <p className="meeting-code">{course.code}</p>
        <h2>{course.name}</h2>
        <p>{place}</p>
      </div>
      {meetingUrl ? (
        <a className="join-button" href={meetingUrl} target="_blank" rel="noreferrer">
          Join
        </a>
      ) : course.mode === 'online' ? (
        <p className="meeting-link-missing">Meeting link not set</p>
      ) : null}
    </article>
  )
}
