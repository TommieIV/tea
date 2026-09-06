import { Link } from 'react-router-dom'
import { moduleRegistry } from '../modules/registry'
import { canAccessModule, isModuleVisibleInLauncher } from '../modules/moduleAccess'
import { useWorkspace } from '../workspaces/useWorkspace'

export function DashboardPage() {
  const { activeWorkspace, error, loading } = useWorkspace()

  if (loading) return <div className="page-loading">Loading workspace…</div>
  if (error) return <div className="empty-state">{error} Check that the database migration and seed have been applied.</div>
  if (!activeWorkspace) return <div className="empty-state">No active workspace is available for this account.</div>

  const launcherModules = moduleRegistry.filter((module) => isModuleVisibleInLauncher(module, activeWorkspace))

  return (
    <div className="launcher-page">
      <section className="launcher-grid" aria-label="Apps">
        {launcherModules.map((module) => {
          const available = canAccessModule(module, activeWorkspace)
          const Icon = module.icon
          const content = <><span className="app-icon" aria-hidden><Icon size={34} strokeWidth={2} /></span><span className="app-label">{module.name}</span>{!available && <span className="app-state">Coming soon</span>}</>
          return available && module.route
            ? <Link key={module.id} className="app-launcher connected" to={module.route} aria-label={`Open ${module.name}`}>{content}</Link>
            : <article key={module.id} className="app-launcher muted" aria-label={`${module.name}, coming soon`}>{content}</article>
        })}
      </section>

      <div className="launcher-workspace" aria-label={`Active workspace: ${activeWorkspace.workspaceName}`}>
        {activeWorkspace.workspaceName}
      </div>
    </div>
  )
}
