import { lazy, Suspense, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { moduleRegistry } from '../modules/registry'
import { canAccessModule, isModuleVisibleInLauncher } from '../modules/moduleAccess'
import { useAuth } from '../auth/useAuth'
import { useWorkspace } from '../workspaces/useWorkspace'

function DashboardReport({ load }: { load: NonNullable<(typeof moduleRegistry)[number]['dashboardReport']> }) {
  const Report = useMemo(() => lazy(load), [load])
  return <Suspense fallback={<div className="dashboard-report loading">Loading summary…</div>}><Report /></Suspense>
}

export function DashboardPage() {
  const { activeWorkspace, contexts, error, loading, setActiveWorkspaceId } = useWorkspace()
  const { session } = useAuth()

  if (loading) return <div className="page-loading">Loading workspace…</div>
  if (error) return <div className="empty-state">{error} Check that the database migration and seed have been applied.</div>
  if (!activeWorkspace) return <div className="empty-state">No active workspace is available for this account.</div>

  const launcherModules = moduleRegistry.filter((module) => isModuleVisibleInLauncher(module, activeWorkspace))

  return (
    <div className="launcher-page">
      <section className="launcher-top" aria-label="Current workspace">
        <div>
          <div className="eyebrow">TEA home</div>
          <h1>Your apps</h1>
          {session?.user.email && <p className="launcher-user">Signed in as {session.user.email}</p>}
        </div>
        <label className="workspace-switcher">
          <span>Workspace</span>
          <select value={activeWorkspace.workspaceId} onChange={(event) => setActiveWorkspaceId(event.target.value)} aria-label="Active workspace">
            {contexts.map((context) => <option key={context.workspaceId} value={context.workspaceId}>{context.workspaceName}</option>)}
          </select>
        </label>
      </section>

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

      {moduleRegistry.some((module) => canAccessModule(module, activeWorkspace) && module.dashboardReport) && (
        <section className="launcher-summaries" aria-label="At a glance">
          <h2>At a glance</h2>
          <div className="dashboard-reports">
            {moduleRegistry.filter((module) => canAccessModule(module, activeWorkspace) && module.dashboardReport).map((module) => (
              <DashboardReport key={module.id} load={module.dashboardReport!} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
