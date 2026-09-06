import { Link, Outlet } from 'react-router-dom'
import { ChevronDown, UserRound } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useUserDisplayName } from '../auth/useUserDisplayName'
import { DashboardDrawer } from '../dashboard/DashboardDrawer'
import { useOnlineStatus } from '../pwa/useOnlineStatus'
import { useWorkspace } from '../workspaces/useWorkspace'
import teaHeader from '../../../logos/tea_header.png'

export function AppShell() {
  const { session, signOut } = useAuth()
  const { activeWorkspace, contexts, setActiveWorkspaceId } = useWorkspace()
  const online = useOnlineStatus()
  const displayName = useUserDisplayName(session?.user)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-content">
          <Link className="brand" to="/dashboard" aria-label="TEA dashboard">
            <img className="brand-logo" src={teaHeader} alt="TEA" />
          </Link>
          <div className="topbar-actions">
            {!online && <span className="status-pill offline">Offline</span>}
            <details className="account-menu">
              <summary className="account-menu-trigger" aria-label={`Open account menu for ${displayName}`}>
                <UserRound size={17} aria-hidden />
                <span>{displayName}</span>
                <ChevronDown size={15} aria-hidden />
              </summary>
              <div className="account-menu-panel">
                <div className="account-menu-identity">
                  <strong>{displayName}</strong>
                  {session?.user.email && <span>{session.user.email}</span>}
                </div>
                {activeWorkspace && (
                  <label className="account-workspace-switcher">
                    <span>Workspace</span>
                    <select value={activeWorkspace.workspaceId} onChange={(event) => setActiveWorkspaceId(event.target.value)} aria-label="Active workspace">
                      {contexts.map((context) => <option key={context.workspaceId} value={context.workspaceId}>{context.workspaceName}</option>)}
                    </select>
                  </label>
                )}
                <button className="account-menu-sign-out" type="button" onClick={() => void signOut()}>Sign out</button>
              </div>
            </details>
          </div>
        </div>
      </header>
      <DashboardDrawer />
      <main className="content"><Outlet /></main>
    </div>
  )
}
