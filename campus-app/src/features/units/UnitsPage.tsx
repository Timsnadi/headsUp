import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { lessonRepository, unitRepository } from '../../db/repositories'
import type { Lesson, LessonMode, LessonType, Unit, Weekday } from '../../types'

const weekdays: Weekday[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
]

type UnitValues = Omit<Unit, 'id' | 'updatedAt'>
type LessonDraft = Omit<Lesson, 'id' | 'unitId' | 'day'>

function defaultUnit(): UnitValues {
  return {
    name: '',
    code: '',
    defaultLecturer: '',
    color: getComputedStyle(document.documentElement).getPropertyValue('--course-default').trim(),
    defaultMode: 'physical',
    semester: '',
  }
}

function defaultLesson(mode: LessonMode): LessonDraft {
  return {
    startTime: '09:00',
    endTime: '10:00',
    label: '',
    type: 'lecture',
    mode,
    location: '',
    meetingLink: '',
    lecturer: '',
    note: '',
  }
}

function validTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function lessonTimeError(lesson: LessonDraft): string {
  if (!validTime(lesson.startTime) || !validTime(lesson.endTime) ||
    lesson.startTime < '07:00' || lesson.endTime > '18:00' ||
    lesson.endTime <= lesson.startTime) {
    return 'Lessons must be between 07:00 and 18:00, with the end time after the start.'
  }
  const [startHour, startMinute] = lesson.startTime.split(':').map(Number)
  const [endHour, endMinute] = lesson.endTime.split(':').map(Number)
  const duration = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  if (duration < 60 || duration > 240) return 'Lesson duration must be from 1 to 4 hours.'
  if (lesson.mode === 'physical' && !lesson.location.trim()) return 'Enter a location for physical lessons.'
  if (lesson.meetingLink.trim()) {
    try {
      if (new URL(lesson.meetingLink).protocol !== 'https:') throw new Error()
    } catch {
      return 'Meeting links must begin with https://.'
    }
  }
  return ''
}

