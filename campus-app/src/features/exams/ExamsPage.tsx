import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { courseRepository, examRepository } from '../../db/repositories'
import type { Course, Exam } from '../../types'

type ExamValues = Omit<Exam, 'id' | 'updatedAt'>

const emptyValues = (): ExamValues => ({
  courseId: '',
  title: '',
  date: '',
  time: '09:00',
  location: '',
  weight: 0,
})

export function ExamsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [courses, setCourses] = useState<Course[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [formOpen, setFormOpen] = useState(searchParams.get('new') === '1')
  const [editing, setEditing] = useState<Exam | null>(null)
  const [values, setValues] = useState<ExamValues>(emptyValues)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [undoExam, setUndoExam] = useState<Exam | null>(null)

  useEffect(() => {
    void Promise.all([courseRepository.list(), examRepository.list()])
      .then(([savedCourses, savedExams]) => {
        setCourses(savedCourses)
        setExams(savedExams)
      })
      .catch(() => setError('Your exams could not be loaded.'))
  }, [])

  const close = () => {
    setFormOpen(false)
    setEditing(null)
    setValues(emptyValues())
    setSearchParams({}, { replace: true })
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!values.courseId || !values.title.trim() || !values.date) {
      setError('Add a title, course, and date.')
      return
    }
    const exam: Exam = {
      ...values,
      id: editing?.id ?? crypto.randomUUID(),
      title: values.title.trim(),
      location: values.location.trim(),
      weight: Number(values.weight),
      updatedAt: new Date().toISOString(),
    }
    try {
      await examRepository.put(exam)
      setExams((current) => [exam, ...current.filter((entry) => entry.id !== exam.id)])
      close()
      setToast(editing ? 'Exam updated' : 'Exam added')
      setUndoExam(editing ? null : exam)
    } catch {
      setError('This exam could not be saved.')
    }
  }

  const remove = async (exam: Exam) => {
    if (!window.confirm(`Delete "${exam.title}"?`)) return
    await examRepository.remove(exam.id)
    setExams((current) => current.filter((entry) => entry.id !== exam.id))
    setToast('Exam deleted')
    setUndoExam(exam)
  }

  const edit = (exam: Exam) => {
    setEditing(exam)
    setValues({
      courseId: exam.courseId,
      title: exam.title,
      date: exam.date,
      time: exam.time,
      location: exam.location,
      weight: exam.weight,
    })
    setFormOpen(true)
  }

  return (
    <section className="page-panel">
      <div className="page-header"><div><p className="eyebrow">Exams</p><h1>Tests</h1></div><button type="button" className="chip-button accent" onClick={() => { setEditing(null); setValues(emptyValues()); setFormOpen(true) }}>+ New</button></div>
      {error ? <div className="feedback-card error-card" role="alert">{error}</div> : null}
      {exams.length === 0 ? (
        <div className="empty-state"><span className="empty-state-mark">E</span><h2>No exams scheduled</h2><p>Add an exam to see it on your weekly schedule.</p><button type="button" className="primary-button" onClick={() => setFormOpen(true)}>Add exam</button></div>
      ) : (
        <div className="inset-list">
          {exams.map((exam) => {
            const course = courses.find((entry) => entry.id === exam.courseId)
            return (
              <article className="assignment-row" style={{ '--course-color': course?.color ?? '#777' } as CSSProperties} key={exam.id}>
                <div className="exam-date"><strong>{new Date(`${exam.date}T${exam.time}`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong><span>{exam.time}</span></div>
                <div className="assignment-copy"><strong>{exam.title}</strong><span>{course?.code || 'No course'} · {exam.location || 'Location not set'} · {exam.weight}%</span></div>
                <button type="button" className="icon-button" onClick={() => edit(exam)}>Edit</button>
                <button type="button" className="icon-button danger-button" onClick={() => void remove(exam)}>Delete</button>
              </article>
            )
          })}
        </div>
      )}
      {formOpen ? (
        <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
          <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="exam-form-title">
            <div className="sheet-handle" /><div className="sheet-header"><div><p className="eyebrow">{editing ? 'Update exam' : 'New exam'}</p><h2 id="exam-form-title">{editing ? 'Edit exam' : 'Add exam'}</h2></div><button type="button" className="icon-button close-button" onClick={close}>Close</button></div>
            <form className="course-form" onSubmit={(event) => void submit(event)}>
              <label className="form-field">Title<input required value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></label>
              <label className="form-field">Course<select required value={values.courseId} onChange={(event) => setValues({ ...values, courseId: event.target.value })}><option value="">Choose a course</option>{courses.map((course) => <option value={course.id} key={course.id}>{course.code} — {course.name}</option>)}</select></label>
              <div className="form-grid"><label className="form-field">Date<input type="date" required value={values.date} onChange={(event) => setValues({ ...values, date: event.target.value })} /></label><label className="form-field">Time<input type="time" required value={values.time} onChange={(event) => setValues({ ...values, time: event.target.value })} /></label></div>
              <div className="form-grid"><label className="form-field">Location<input value={values.location} onChange={(event) => setValues({ ...values, location: event.target.value })} /></label><label className="form-field">Weight (%)<input type="number" min="0" max="100" step="0.1" required value={values.weight} onChange={(event) => setValues({ ...values, weight: Number(event.target.value) })} /></label></div>
              <div className="sheet-actions"><button type="button" className="secondary-button" onClick={close}>Cancel</button><button type="submit" className="primary-button">{editing ? 'Save changes' : 'Add exam'}</button></div>
            </form>
          </section>
        </div>
      ) : null}
      {toast ? (
        <div className="app-toast" role="status">
          <span>{toast}</span>
          {undoExam ? (
            <button type="button" className="text-button" onClick={async () => {
              await examRepository.put(undoExam)
              setExams((current) => [undoExam, ...current.filter((entry) => entry.id !== undoExam.id)])
              setUndoExam(null)
              setToast('Restored')
            }}>Undo</button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
