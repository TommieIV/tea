import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth()
  if (loading) return <div className="page-loading">Loading TEA…</div>
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}