export function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadVersion, setLoadVersion] = useState(0)
  const [formError, setFormError] = useState('')
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formValues, setFormValues] = useState<UnitValues>(defaultUnit)
  const [lessonDraft, setLessonDraft] = useState<LessonDraft>(defaultLesson('physical'))
  const [selectedDays, setSelectedDays] = useState<Weekday[]>([])
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [lessonEditorOpen, setLessonEditorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const shouldCreate = searchParams.get('new') === '1'

  useEffect(() => {
    let active = true
    async function loadUnits() {
      setLoading(true)
      setError('')
      try {
        const [savedUnits, savedLessons] = await Promise.all([
          unitRepository.list(),
          lessonRepository.list(),
        ])
        if (active) {
          setUnits(savedUnits)
          setLessons(savedLessons)
        }
      } catch {
        if (active) setError('Your units could not be loaded. Please try again.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadUnits()
    return () => { active = false }
  }, [loadVersion])

  const openNew = () => {
    setEditingUnit(null)
    setFormValues(defaultUnit())
    setLessons([])
    setFormError('')
    setIsFormOpen(true)
    setSearchParams({ new: '1' })
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setSearchParams({}, { replace: true })
    setEditingUnit(null)
    setEditingLessonId(null)
    setFormError('')
  }

  const openEdit = (unit: Unit) => {
    setEditingUnit(unit)
    setFormValues({
      name: unit.name,
      code: unit.code,
      defaultLecturer: unit.defaultLecturer ?? '',
      color: unit.color,
      defaultMode: unit.defaultMode,
      semester: unit.semester,
    })
    setLessons(lessons.filter((lesson) => lesson.unitId === unit.id))
    setFormError('')
    setIsFormOpen(true)
  }

  const toggleDay = (day: Weekday) => {
    setSelectedDays((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day],
    )
  }

  const startAddLesson = () => {
    setEditingLessonId(null)
    setLessonEditorOpen(true)
    setLessonDraft(defaultLesson(formValues.defaultMode))
    setSelectedDays([])
    setFormError('')
  }

  const editLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id)
    setLessonEditorOpen(true)
    const { id: _id, unitId: _unitId, day: _day, ...draft } = lesson
    setLessonDraft(draft)
    setSelectedDays([lesson.day])
    setFormError('')
  }

  const saveLessonDraft = () => {
    if (selectedDays.length === 0) {
      setFormError('Choose at least one day for this lesson.')
      return
    }
    const validation = lessonTimeError(lessonDraft)
    if (validation) {
      setFormError(validation)
      return
    }
    const saved = selectedDays.map((day) => ({
      ...lessonDraft,
      id: editingLessonId && day === selectedDays[0] ? editingLessonId : crypto.randomUUID(),
      unitId: editingUnit?.id ?? '',
      day,
      label: lessonDraft.label?.trim() || undefined,
      lecturer: lessonDraft.lecturer?.trim() || undefined,
      note: lessonDraft.note?.trim() || undefined,
      location: lessonDraft.mode === 'physical' ? lessonDraft.location.trim() : '',
      meetingLink: lessonDraft.meetingLink.trim(),
    }))
    if (editingLessonId) {
      setLessons((current) => current.map((item) =>
        item.id === editingLessonId ? saved[0] : item,
      ))
    } else {
      setLessons((current) => [...current, ...saved])
    }
    setEditingLessonId(null)
    setLessonEditorOpen(false)
    setFormError('')
  }

  const duplicateLesson = (lesson: Lesson) => {
    const { id: _id, unitId: _unitId, day, ...draft } = lesson
    setEditingLessonId(null)
    setLessonEditorOpen(true)
    setLessonDraft(draft)
    setSelectedDays([day])
    setFormError('')
  }

  const deleteUnit = async (unit: Unit) => {
    if (!window.confirm(`Delete ${unit.name}? Its lessons, assignments, exams, grades, and notes will also be deleted.`)) return
    try {
      await unitRepository.remove(unit.id)
      setUnits((current) => current.filter((item) => item.id !== unit.id))
      setLessons((current) => current.filter((item) => item.unitId !== unit.id))
      setError('')
    } catch {
      setError('This unit could not be deleted. Please try again.')
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    const unit: Unit = {
      ...formValues,
      id: editingUnit?.id ?? crypto.randomUUID(),
      name: formValues.name.trim(),
      code: formValues.code.trim(),
      defaultLecturer: formValues.defaultLecturer?.trim() || undefined,
      semester: formValues.semester.trim(),
      updatedAt: new Date().toISOString(),
    }
    const savedLessons = lessons.map((lesson) => ({ ...lesson, unitId: unit.id }))
    setSaving(true)
    try {
      await unitRepository.saveWithLessons(unit, savedLessons)
      setUnits((current) => [unit, ...current.filter((item) => item.id !== unit.id)])
      setLessons((current) => [
        ...current.filter((lesson) => lesson.unitId !== unit.id),
        ...savedLessons,
      ])
      closeForm()
    } catch {
      setFormError('Your unit could not be saved. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const updateLesson = <K extends keyof LessonDraft>(key: K, value: LessonDraft[K]) => {
    setLessonDraft((current) => ({ ...current, [key]: value }))
  }

  return (
    <section className="page-panel">
      <div className="page-header">
        <div><p className="eyebrow">Units</p><h1>My units</h1></div>
        <button type="button" className="chip-button accent" onClick={openNew}>+ New unit</button>
      </div>
      {error ? (
        <div className="feedback-card error-card" role="alert">
          <p>{error}</p>
          <button type="button" className="text-button" onClick={() => setLoadVersion((value) => value + 1)}>Try again</button>
        </div>
      ) : null}
      {loading ? (
        <div className="stack-list" aria-label="Loading units" aria-busy="true">
          {[0, 1, 2].map((item) => <div className="skeleton-card" key={item} />)}
        </div>
      ) : !error && units.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-mark" aria-hidden="true">+</span>
          <h2>Your semester starts here</h2>
          <p>Add your first unit and lessons to build your schedule.</p>
          <button type="button" className="primary-button" onClick={openNew}>Add your first unit</button>
        </div>
      ) : units.length > 0 ? (
        <div className="stack-list">
          {units.map((unit) => {
            const unitLessons = lessons.filter((lesson) => lesson.unitId === unit.id)
            return (
              <article className="info-card course-card" key={unit.id} style={{ '--course-color': unit.color } as CSSProperties}>
                <div className="course-card-header">
                  <div className="card-topline"><span className="course-pill" aria-hidden="true" /><span>{unit.code}</span></div>
                  <div className="course-actions">
                    <button type="button" className="icon-button" aria-label={`Edit ${unit.name}`} onClick={() => openEdit(unit)}>Edit</button>
                    <button type="button" className="icon-button danger-button" aria-label={`Delete ${unit.name}`} onClick={() => void deleteUnit(unit)}>Delete</button>
                  </div>
                </div>
                <h2>{unit.name}</h2>
                <p>{unit.defaultLecturer || 'Lecturer not set'}</p>
                {unitLessons.map((lesson) => (
                  <p className="course-details" key={lesson.id}>
                    {lesson.day.slice(0, 3)} · {lesson.startTime}–{lesson.endTime} · {lesson.mode === 'online' ? 'Online' : lesson.location}
                  </p>
                ))}
                <p className="course-semester">{unit.semester}</p>
              </article>
            )
          })}
        </div>
      ) : null}

      {isFormOpen || shouldCreate ? (
        <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeForm()}>
          <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="unit-form-title">
            <div className="sheet-handle" aria-hidden="true" />
            <div className="sheet-header">
              <div><p className="eyebrow">{editingUnit ? 'Update your schedule' : 'New unit'}</p><h2 id="unit-form-title">{editingUnit ? 'Edit unit' : 'Add a unit'}</h2></div>
              <button type="button" className="icon-button close-button" onClick={closeForm}>Close</button>
            </div>
            <form className="course-form" onSubmit={(event) => void submit(event)}>
              <div className="form-grid">
                <label className="form-field form-field-wide"><span>Unit name</span><input autoFocus required maxLength={100} value={formValues.name} onChange={(event) => setFormValues({ ...formValues, name: event.target.value })} /></label>
                <label className="form-field"><span>Unit code</span><input required maxLength={30} value={formValues.code} onChange={(event) => setFormValues({ ...formValues, code: event.target.value })} /></label>
                <label className="form-field"><span>Default lecturer</span><input maxLength={100} value={formValues.defaultLecturer ?? ''} onChange={(event) => setFormValues({ ...formValues, defaultLecturer: event.target.value })} /></label>
              </div>
              <div className="form-grid">
                <label className="form-field"><span>Default lesson mode</span><select value={formValues.defaultMode} onChange={(event) => setFormValues({ ...formValues, defaultMode: event.target.value === 'online' ? 'online' : 'physical' })}><option value="physical">Physical</option><option value="online">Online</option></select></label>
                <label className="form-field"><span>Unit color</span><input className="color-input" type="color" value={formValues.color} onChange={(event) => setFormValues({ ...formValues, color: event.target.value })} /></label>
              </div>
              <label className="form-field"><span>Semester</span><input required maxLength={60} value={formValues.semester} onChange={(event) => setFormValues({ ...formValues, semester: event.target.value })} placeholder="Semester 1, 2027" /></label>

              <div className="section-heading"><h3>Lessons</h3><button type="button" className="text-button" onClick={startAddLesson}>+ Add lesson</button></div>
              {lessons.map((lesson) => (
                <article className="lesson-editor-card" key={lesson.id}>
                  <div><strong>{lesson.day} · {lesson.startTime}–{lesson.endTime}</strong><p>{lesson.label || lesson.type} · {lesson.mode === 'online' ? 'Online' : lesson.location}</p></div>
                  <div className="course-actions">
                    <button type="button" className="icon-button" onClick={() => editLesson(lesson)}>Edit</button>
                    <button type="button" className="icon-button" onClick={() => duplicateLesson(lesson)}>Duplicate lesson</button>
                    <button type="button" className="icon-button danger-button" onClick={() => setLessons((current) => current.filter((item) => item.id !== lesson.id))}>Remove</button>
                  </div>
                </article>
              ))}
              {lessons.length === 0 ? <p>No lessons added yet.</p> : null}

              {lessonEditorOpen ? (
                <fieldset className="lesson-editor">
                  <legend>{editingLessonId ? 'Edit lesson' : 'New lesson'}</legend>
                  <fieldset className="form-field day-field">
                    <legend>Days</legend>
                    <div className="day-picker">
                      {weekdays.map((day) => (
                        <label className="day-option" key={day}>
                          <input type="checkbox" aria-label={`Lesson day ${day}`} checked={selectedDays.includes(day)} onChange={() => toggleDay(day)} />
                          <span>{day.slice(0, 1)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="form-grid">
                    <label className="form-field"><span>Start time</span><input type="time" min="07:00" max="17:00" required value={lessonDraft.startTime} onChange={(event) => updateLesson('startTime', event.target.value)} /></label>
                    <label className="form-field"><span>End time</span><input type="time" min="08:00" max="18:00" required value={lessonDraft.endTime} onChange={(event) => updateLesson('endTime', event.target.value)} /></label>
                  </div>
                  <div className="form-grid">
                    <label className="form-field"><span>Lesson type</span><select value={lessonDraft.type} onChange={(event) => updateLesson('type', event.target.value as LessonType)}><option value="lecture">Lecture</option><option value="tutorial">Tutorial</option><option value="lab">Lab</option><option value="other">Other</option></select></label>
                    <label className="form-field"><span>Label (optional)</span><input value={lessonDraft.label ?? ''} onChange={(event) => updateLesson('label', event.target.value)} placeholder="Part 1" /></label>
                  </div>
                  <label className="form-field"><span>Lesson mode</span><select value={lessonDraft.mode} onChange={(event) => updateLesson('mode', event.target.value === 'online' ? 'online' : 'physical')}><option value="physical">Physical</option><option value="online">Online</option></select></label>
                  {lessonDraft.mode === 'physical' ? (
                    <label className="form-field"><span>Location</span><input required value={lessonDraft.location} onChange={(event) => updateLesson('location', event.target.value)} placeholder="S301 or Labs" /></label>
                  ) : (
                    <label className="form-field"><span>Meeting link (optional, HTTPS)</span><input type="url" value={lessonDraft.meetingLink} onChange={(event) => updateLesson('meetingLink', event.target.value)} placeholder="https://..." /></label>
                  )}
                  <label className="form-field"><span>Lecturer override (optional)</span><input value={lessonDraft.lecturer ?? ''} onChange={(event) => updateLesson('lecturer', event.target.value)} /></label>
                  <label className="form-field"><span>Note (optional)</span><textarea rows={2} value={lessonDraft.note ?? ''} onChange={(event) => updateLesson('note', event.target.value)} /></label>
                  <div className="sheet-actions"><button type="button" className="secondary-button" onClick={() => { setEditingLessonId(null); setSelectedDays([]); setLessonEditorOpen(false); setFormError('') }}>Cancel lesson</button><button type="button" className="primary-button" onClick={saveLessonDraft}>{editingLessonId ? 'Save lesson' : 'Add selected lessons'}</button></div>
                </fieldset>
              ) : null}
              {formError ? <p className="form-error" role="alert">{formError}</p> : null}
              <div className="sheet-actions">
                <button type="button" className="secondary-button" onClick={closeForm}>Cancel</button>
                <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : editingUnit ? 'Save changes' : 'Add unit'}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}
