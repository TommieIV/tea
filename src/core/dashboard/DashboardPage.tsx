import { lazy, Suspense, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { moduleRegistry } from '../modules/registry'
import { canAccessModule } from '../modules/moduleAccess'
import { useWorkspace } from '../workspaces/useWorkspace'

function DashboardReport({ load }: { load: NonNullable<(typeof moduleRegistry)[number]['dashboardReport']> }) {
  const Report = useMemo(() => lazy(load), [load])
  return <Suspense fallback={<div className="dashboard-report loading">Loading summary…</div>}><Report /></Suspense>
}

export function DashboardPage() {
  const { activeWorkspace, contexts, error, loading, setActiveWorkspaceId } = useWorkspace()

  if (loading) return <div className="page-loading">Loading workspace…</div>
  if (error) return <div className="empty-state">{error} Check that the database migration and seed have been applied.</div>
  if (!activeWorkspace) return <div className="empty-state">No active workspace is available for this account.</div>

  return (
    <>
      <section className="page-heading">
        <div className="eyebrow">{activeWorkspace.workspaceType} workspace</div>
        <h1>{activeWorkspace.workspaceName}</h1>
        <p className="lede">Choose a module available to your current workspace.</p>
        {contexts.length > 1 && (
          <label className="field" style={{ maxWidth: 300 }}>
            Workspace
            <select value={activeWorkspace.workspaceId} onChange={(event) => setActiveWorkspaceId(event.target.value)}>
              {contexts.map((context) => <option key={context.workspaceId} value={context.workspaceId}>{context.workspaceName}</option>)}
            </select>
          </label>
        )}
      </section>
      <section className="dashboard-reports" aria-label="Module summaries">
        {moduleRegistry.filter((module) => canAccessModule(module, activeWorkspace) && module.dashboardReport).map((module) => (
          <DashboardReport key={module.id} load={module.dashboardReport!} />
        ))}
      </section>
      <section className="module-grid" aria-label="Modules">
        {moduleRegistry.map((module) => {
          const available = canAccessModule(module, activeWorkspace)
          const Icon = module.icon
          const content = <><Icon className="card-icon" size={28} aria-hidden /><div><h2 className="card-title">{module.name}</h2><p className="card-description">{module.description}</p></div><span className="card-status">{available ? 'Connected' : 'Coming soon'}</span></>
          return available && module.route
            ? <Link key={module.id} className="module-card connected" to={module.route}>{content}</Link>
            : <article key={module.id} className="module-card muted">{content}</article>
        })}
      </section>
    </>
  )
}
