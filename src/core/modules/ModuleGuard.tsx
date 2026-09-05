import { Navigate } from 'react-router-dom'
import { canAccessModule } from './moduleAccess'
import { moduleRegistry } from './registry'
import { useWorkspace } from '../workspaces/useWorkspace'

export function ModuleGuard({ moduleId, children }: { moduleId: string; children: React.ReactNode }) {
  const { activeWorkspace, loading } = useWorkspace()
  const module = moduleRegistry.find((item) => item.id === moduleId)

  if (loading) return <div className="page-loading">Loading module access…</div>
  if (!activeWorkspace || !module || !canAccessModule(module, activeWorkspace)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
