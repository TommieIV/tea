import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useWorkspace } from '../../core/workspaces/useWorkspace'
import { loadTasksDashboardReport } from './tasksApi'
import type { TasksDashboardReport as TasksDashboardReportData } from './types'

export default function TasksDashboardReport() {
  const { activeWorkspace } = useWorkspace()
  const [report, setReport] = useState<TasksDashboardReportData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!activeWorkspace) return
    let cancelled = false
    setError(false)
    void loadTasksDashboardReport(activeWorkspace.workspaceId)
      .then((nextReport) => { if (!cancelled) setReport(nextReport) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [activeWorkspace])

  if (error) return <div className="dashboard-report">Tasks summary is unavailable right now.</div>
  if (!report) return <div className="dashboard-report loading">Loading Tasks summary…</div>

  return (
    <Link className="dashboard-report" to="/modules/tasks">
      <div>
        <div className="eyebrow">Tasks</div>
        <strong>{report.openCount} open {report.openCount === 1 ? 'task' : 'tasks'}</strong>
      </div>
      <p>
        {report.highPriorityCount} high · {report.mediumPriorityCount} medium · {report.overdueCount} overdue
      </p>
    </Link>
  )
}
