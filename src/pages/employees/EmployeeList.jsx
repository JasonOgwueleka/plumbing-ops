// Admin-only: list staff, create accounts, deactivate/reactivate them.
// Creating and (de)activating accounts goes through the manage-employee
// edge function, because it needs the service role key, which must never
// be in the browser.
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import ConfirmButton from '../../components/ConfirmButton'
import ErrorMessage from '../../components/ErrorMessage'

const EMPTY = { full_name: '', email: '', phone: '', role: 'technician', password: '' }

// Calls the edge function and returns an error message (or '' on success).
async function callManageEmployee(body) {
  const { error } = await supabase.functions.invoke('manage-employee', { body })
  if (!error) return ''
  // The function returns { error: "..." }. Try to show that message.
  try {
    const details = await error.context.json()
    return details.error ?? error.message
  } catch {
    return error.message
  }
}

export default function EmployeeList() {
  const { profile: me } = useAuth()
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadEmployees() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('is_active', { ascending: false })
      .order('full_name')
    if (error) setError(error.message)
    else setEmployees(data)
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  function update(field, value) {
    setForm({ ...form, [field]: value })
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const message = await callManageEmployee({ action: 'create', ...form })
    setSaving(false)

    if (message) return setError(message)
    setSuccess(`Account created for ${form.full_name}. Give them their email and password.`)
    setForm(EMPTY)
    loadEmployees()
  }

  async function setActive(employee, active) {
    setError('')
    setSuccess('')
    const message = await callManageEmployee({
      action: active ? 'reactivate' : 'deactivate',
      user_id: employee.id,
    })
    if (message) return setError(message)
    setSuccess(`${employee.full_name} has been ${active ? 'reactivated' : 'deactivated'}.`)
    loadEmployees()
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Employees</h1>
      <ErrorMessage message={error} />
      {success && (
        <p className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{success}</p>
      )}

      <div className="card mb-8 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className={emp.is_active ? '' : 'text-gray-400'}>
                <td className="font-medium">{emp.full_name}</td>
                <td>{emp.email}</td>
                <td>{emp.phone}</td>
                <td className="capitalize">{emp.role}</td>
                <td>{emp.is_active ? 'Active' : 'Deactivated'}</td>
                <td className="text-right">
                  {emp.id === me.id ? (
                    <span className="text-xs text-gray-400">(you)</span>
                  ) : emp.is_active ? (
                    <ConfirmButton onConfirm={() => setActive(emp, false)}>Deactivate</ConfirmButton>
                  ) : (
                    <button className="btn-secondary" onClick={() => setActive(emp, true)}>Reactivate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleCreate} className="card max-w-2xl">
        <h2 className="mb-4 text-lg font-semibold">Create staff account</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Full name *</label>
            <input className="input" value={form.full_name} onChange={(e) => update('full_name', e.target.value)} required />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>
          <div>
            <label className="label">Role *</label>
            <select className="input" value={form.role} onChange={(e) => update('role', e.target.value)}>
              <option value="technician">Technician</option>
              <option value="manager">Manager / dispatcher</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="label">Temporary password * (min 8 characters)</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>
        </div>
        <button type="submit" className="btn mt-4" disabled={saving}>
          {saving ? 'Creating...' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
