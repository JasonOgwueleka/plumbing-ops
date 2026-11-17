// Wraps pages that require login. Optionally restricts by role.
//
// NOTE: this only hides pages in the UI. The real protection is
// the Row Level Security in the database. Even if someone bypassed
// this, the database would refuse to return data they can't see.
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ roles, children }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return <p className="p-8 text-gray-500">Loading...</p>
  }
  if (!session || !profile) {
    return <Navigate to="/login" replace />
  }
  if (roles && !roles.includes(profile.role)) {
    return <Navigate to="/" replace />
  }
  return children
}
