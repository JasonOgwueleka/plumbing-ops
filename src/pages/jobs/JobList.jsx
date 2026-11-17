// Job list. Admins/managers see all jobs; technicians only see their
// own (the database's RLS policies do that filtering, not this page).
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { JOB_STATUSES, fullName, formatDateTime, statusLabel } from '../../lib/format'
import StatusBadge from '../../components/StatusBadge'
import ErrorMessage from '../../components/ErrorMessage'

export default function JobList() {
  const { profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const statusFilter = searchParams.get('status') ?? ''
  const [jobs, setJobs] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('jobs')
      .select(`
        id, title, status, scheduled_date, address,
        customer:customers ( first_name, last_name ),
        technician:profiles!jobs_assigned_to_fkey ( full_name )
      `)
      .order('scheduled_date', { ascending: false, nullsFirst: true })
      .then(({ data, error }) => (error ? setError(error.message) : setJobs(data)))
  }, [])

  const visible = statusFilter ? jobs.filter((j) => j.status === statusFilter) : jobs
  const canCreate = profile.role !== 'technician'

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{canCreate ? 'Jobs' : 'My jobs'}</h1>
        <select
          className="input max-w-[12rem]"
          value={statusFilter}
          onChange={(e) => setSearchParams(e.target.value ? { status: e.target.value } : {})}
        >
          <option value="">All statuses</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
        {canCreate && <Link to="/jobs/new" className="btn ml-auto">New job</Link>}
      </div>
      <ErrorMessage message={error} />

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Customer</th>
              <th>Scheduled</th>
              <th>Technician</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((job) => (
              <tr key={job.id}>
                <td>
                  <Link to={`/jobs/${job.id}`} className="text-blue-700 hover:underline">{job.title}</Link>
                  <div className="text-gray-500">{job.address}</div>
                </td>
                <td>{fullName(job.customer)}</td>
                <td className="whitespace-nowrap">{formatDateTime(job.scheduled_date)}</td>
                <td>{job.technician?.full_name ?? 'Unassigned'}</td>
                <td><StatusBadge status={job.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="p-3 text-sm text-gray-500">No jobs found.</p>}
      </div>
    </div>
  )
}
