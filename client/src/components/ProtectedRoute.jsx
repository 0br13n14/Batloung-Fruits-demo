import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingMessage } from './LoadingMessage'
import { useAuth } from '../context/useAuth'

export function ProtectedRoute({ allowedRoles }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingMessage message="Checking your session..." />
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
