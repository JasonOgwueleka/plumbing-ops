// Used for both "Add lead" (/leads/new) and "Edit lead" (/leads/:id/edit).
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { emptyToNull, statusLabel } from '../../lib/format'
import { Field } from '../customers/CustomerForm'
import ErrorMessage from '../../components/ErrorMessage'

const EMPTY = {
  first_name: '', last_name: '', email: '', phone: '', address: '', city: '',
  source: '', description: '', status: 'new',
}

// "converted" is only set by the Convert button, not chosen by hand.
const EDITABLE_STATUSES = ['new', 'contacted', 'lost']

export default function LeadForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    supabase
      .from('leads')
      .select('first_name, last_name, email, phone, address, city, source, description, status')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) return setError(error.message)
        setForm(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? ''])))
      })
  }, [id])

  function update(field, value) {
    setForm({ ...form, [field]: value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const values = emptyToNull(form)
    const { error } = id
      ? await supabase.from('leads').update(values).eq('id', id)
      : await supabase.from('leads').insert(values)

    setSaving(false)
    if (error) return setError(error.message)
    navigate('/leads')
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{id ? 'Edit lead' : 'Add lead'}</h1>
      <ErrorMessage message={error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" value={form.first_name} onChange={(v) => update('first_name', v)} required />
        <Field label="Last name" value={form.last_name} onChange={(v) => update('last_name', v)} required />
        <Field label="Email" type="email" value={form.email} onChange={(v) => update('email', v)} />
        <Field label="Phone" value={form.phone} onChange={(v) => update('phone', v)} />
        <Field label="Address" value={form.address} onChange={(v) => update('address', v)} />
        <Field label="City" value={form.city} onChange={(v) => update('city', v)} />
        <Field label="Source (website, referral, phone...)" value={form.source} onChange={(v) => update('source', v)} />
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={(e) => update('status', e.target.value)}>
            {EDITABLE_STATUSES.map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
        </div>
      </div>

      <label className="label mt-4">What do they need?</label>
      <textarea className="input" rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} />

      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        <button type="button" className="btn-secondary" onClick={() => navigate('/leads')}>Cancel</button>
      </div>
    </form>
  )
}
