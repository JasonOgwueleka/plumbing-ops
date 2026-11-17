// Job detail page: info, status update and notes.
// Technicians can change the status and add notes on their own jobs.
// Admins/managers can also edit and delete the job.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { JOB_STATUSES, formatDateTime, fullName, statusLabel } from '../../lib/format'
import StatusBadge from '../../components/StatusBadge'
import ConfirmButton from '../../components/ConfirmButton'
import ErrorMessage from '../../components/ErrorMessage'

// Statuses a technician may choose (the database enforces the same rule).
const TECHNICIAN_STATUSES = ['scheduled', 'in_progress', 'completed']

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isOffice = profile.role === 'admin' || profile.role === 'manager'

  const [job, setJob] = useState(null)
  const [notes, setNotes] = useState([])
  const [newNote, setNewNote] = useState('')
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)

  async function loadJob() {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers ( id, first_name, last_name, phone, email ),
        technician:profiles!jobs_assigned_to_fkey ( full_name )
      `)
      .eq('id', id)
      .maybeSingle()
    if (error) return setError(error.message)
    if (!data) return setNotFound(true) // doesn't exist, or not yours (RLS)
    setJob(data)
  }

  async function loadNotes() {
    const { data, error } = await supabase
      .from('job_notes')
      .select('id, body, created_at, author:profiles ( full_name )')
      .eq('job_id', id)
      .order('created_at')
    if (error) return setError(error.message)
    setNotes(data)
  }

  useEffect(() => {
    loadJob()
    loadNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function changeStatus(status) {
    setError('')
    const { error } = await supabase.from('jobs').update({ status }).eq('id', id)
    if (error) return setError(error.message)
    loadJob()
  }

  async function addNote(e) {
    e.preventDefault()
    if (!newNote.trim()) return
    setError('')
    const { error } = await supabase.from('job_notes').insert({ job_id: id, body: newNote.trim() })
    if (error) return setError(error.message)
    setNewNote('')
    loadNotes()
  }

  async function deleteNote(noteId) {
    const { error } = await supabase.from('job_notes').delete().eq('id', noteId)
    if (error) return setError(error.message)
    loadNotes()
  }

  async function deleteJob() {
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (error) return setError(error.message)
    navigate('/jobs')
  }

  if (notFound) return <p>Job not found.</p>
  if (!job) return error ? <ErrorMessage message={error} /> : <p>Loading...</p>

  const statusOptions = isOffice ? JOB_STATUSES : TECHNICIAN_STATUSES

  return (
    <div className="max-w-3xl">
      <ErrorMessage message={error} />

      <div className="card mb-6">
        <div className="mb-4 flex flex-wrap items-start gap-2">
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <StatusBadge status={job.status} />
          {isOffice && (
            <div className="ml-auto flex gap-2">
              <Link to={`/jobs/${id}/edit`} className="btn-secondary">Edit</Link>
              <ConfirmButton onConfirm={deleteJob}>Delete</ConfirmButton>
            </div>
          )}
        </div>

        {job.description && <p className="mb-4 whitespace-pre-wrap">{job.description}</p>}

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Info label="Customer">
            {isOffice ? (
              <Link to={`/customers/${job.customer.id}`} className="text-blue-700 hover:underline">
                {fullName(job.customer)}
              </Link>
            ) : (
              fullName(job.customer)
            )}
          </Info>
          <Info label="Customer phone">{job.customer.phone || '—'}</Info>
          <Info label="Address">{job.address || '—'}</Info>
          <Info label="Scheduled">{formatDateTime(job.scheduled_date)}</Info>
          <Info label="Technician">{job.technician?.full_name ?? 'Unassigned'}</Info>
        </dl>

        {/* Status update. A technician can't change a cancelled job. */}
        {(isOffice || job.status !== 'cancelled') && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
            <span className="text-sm font-medium">Update status:</span>
            {statusOptions.map((s) => (
              <button
                key={s}
                type="button"
                className={s === job.status ? 'btn' : 'btn-secondary'}
                disabled={s === job.status}
                onClick={() => changeStatus(s)}
              >
                {statusLabel(s)}
              </button>
            ))}
          </div>
        )}
      </div>

      <h2 className="mb-2 text-lg font-semibold">Notes</h2>
      <div className="card">
        {notes.length === 0 && <p className="mb-4 text-sm text-gray-500">No notes yet.</p>}
        <ul className="mb-4 space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="border-b border-gray-100 pb-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium text-gray-700">{note.author?.full_name ?? 'Former employee'}</span>
                <span>{formatDateTime(note.created_at)}</span>
                {isOffice && (
                  <span className="ml-auto">
                    <ConfirmButton className="text-red-600 hover:underline" onConfirm={() => deleteNote(note.id)}>
                      Delete
                    </ConfirmButton>
                  </span>
                )}
              </div>
              {/* React escapes text automatically, so notes can't inject HTML. */}
              <p className="whitespace-pre-wrap text-sm">{note.body}</p>
            </li>
          ))}
        </ul>

        <form onSubmit={addNote}>
          <textarea
            className="input mb-2"
            rows={3}
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <button type="submit" className="btn" disabled={!newNote.trim()}>Add note</button>
        </form>
      </div>
    </div>
  )
}

function Info({ label, children }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
