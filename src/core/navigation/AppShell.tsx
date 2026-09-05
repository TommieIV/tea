import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { useOnlineStatus } from '../pwa/useOnlineStatus'
import { useWorkspace } from '../workspaces/useWorkspace'

export function AppShell() {
  const { session, signOut } = useAuth()
  const { activeWorkspace } = useWorkspace()
  const online = useOnlineStatus()

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-content">
          <Link className="brand" to="/dashboard">TEA <span>Platform</span></Link>
          <div className="topbar-actions">
            {!online && <span className="status-pill offline">Offline</span>}
            {activeWorkspace && <span className="workspace-pill">{activeWorkspace.workspaceName}</span>}
            {session?.user.email && <span className="account-label">{session.user.email}</span>}
            <button className="button button-quiet" type="button" onClick={() => void signOut()} aria-label={`Sign out ${session?.user.email ?? ''}`}>Sign out</button>
          </div>
        </div>
      </header>
      <main className="content"><Outlet /></main>
    </div>
  )
}
