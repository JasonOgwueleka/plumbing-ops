// The page frame: navigation bar + the current page underneath.
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Which links each role sees.
const NAV_LINKS = [
  { to: '/', label: 'Dashboard', roles: ['admin', 'manager', 'technician'] },
  { to: '/jobs', label: 'Jobs', roles: ['admin', 'manager', 'technician'] },
  { to: '/customers', label: 'Customers', roles: ['admin', 'manager'] },
  { to: '/leads', label: 'Leads', roles: ['admin', 'manager'] },
  { to: '/employees', label: 'Employees', roles: ['admin'] },
]

export default function Layout() {
  const { profile, signOut } = useAuth()
  const links = NAV_LINKS.filter((link) => link.roles.includes(profile.role))

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <span className="font-bold text-blue-700">Plumbing Ops</span>
          <nav className="flex flex-wrap gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  'rounded px-3 py-1.5 text-sm ' +
                  (isActive ? 'bg-blue-100 text-blue-800' : 'text-gray-600 hover:bg-gray-100')
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-gray-600">
              {profile.full_name} <span className="text-gray-400">({profile.role})</span>
            </span>
            <button onClick={signOut} className="btn-secondary">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
