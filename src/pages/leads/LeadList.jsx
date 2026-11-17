import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { LEAD_STATUSES, fullName, formatDateTime, statusLabel } from '../../lib/format'
import StatusBadge from '../../components/StatusBadge'
import ConfirmButton from '../../components/ConfirmButton'
import ErrorMessage from '../../components/ErrorMessage'

export default function LeadList() {
  const [leads, setLeads] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [error, setError] = useState('')

  async function loadLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setLeads(data)
  }

  useEffect(() => {
    loadLeads()
  }, [])

  async function handleDelete(id) {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) return setError(error.message)
    loadLeads()
  }

  const visible = statusFilter ? leads.filter((l) => l.status === statusFilter) : leads

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Leads</h1>
        <select className="input max-w-[12rem]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
        <Link to="/leads/new" className="btn ml-auto">Add lead</Link>
      </div>
      <ErrorMessage message={error} />

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Needs</th>
              <th>Source</th>
              <th>Status</th>
              <th>Added</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((lead) => (
              <tr key={lead.id}>
                <td className="font-medium">{fullName(lead)}</td>
                <td>
                  <div>{lead.phone}</div>
                  <div className="text-gray-500">{lead.email}</div>
                </td>
                <td className="max-w-xs">{lead.description}</td>
                <td>{lead.source}</td>
                <td><StatusBadge status={lead.status} /></td>
                <td className="whitespace-nowrap">{formatDateTime(lead.created_at)}</td>
                <td>
                  <div className="flex flex-wrap justify-end gap-2">
                    {lead.status === 'converted' ? (
                      <Link to={`/customers/${lead.converted_customer_id}`} className="btn-secondary">
                        View customer
                      </Link>
                    ) : (
                      <>
                        <Link to={`/leads/${lead.id}/convert`} className="btn">Convert</Link>
                        <Link to={`/leads/${lead.id}/edit`} className="btn-secondary">Edit</Link>
                      </>
                    )}
                    <ConfirmButton onConfirm={() => handleDelete(lead.id)}>Delete</ConfirmButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="p-3 text-sm text-gray-500">No leads found.</p>}
      </div>
    </div>
  )
}
