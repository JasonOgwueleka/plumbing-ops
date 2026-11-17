// Used for both "Add customer" (/customers/new) and "Edit customer" (/customers/:id/edit).
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { emptyToNull } from '../../lib/format'
import ErrorMessage from '../../components/ErrorMessage'

const EMPTY = { first_name: '', last_name: '', email: '', phone: '', address: '', city: '', notes: '' }

export default function CustomerForm() {
  const { id } = useParams() // undefined when adding a new customer
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // When editing, load the existing customer into the form.
  useEffect(() => {
    if (!id) return
    supabase
      .from('customers')
      .select('first_name, last_name, email, phone, address, city, notes')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) return setError(error.message)
        // Replace NULLs with '' so the inputs are controlled.
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
    const result = id
      ? await supabase.from('customers').update(values).eq('id', id).select().single()
      : await supabase.from('customers').insert(values).select().single()

    setSaving(false)
    if (result.error) return setError(result.error.message)
    navigate(`/customers/${result.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">{id ? 'Edit customer' : 'Add customer'}</h1>
      <ErrorMessage message={error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" value={form.first_name} onChange={(v) => update('first_name', v)} required />
        <Field label="Last name" value={form.last_name} onChange={(v) => update('last_name', v)} required />
        <Field label="Email" type="email" value={form.email} onChange={(v) => update('email', v)} />
        <Field label="Phone" value={form.phone} onChange={(v) => update('phone', v)} />
        <Field label="Address" value={form.address} onChange={(v) => update('address', v)} />
        <Field label="City" value={form.city} onChange={(v) => update('city', v)} />
      </div>

      <label className="label mt-4">Notes</label>
      <textarea className="input" rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} />

      <div className="mt-4 flex gap-2">
        <button type="submit" className="btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
      </div>
    </form>
  )
}

// A labelled text input (also used by the lead form).
export function Field({ label, value, onChange, type = 'text', required = false }) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>
      <input
        type={type}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  )
}
