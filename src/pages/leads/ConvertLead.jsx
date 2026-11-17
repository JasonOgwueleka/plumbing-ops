// Converts a lead into a customer + a job, using the convert_lead
// database function (which does everything in one transaction).
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fullName, fromDateTimeInput } from '../../lib/format'
import { fetchTechnicians } from '../../lib/technicians'
import ErrorMessage from '../../components/ErrorMessage'

export default function ConvertLead() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [technicians, setTechnicians] = useState([])
  const [form, setForm] = useState({ title: '', description: '', scheduled_date: '', assigned_to: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) return setError(error.message)
        setLead(data)
        setForm((f) => ({ ...f, description: data.description ?? '' }))
      })

    fetchTechnicians().then(setTechnicians).catch((err) => setError(err.message))
  }, [id])

  function update(field, value) {
    setForm({ ...form, [field]: value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { data: jobId, error } = await supabase.rpc('convert_lead', {
      p_lead_id: id,
      p_job_title: form.title,
      p_job_description: form.description || null,
      p_scheduled_date: fromDateTimeInput(form.scheduled_date),
      p_assigned_to: form.assigned_to || null,
    })

    setSaving(false)
    if (error) return setError(error.message)
    navigate(`/jobs/${jobId}`)
  }

  if (!lead) return error ? <ErrorMessage message={error} /> : <p>Loading...</p>

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">Convert lead</h1>
      <p className="mb-4 text-sm text-gray-600">
        This creates a customer for <strong>{fullName(lead)}</strong> using the lead's contact details,
        and a new job for them.
      </p>
      <ErrorMessage message={error} />

      {lead.status === 'converted' ? (
        <p className="text-sm">This lead has already been converted.</p>
      ) : (
        <>
          <label className="label">Job title <span className="text-red-600">*</span></label>
          <input className="input mb-4" value={form.title} onChange={(e) => update('title', e.target.value)} required />

          <label className="label">Job description</label>
          <textarea className="input mb-4" rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Scheduled date (optional)</label>
              <input type="datetime-local" className="input" value={form.scheduled_date} onChange={(e) => update('scheduled_date', e.target.value)} />
            </div>
            <div>
              <label className="label">Assign technician (optional)</label>
              <select className="input" value={form.assigned_to} onChange={(e) => update('assigned_to', e.target.value)}>
                <option value="">Unassigned</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button type="submit" className="btn" disabled={saving}>{saving ? 'Converting...' : 'Convert to customer + job'}</button>
            <button type="button" className="btn-secondary" onClick={() => navigate('/leads')}>Cancel</button>
          </div>
        </>
      )}
    </form>
  )
}
