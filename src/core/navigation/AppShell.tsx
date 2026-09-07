import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { ChevronDown, UserRound } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { useUserDisplayName } from '../auth/useUserDisplayName'
import { DashboardDrawer } from '../dashboard/DashboardDrawer'
import { useOnlineStatus } from '../pwa/useOnlineStatus'
import { useWorkspace } from '../workspaces/useWorkspace'
import teaHeader from '../../../logos/tea_header.png'
import { supabase } from '../auth/supabase'

export function AppShell() {
  const { session, signOut } = useAuth()
  const { activeWorkspace, contexts, setActiveWorkspaceId } = useWorkspace()
  const online = useOnlineStatus()
  const displayName = useUserDisplayName(session?.user)
  const workspaceDisplayName = activeWorkspace?.workspaceDisplayName ?? displayName
  const [workspaceNameInput, setWorkspaceNameInput] = useState(activeWorkspace?.workspaceDisplayName ?? '')
  const [workspaceNameError, setWorkspaceNameError] = useState('')

  useEffect(() => {
    setWorkspaceNameInput(activeWorkspace?.workspaceDisplayName ?? '')
    setWorkspaceNameError('')
  }, [activeWorkspace?.workspaceId, activeWorkspace?.workspaceDisplayName])

  async function saveWorkspaceDisplayName() {
    if (!activeWorkspace || !supabase) return
    setWorkspaceNameError('')
    const { error } = await supabase.rpc('update_my_workspace_display_name', { target_workspace_id: activeWorkspace.workspaceId, new_workspace_display_name: workspaceNameInput || null })
    if (error) { setWorkspaceNameError(error.message); return }
    window.location.reload()
  }

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
              <summary className="account-menu-trigger" aria-label={`Open account menu for ${workspaceDisplayName}`}>
                <UserRound size={17} aria-hidden />
                <span>{workspaceDisplayName}</span>
                <ChevronDown size={15} aria-hidden />
              </summary>
              <div className="account-menu-panel">
                <div className="account-menu-identity">
                  <strong>{workspaceDisplayName}</strong>
                  {session?.user.email && <span>{session.user.email}</span>}
                </div>
                {activeWorkspace && (
                  <><label className="account-workspace-switcher"><span>Workspace</span><select value={activeWorkspace.workspaceId} onChange={(event) => setActiveWorkspaceId(event.target.value)} aria-label="Active workspace">{contexts.map((context) => <option key={context.workspaceId} value={context.workspaceId}>{context.workspaceName}</option>)}</select></label><form className="account-workspace-name" onSubmit={(event) => { event.preventDefault(); void saveWorkspaceDisplayName() }}><label><span>Name in {activeWorkspace.workspaceName}</span><input value={workspaceNameInput} onChange={(event) => setWorkspaceNameInput(event.target.value)} placeholder={displayName} maxLength={80} /></label><button type="submit">Save name</button>{workspaceNameError && <small role="alert">{workspaceNameError}</small>}</form></>
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
