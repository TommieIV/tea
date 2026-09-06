import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { canAccessModule } from '../modules/moduleAccess'
import { moduleRegistry, type DashboardSignal } from '../modules/registry'
import { useWorkspace } from '../workspaces/useWorkspace'
import { aggregateDashboardSignals } from './dashboardSignals'

function DashboardReport({ load }: { load: NonNullable<(typeof moduleRegistry)[number]['dashboardReport']> }) {
  const Report = useMemo(() => lazy(load), [load])
  return <Suspense fallback={<div className="dashboard-report loading">Loading summary…</div>}><Report /></Suspense>
}

export function DashboardDrawer() {
  const { activeWorkspace } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [signal, setSignal] = useState<DashboardSignal>({ itemCount: 0, severity: 'none' })

  const availableModules = useMemo(() => activeWorkspace
    ? moduleRegistry.filter((module) => canAccessModule(module, activeWorkspace))
    : [], [activeWorkspace])
  const reportModules = useMemo(() => availableModules.filter((module) => module.dashboardReport), [availableModules])

  useEffect(() => {
    let cancelled = false

    if (!activeWorkspace) {
      setSignal({ itemCount: 0, severity: 'none' })
      return
    }

    const signalLoaders = availableModules.flatMap((module) => module.dashboardSignal ? [module.dashboardSignal] : [])
    void Promise.all(signalLoaders.map((load) => load(activeWorkspace.workspaceId).catch(() => ({ itemCount: 0, severity: 'none' as const }))))
      .then((signals) => {
        if (!cancelled) setSignal(aggregateDashboardSignals(signals))
      })

    return () => {
      cancelled = true
    }
  }, [activeWorkspace, availableModules])

  if (!activeWorkspace || reportModules.length === 0) return null

  return (
    <details className="dashboard-drawer" data-severity={signal.severity} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="dashboard-drawer-trigger">
        <span>Dashboard</span>
        <span className="dashboard-drawer-actions">
          {signal.itemCount > 0 && <span className="dashboard-badge" aria-label={`${signal.itemCount} dashboard item${signal.itemCount === 1 ? '' : 's'}`}>{signal.itemCount}</span>}
          <ChevronDown size={17} aria-hidden />
        </span>
      </summary>
      <div className="dashboard-drawer-panel">
        <div className="dashboard-drawer-content">
          {reportModules.map((module) => <DashboardReport key={module.id} load={module.dashboardReport!} />)}
        </div>
      </div>
    </details>
  )
}
