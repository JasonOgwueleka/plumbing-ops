// All the app's pages and who is allowed to see them.
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CustomerList from './pages/customers/CustomerList'
import CustomerForm from './pages/customers/CustomerForm'
import CustomerDetail from './pages/customers/CustomerDetail'
import LeadList from './pages/leads/LeadList'
import LeadForm from './pages/leads/LeadForm'
import ConvertLead from './pages/leads/ConvertLead'
import JobList from './pages/jobs/JobList'
import JobForm from './pages/jobs/JobForm'
import JobDetail from './pages/jobs/JobDetail'
import EmployeeList from './pages/employees/EmployeeList'

const OFFICE = ['admin', 'manager']

// Shortcut so each route below stays on one line.
function only(roles, page) {
  return <ProtectedRoute roles={roles}>{page}</ProtectedRoute>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Everything else requires login and shares the Layout. */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />

        <Route path="/jobs" element={<JobList />} />
        <Route path="/jobs/new" element={only(OFFICE, <JobForm />)} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/jobs/:id/edit" element={only(OFFICE, <JobForm />)} />

        <Route path="/customers" element={only(OFFICE, <CustomerList />)} />
        <Route path="/customers/new" element={only(OFFICE, <CustomerForm />)} />
        <Route path="/customers/:id" element={only(OFFICE, <CustomerDetail />)} />
        <Route path="/customers/:id/edit" element={only(OFFICE, <CustomerForm />)} />

        <Route path="/leads" element={only(OFFICE, <LeadList />)} />
        <Route path="/leads/new" element={only(OFFICE, <LeadForm />)} />
        <Route path="/leads/:id/edit" element={only(OFFICE, <LeadForm />)} />
        <Route path="/leads/:id/convert" element={only(OFFICE, <ConvertLead />)} />

        <Route path="/employees" element={only(['admin'], <EmployeeList />)} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
