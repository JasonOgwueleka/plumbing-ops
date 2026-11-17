// Dashboard: job counts by status + today's schedule.
// Technicians automatically only see their own jobs (RLS does the filtering).
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { JOB_STATUSES, fullName, formatTime, statusLabel } from '../lib/format'
import StatusBadge from '../components/StatusBadge'
import ErrorMessage from '../components/ErrorMessage'

export default function Dashboard() {
  const { profile } = useAuth()
  const [counts, setCounts] = useState({})
  const [todayJobs, setTodayJobs] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      // 1. Count jobs per status.
      const { data: allJobs, error: countError } = await supabase.from('jobs').select('status')
      if (countError) return setError(countError.message)

      const newCounts = {}
      for (const job of allJobs) {
        newCounts[job.status] = (newCounts[job.status] ?? 0) + 1
      }
      setCounts(newCounts)

      // 2. Jobs scheduled for today (midnight to midnight, local time).
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)

      const { data: today, error: todayError } = await supabase
        .from('jobs')
        .select(`
          id, title, status, scheduled_date, address,
          customer:customers ( first_name, last_name ),
          technician:profiles!jobs_assigned_to_fkey ( full_name )
        `)
        .gte('scheduled_date', start.toISOString())
        .lt('scheduled_date', end.toISOString())
        .order('scheduled_date')
      if (todayError) return setError(todayError.message)

      setTodayJobs(today)
    }
    load()
  }, [])

  const isTechnician = profile.role === 'technician'

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">
        {isTechnician ? 'My dashboard' : 'Dashboard'}
      </h1>
      <ErrorMessage message={error} />

      <h2 className="mb-2 font-semibold text-gray-700">
        {isTechnician ? 'My jobs by status' : 'Jobs by status'}
      </h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {JOB_STATUSES.map((status) => (
          <Link key={status} to={`/jobs?status=${status}`} className="card hover:border-blue-300">
            <div className="text-sm text-gray-500">{statusLabel(status)}</div>
            <div className="text-3xl font-bold">{counts[status] ?? 0}</div>
          </Link>
        ))}
      </div>

      <h2 className="mb-2 font-semibold text-gray-700">Today's schedule</h2>
      <div className="card overflow-x-auto">
        {todayJobs.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing scheduled for today.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Job</th>
                <th>Customer</th>
                <th>Address</th>
                <th>Technician</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {todayJobs.map((job) => (
                <tr key={job.id}>
                  <td className="whitespace-nowrap">{formatTime(job.scheduled_date)}</td>
                  <td>
                    <Link to={`/jobs/${job.id}`} className="text-blue-700 hover:underline">
                      {job.title}
                    </Link>
                  </td>
                  <td>{fullName(job.customer)}</td>
                  <td>{job.address}</td>
                  <td>{job.technician?.full_name ?? 'Unassigned'}</td>
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
