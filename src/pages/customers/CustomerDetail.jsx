import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateTime, fullName } from '../../lib/format'
import StatusBadge from '../../components/StatusBadge'
import ConfirmButton from '../../components/ConfirmButton'
import ErrorMessage from '../../components/ErrorMessage'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [jobs, setJobs] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => (error ? setError(error.message) : setCustomer(data)))

    supabase
      .from('jobs')
      .select('id, title, status, scheduled_date')
      .eq('customer_id', id)
      .order('scheduled_date', { ascending: false, nullsFirst: true })
      .then(({ data, error }) => (error ? setError(error.message) : setJobs(data)))
  }, [id])

  async function handleDelete() {
    setError('')
    const { error } = await supabase.from('customers').delete().eq('id', id)

    if (error) {
      // 23503 = foreign key violation: the customer still has jobs.
      if (error.code === '23503') {
        setError('This customer has jobs, so they can’t be deleted. Delete their jobs first if you really want to remove them.')
      } else {
        setError(error.message)
      }
      return
    }
    navigate('/customers')
  }

  if (!customer) return error ? <ErrorMessage message={error} /> : <p>Loading...</p>

  return (
    <div className="max-w-3xl">
      <ErrorMessage message={error} />

      <div className="card mb-6">
        <div className="mb-4 flex flex-wrap items-start gap-2">
          <h1 className="text-2xl font-bold">{fullName(customer)}</h1>
          <div className="ml-auto flex gap-2">
            <Link to={`/customers/${id}/edit`} className="btn-secondary">Edit</Link>
            <ConfirmButton onConfirm={handleDelete}>Delete</ConfirmButton>
          </div>
        </div>

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Info label="Phone" value={customer.phone} />
          <Info label="Email" value={customer.email} />
          <Info label="Address" value={[customer.address, customer.city].filter(Boolean).join(', ')} />
          <Info label="Customer since" value={formatDateTime(customer.created_at)} />
        </dl>
        {customer.notes && <p className="mt-4 whitespace-pre-wrap text-sm text-gray-700">{customer.notes}</p>}
      </div>

      <div className="mb-2 flex items-center">
        <h2 className="text-lg font-semibold">Jobs</h2>
        <Link to={`/jobs/new?customer=${id}`} className="btn ml-auto">New job</Link>
      </div>
      <div className="card">
        {jobs.length === 0 ? (
          <p className="text-sm text-gray-500">No jobs yet.</p>
        ) : (
          <table className="table">
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <Link to={`/jobs/${job.id}`} className="text-blue-700 hover:underline">{job.title}</Link>
                  </td>
                  <td>{formatDateTime(job.scheduled_date)}</td>
                  <td><StatusBadge status={job.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd>{value || '—'}</dd>
    </div>
  )
}
