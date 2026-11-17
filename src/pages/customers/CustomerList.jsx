import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fullName } from '../../lib/format'
import ErrorMessage from '../../components/ErrorMessage'

export default function CustomerList() {
  const [customers, setCustomers] = useState([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('customers')
      .select('*')
      .order('last_name')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setCustomers(data)
      })
  }, [])

  // Simple search across name, phone, email and address.
  const term = search.toLowerCase()
  const visible = customers.filter((c) =>
    [fullName(c), c.phone, c.email, c.address, c.city].some((field) =>
      (field ?? '').toLowerCase().includes(term)
    )
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Customers</h1>
        <input
          className="input max-w-xs"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Link to="/customers/new" className="btn ml-auto">Add customer</Link>
      </div>
      <ErrorMessage message={error} />

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/customers/${c.id}`} className="text-blue-700 hover:underline">
                    {fullName(c)}
                  </Link>
                </td>
                <td>{c.phone}</td>
                <td>{c.email}</td>
                <td>{[c.address, c.city].filter(Boolean).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="p-3 text-sm text-gray-500">No customers found.</p>}
      </div>
    </div>
  )
}
