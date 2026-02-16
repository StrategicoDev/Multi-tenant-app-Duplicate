import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import OwnerDashboard from './dashboards/OwnerDashboard'
import AdminDashboard from './dashboards/AdminDashboard'
import MemberDashboard from './dashboards/MemberDashboard'

export default function Dashboard() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  switch (user.role) {
    case 'owner':
      return <OwnerDashboard />
    case 'admin':
      return <AdminDashboard />
    case 'member':
      return <MemberDashboard />
    default:
      return <Navigate to="/login" />
  }
}
