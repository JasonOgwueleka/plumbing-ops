// Used for both "New job" (/jobs/new) and "Edit job" (/jobs/:id/edit).
// Admins and managers only.
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { JOB_STATUSES, emptyToNull, fromDateTimeInput, fullName, statusLabel, toDateTimeInput } from '../../lib/format'
import { fetchTechnicians } from '../../lib/technicians'
import ErrorMessage from '../../components/ErrorMessage'

export default function JobForm() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    title: '',
    description: '',
    customer_id: searchParams.get('customer') ?? '', // pre-selected from the customer page
    address: '',
    scheduled_date: '',
    assigned_to: '',
    status: 'new',
  })
  const [customers, setCustomers] = useState([])
  const [technicians, setTechnicians] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Load dropdown options, and the job itself when editing.
  useEffect(() => {
    supabase
      .from('customers')
      .select('id, first_name, last_name, address, city')
      .order('last_name')
      .then(({ data, error }) => (error ? setError(error.message) : setCustomers(data)))

    fetchTechnicians().then(setTechnicians).catch((err) => setError(err.message))

    if (id) {
      supabase
        .from('jobs')
        .select('title, description, customer_id, address, scheduled_date, assigned_to, status')
        .eq('id', id)
        .single()
        .then(({ data, error }) => {
          if (error) return setError(error.message)
          setForm({
            ...data,
            description: data.description ?? '',
            address: data.address ?? '',
            assigned_to: data.assigned_to ?? '',
            scheduled_date: toDateTimeInput(data.scheduled_date),
          })
        })
    }
  }, [id])

  // For a new job, fill the address from the chosen customer.
  useEffect(() => {
    if (id || !form.customer_id || form.address) return
    const customer = customers.find((c) => c.id === form.customer_id)
    if (customer) {
      setForm((f) => ({ ...f, address: [customer.address, customer.city].filter(Boolean).join(', ') }))
    }
  }, [id, form.customer_id, form.address, customers])

  function update(field, value) {
    setForm({ ...form, [field]: value })
  }

  function changeCustomer(customerId) {
    // Clear the address so the effect above fills in the new customer's address.
    setForm({ ...form, customer_id: customerId, address: '' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const values = emptyToNull({ ...form, scheduled_date: fromDateTimeInput(form.scheduled_date) })
    const result = id
      ? await supabase.from('jobs').update(values).eq('id', id).select().single()
      : await supabase.from('jobs').insert(values).select().single()

    setSaving(false)
    if (result.error) return setError(result.error.message)
    navigate(`/jobs/${result.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{id ? 'Edit job' : 'New job'}</h1>
      <ErrorMessage message={error} />

      <label className="label">Title <span className="text-red-600">*</span></label>
      <input className="input mb-4" value={form.title} onChange={(e) => update('title', e.target.value)} required />

      <label className="label">Description</label>
      <textarea className="input mb-4" rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Customer <span className="text-red-600">*</span></label>
          <select className="input" value={form.customer_id} onChange={(e) => changeCustomer(e.target.value)} required>
            <option value="">Choose a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{fullName(c)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Address</label>
          <input className="input" value={form.address} onChange={(e) => update('address', e.target.value)} />
        </div>
        <div>
          <label className="label">Scheduled date</label>
          <input type="datetime-local" className="input" value={form.scheduled_date} onChange={(e) => update('scheduled_date', e.target.value)} />
        </div>
        <div>
          <label className="label">Technician</label>
          <select className="input" value={form.assigned_to} onChange={(e) => update('assigned_to', e.target.value)}>
            <option value="">Unassigned</option>
            {/* Keep showing a technician who has since been deactivated. */}
            {form.assigned_to && !technicians.some((t) => t.id === form.assigned_to) && (
              <option value={form.assigned_to}>Inactive technician</option>
            )}
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={(e) => update('status', e.target.value)}>
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
      </div>
    </form>
  )
}
