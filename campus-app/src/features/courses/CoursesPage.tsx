import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { courseRepository } from '../../db/repositories'
import type { Course, CourseMode, Weekday } from '../../types'

const meetingDays: Weekday[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

type CourseFormValues = Omit<Course, 'id' | 'updatedAt'>

function getDefaultValues(): CourseFormValues {
  return {
    name: '',
    code: '',
    instructor: '',
    color: getComputedStyle(document.documentElement)
      .getPropertyValue('--course-default')
      .trim(),
    mode: 'in-person',
    building: '',
    room: '',
    meetingLink: '',
    meetingDays: [],
    startTime: '09:00',
    endTime: '10:00',
    semester: '',
  }
}

function getCourseValues(course: Course): CourseFormValues {
  const { id: _id, updatedAt: _updatedAt, ...values } = course
  return values
}

export function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadVersion, setLoadVersion] = useState(0)
  const [formError, setFormError] = useState('')
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formValues, setFormValues] = useState<CourseFormValues>(getDefaultValues)
  const [saving, setSaving] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const shouldCreate = searchParams.get('new') === '1'

  useEffect(() => {
    let active = true

    async function loadCourses() {
      setLoading(true)
      setError('')

      try {
        const savedCourses = await courseRepository.list()
        if (active) {
          setCourses(savedCourses)
        }
      } catch {
        if (active) {
          setError('Your courses could not be loaded. Please try again.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadCourses()

    return () => {
      active = false
    }
  }, [loadVersion])

  const openNewCourseForm = () => {
    setEditingCourse(null)
    setFormValues(getDefaultValues())
    setFormError('')
    setIsFormOpen(true)
    setSearchParams({ new: '1' })
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSearchParams({}, { replace: true })
    setEditingCourse(null)
    setFormError('')
  }

  const openEditCourseForm = (course: Course) => {
    setEditingCourse(course)
    setFormValues(getCourseValues(course))
    setFormError('')
    setIsFormOpen(true)
  }

  const handleDelete = async (course: Course) => {
    const confirmed = window.confirm(
      `Delete ${course.name}? Its related assignments, exams, grades, and notes will also be deleted.`,
    )
    if (!confirmed) {
      return
    }

    try {
      await courseRepository.remove(course.id)
      setCourses((current) => current.filter((item) => item.id !== course.id))
      setError('')
    } catch {
      setError('This course could not be deleted. Please try again.')
    }
  }

  const updateFormValue = <K extends keyof CourseFormValues>(
    key: K,
    value: CourseFormValues[K],
  ) => {
    setFormValues((current) => ({ ...current, [key]: value }))
  }

  const toggleMeetingDay = (day: Weekday) => {
    const selected = formValues.meetingDays.includes(day)
    updateFormValue(
      'meetingDays',
      selected
        ? formValues.meetingDays.filter((item) => item !== day)
        : [...formValues.meetingDays, day],
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    if (formValues.meetingDays.length === 0) {
      setFormError('Choose at least one meeting day.')
      return
    }

    if (formValues.startTime >= formValues.endTime) {
      setFormError('The end time must be later than the start time.')
      return
    }

    if (
      formValues.mode === 'online' &&
      !/^https?:\/\//i.test(formValues.meetingLink.trim())
    ) {
      setFormError('Enter a valid meeting link beginning with http:// or https://.')
      return
    }

    if (formValues.mode === 'in-person' && !formValues.building.trim() && !formValues.room.trim()) {
      setFormError('Enter a building or room for this in-person class.')
      return
    }

    const course: Course = {
      ...formValues,
      id: editingCourse?.id ?? crypto.randomUUID(),
      name: formValues.name.trim(),
      code: formValues.code.trim(),
      instructor: formValues.instructor.trim(),
      building: formValues.mode === 'in-person' ? formValues.building.trim() : '',
      room: formValues.mode === 'in-person' ? formValues.room.trim() : '',
      meetingLink: formValues.mode === 'online' ? formValues.meetingLink.trim() : '',
      semester: formValues.semester.trim(),
      updatedAt: new Date().toISOString(),
    }

    setSaving(true)
    try {
      await courseRepository.put(course)
      setCourses((current) => {
        const withoutSavedCourse = current.filter((item) => item.id !== course.id)
        return [course, ...withoutSavedCourse]
      })
      closeForm()
    } catch {
      setFormError('Your course could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="page-panel">
      <div className="page-header">
        <div>
          <p className="eyebrow">Courses</p>
          <h1>My classes</h1>
        </div>
        <button type="button" className="chip-button accent" onClick={openNewCourseForm}>
          + New course
        </button>
      </div>

      {error ? (
        <div className="feedback-card error-card" role="alert">
          <p>{error}</p>
          <button type="button" className="text-button" onClick={() => setLoadVersion((value) => value + 1)}>
            Try again
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="stack-list" aria-label="Loading courses" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <div className="skeleton-card" key={item} />
          ))}
        </div>
      ) : !error && courses.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-mark" aria-hidden="true">+</span>
          <h2>Your semester starts here</h2>
          <p>Add your first course to start building your class schedule.</p>
          <button type="button" className="primary-button" onClick={openNewCourseForm}>
            Add your first course
          </button>
        </div>
      ) : courses.length > 0 ? (
        <div className="stack-list">
          {courses.map((course) => (
            <article
              className="info-card course-card"
              key={course.id}
              style={{ '--course-color': course.color } as CSSProperties}
            >
              <div className="course-card-header">
                <div className="card-topline">
                  <span className="course-pill" aria-hidden="true" />
                  <span>{course.code}</span>
                  <span className="course-mode">{course.mode === 'online' ? 'Online' : 'In person'}</span>
                </div>
                <div className="course-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Edit ${course.name}`}
                    onClick={() => openEditCourseForm(course)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="icon-button danger-button"
                    aria-label={`Delete ${course.name}`}
                    onClick={() => void handleDelete(course)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <h2>{course.name}</h2>
              <p>{course.instructor || 'Instructor not set'}</p>
              <p className="course-details">
                {course.meetingDays.map((day) => day.slice(0, 3)).join(', ')} ·{' '}
                {course.startTime}–{course.endTime}
              </p>
              <p className="course-details">
                {course.mode === 'online'
                  ? course.meetingLink
                  : [course.building, course.room].filter(Boolean).join(' · ')}
              </p>
              <p className="course-semester">{course.semester}</p>
            </article>
          ))}
        </div>
      ) : null}

      {isFormOpen || shouldCreate ? (
        <div className="sheet-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            closeForm()
          }
        }}>
          <section
            className="bottom-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-form-title"
          >
            <div className="sheet-handle" aria-hidden="true" />
            <div className="sheet-header">
              <div>
                <p className="eyebrow">{editingCourse ? 'Update your schedule' : 'New class'}</p>
                <h2 id="course-form-title">{editingCourse ? 'Edit course' : 'Add a course'}</h2>
              </div>
              <button type="button" className="icon-button close-button" aria-label="Close form" onClick={closeForm}>
                Close
              </button>
            </div>

            <form className="course-form" onSubmit={(event) => void handleSubmit(event)}>
              <div className="form-grid">
                <label className="form-field form-field-wide">
                  <span>Course name</span>
                  <input
                    autoFocus
                    required
                    maxLength={100}
                    value={formValues.name}
                    onChange={(event) => updateFormValue('name', event.target.value)}
                    placeholder="e.g. Introduction to Psychology"
                  />
                </label>
                <label className="form-field">
                  <span>Course code</span>
                  <input
                    required
                    maxLength={30}
                    value={formValues.code}
                    onChange={(event) => updateFormValue('code', event.target.value)}
                    placeholder="PSY 101"
                  />
                </label>
                <label className="form-field">
                  <span>Instructor</span>
                  <input
                    maxLength={100}
                    value={formValues.instructor}
                    onChange={(event) => updateFormValue('instructor', event.target.value)}
                    placeholder="Instructor name"
                  />
                </label>
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>Class format</span>
                  <select
                    value={formValues.mode}
                    onChange={(event) => {
                      const mode: CourseMode =
                        event.target.value === 'online' ? 'online' : 'in-person'
                      updateFormValue('mode', mode)
                    }}
                  >
                    <option value="in-person">In person</option>
                    <option value="online">Online</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Course color</span>
                  <input
                    className="color-input"
                    type="color"
                    value={formValues.color}
                    onChange={(event) => updateFormValue('color', event.target.value)}
                    aria-label="Course color"
                  />
                </label>
              </div>

              {formValues.mode === 'online' ? (
                <label className="form-field">
                  <span>Meeting link</span>
                  <input
                    type="url"
                    required
                    value={formValues.meetingLink}
                    onChange={(event) => updateFormValue('meetingLink', event.target.value)}
                    placeholder="https://..."
                  />
                </label>
              ) : (
                <div className="form-grid">
                  <label className="form-field">
                    <span>Building</span>
                    <input
                      value={formValues.building}
                      onChange={(event) => updateFormValue('building', event.target.value)}
                      placeholder="Science Hall"
                    />
                  </label>
                  <label className="form-field">
                    <span>Room</span>
                    <input
                      value={formValues.room}
                      onChange={(event) => updateFormValue('room', event.target.value)}
                      placeholder="204"
                    />
                  </label>
                </div>
              )}

              <fieldset className="form-field day-field">
                <legend>Meeting days</legend>
                <div className="day-picker">
                  {meetingDays.map((day) => (
                    <label className="day-option" key={day}>
                      <input
                        type="checkbox"
                        aria-label={`Meets ${day}`}
                        checked={formValues.meetingDays.includes(day)}
                        onChange={() => toggleMeetingDay(day)}
                      />
                      <span>{day.slice(0, 1)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="form-grid">
                <label className="form-field">
                  <span>Start time</span>
                  <input
                    type="time"
                    required
                    value={formValues.startTime}
                    onChange={(event) => updateFormValue('startTime', event.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>End time</span>
                  <input
                    type="time"
                    required
                    value={formValues.endTime}
                    onChange={(event) => updateFormValue('endTime', event.target.value)}
                  />
                </label>
              </div>

              <label className="form-field">
                <span>Semester</span>
                <input
                  required
                  maxLength={60}
                  value={formValues.semester}
                  onChange={(event) => updateFormValue('semester', event.target.value)}
                  placeholder="Fall 2026"
                />
              </label>

              {formError ? <p className="form-error" role="alert">{formError}</p> : null}

              <div className="sheet-actions">
                <button type="button" className="secondary-button" onClick={closeForm}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Saving…' : editingCourse ? 'Save changes' : 'Add course'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}
