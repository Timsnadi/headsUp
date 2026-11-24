import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { assignmentRepository, unitRepository } from '../../db/repositories'
import type { Assignment, AssignmentStatus, Unit } from '../../types'

type Filter = 'Upcoming' | 'Overdue' | 'Completed'
type FormValues = {
  title: string
  unitId: string
  dueDate: string
  priority: Assignment['priority']
  status: AssignmentStatus
  notes: string
}

const emptyValues: FormValues = {
  title: '',
  unitId: '',
  dueDate: '',
  priority: 'medium',
  status: 'upcoming',
  notes: '',
}

function dateTimeInput(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function AssignmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [filter, setFilter] = useState<Filter>('Upcoming')
  const [editing, setEditing] = useState<Assignment | null>(null)
  const [formOpen, setFormOpen] = useState(searchParams.get('new') === '1')
  const [values, setValues] = useState<FormValues>(emptyValues)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [undoAssignment, setUndoAssignment] = useState<Assignment | null>(null)

  useEffect(() => {
    let active = true
    void Promise.all([assignmentRepository.list(), unitRepository.list()])
      .then(([savedAssignments, savedUnits]) => {
        if (active) {
          setAssignments(savedAssignments)
          setUnits(savedUnits)
        }
      })
      .catch(() => active && setError('Your assignments could not be loaded.'))
    return () => { active = false }
  }, [])

  const openNew = () => {
    setEditing(null)
    setValues(emptyValues)
    setFormOpen(true)
  }

  const openEdit = (item: Assignment) => {
    setEditing(item)
    setValues({
      title: item.title,
      unitId: item.unitId,
      dueDate: dateTimeInput(item.dueDate),
      priority: item.priority,
      status: item.status,
      notes: item.notes ?? '',
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
    setValues(emptyValues)
    setSearchParams({}, { replace: true })
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!values.unitId || !values.title.trim() || !values.dueDate) {
      setError('Add a title, unit, and due date.')
      return
    }
    const item: Assignment = {
      id: editing?.id ?? crypto.randomUUID(),
      unitId: values.unitId,
      title: values.title.trim(),
      dueDate: new Date(values.dueDate).toISOString(),
      priority: values.priority,
      status: values.status,
      notes: values.notes.trim(),
      updatedAt: new Date().toISOString(),
    }
    try {
      await assignmentRepository.put(item)
      setAssignments((current) => [item, ...current.filter((entry) => entry.id !== item.id)])
      closeForm()
      setToast(editing ? 'Assignment updated' : 'Assignment added')
      setUndoAssignment(editing ? null : item)
      window.setTimeout(() => setToast(''), 3500)
    } catch {
      setError('This assignment could not be saved.')
    }
  }

  const remove = async (item: Assignment) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return
    await assignmentRepository.remove(item.id)
    setAssignments((current) => current.filter((entry) => entry.id !== item.id))
    setToast('Assignment deleted')
    setUndoAssignment(item)
  }

  const complete = async (item: Assignment) => {
    const updated = { ...item, status: 'done' as const, updatedAt: new Date().toISOString() }
    await assignmentRepository.put(updated)
    setAssignments((current) => current.map((entry) => entry.id === item.id ? updated : entry))
  }

  const now = Date.now()
  const visible = assignments.filter((item) => {
    const overdue = item.status !== 'done' && new Date(item.dueDate).getTime() < now
    if (filter === 'Completed') return item.status === 'done'
    if (filter === 'Overdue') return overdue
    return item.status !== 'done' && !overdue
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const groups = visible.reduce<Record<string, Assignment[]>>((result, item) => {
    const key = new Intl.DateTimeFormat(undefined, {
      timeZone: 'Africa/Nairobi',
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }).format(new Date(item.dueDate))
    ;(result[key] ??= []).push(item)
    return result
  }, {})

  return (
    <section className="page-panel">
      <div className="page-header">
        <div><p className="eyebrow">Assignments</p><h1>Work</h1></div>
        <button type="button" className="chip-button accent" onClick={openNew}>+ New</button>
      </div>
      <div className="filter-row" role="group" aria-label="Assignment filter">
        {(['Upcoming', 'Overdue', 'Completed'] as Filter[]).map((option) => (
          <button type="button" key={option} className={filter === option ? 'filter-chip active' : 'filter-chip'} onClick={() => setFilter(option)}>{option}</button>
        ))}
      </div>
      {error ? <div className="feedback-card error-card" role="alert">{error}</div> : null}
      {visible.length === 0 ? (
        <div className="empty-state"><span className="empty-state-mark">✓</span><h2>{filter === 'Completed' ? 'Nothing completed yet' : 'No assignments here'}</h2><p>{filter === 'Completed' ? 'Completed work will appear here.' : 'Add an assignment to keep your semester on track.'}</p><button type="button" className="primary-button" onClick={openNew}>Add assignment</button></div>
      ) : (
        <div className="inset-list">
          {Object.entries(groups).map(([date, items]) => (
            <section className="date-group" key={date}>
              <h2>{date}</h2>
              {items.map((item) => {
                const unit = units.find((entry) => entry.id === item.unitId)
                const due = new Date(item.dueDate).getTime()
                const overdue = item.status !== 'done' && due < now
                const soon = item.status !== 'done' && !overdue && due - now <= 48 * 60 * 60 * 1000
                return (
                  <article className="assignment-row" style={{ '--course-color': unit?.color ?? '#777' } as CSSProperties} key={item.id}>
                    <button type="button" className={item.status === 'done' ? 'complete-check checked' : 'complete-check'} aria-label={`Mark ${item.title} complete`} onClick={() => void complete(item)}>{item.status === 'done' ? '✓' : ''}</button>
                    <div className="assignment-copy"><strong>{item.title}</strong><span>{unit?.code || 'No unit'} · {new Intl.DateTimeFormat([], { timeZone: 'Africa/Nairobi', hour: 'numeric', minute: '2-digit' }).format(new Date(item.dueDate))}</span>{soon ? <em className="due-soon">Due soon</em> : overdue ? <em className="overdue">Overdue</em> : null}</div>
                    <button type="button" className="icon-button" onClick={() => openEdit(item)}>Edit</button>
                    <button type="button" className="icon-button danger-button" onClick={() => void remove(item)}>Delete</button>
                  </article>
                )
              })}
            </section>
          ))}
        </div>
      )}
      {formOpen ? (
        <div className="sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeForm()}>
          <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="assignment-form-title">
            <div className="sheet-handle" />
            <div className="sheet-header"><div><p className="eyebrow">{editing ? 'Update work' : 'New work'}</p><h2 id="assignment-form-title">{editing ? 'Edit assignment' : 'Add assignment'}</h2></div><button type="button" className="icon-button close-button" onClick={closeForm}>Close</button></div>
            <form className="course-form" onSubmit={(event) => void submit(event)}>
              <label className="form-field">Title<input required value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} /></label>
              <label className="form-field">Unit<select required value={values.unitId} onChange={(event) => setValues({ ...values, unitId: event.target.value })}><option value="">Choose a unit</option>{units.map((unit) => <option value={unit.id} key={unit.id}>{unit.code} — {unit.name}</option>)}</select></label>
              <div className="form-grid"><label className="form-field">Due date and time<input type="datetime-local" required value={values.dueDate} onChange={(event) => setValues({ ...values, dueDate: event.target.value })} /></label><label className="form-field">Priority<select value={values.priority} onChange={(event) => setValues({ ...values, priority: event.target.value as Assignment['priority'] })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div>
              <label className="form-field">Status<select value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value as AssignmentStatus })}><option value="upcoming">Upcoming</option><option value="in-progress">In progress</option><option value="done">Completed</option></select></label>
              <label className="form-field">Notes<textarea rows={3} value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} /></label>
              <div className="sheet-actions"><button type="button" className="secondary-button" onClick={closeForm}>Cancel</button><button type="submit" className="primary-button">{editing ? 'Save changes' : 'Add assignment'}</button></div>
            </form>
          </section>
        </div>
      ) : null}
      {toast ? (
        <div className="app-toast" role="status">
          <span>{toast}</span>
          {undoAssignment ? (
            <button type="button" className="text-button" onClick={async () => {
              await assignmentRepository.put(undoAssignment)
              setAssignments((current) => [undoAssignment, ...current.filter((entry) => entry.id !== undoAssignment.id)])
              setUndoAssignment(null)
              setToast('Restored')
            }}>Undo</button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
