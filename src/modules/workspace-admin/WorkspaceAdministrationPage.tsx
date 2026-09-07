import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { moduleRegistry } from '../../core/modules/registry'
import { useWorkspace } from '../../core/workspaces/useWorkspace'
import { createWorkspace, inviteMember, loadAdministration, setModuleEnabled, setPermissionOverride, updateMembership, updateWorkspace, type AdminMember, type AdminPermission, type AdminRole } from './adminApi'

const workspaceTypes = ['personal', 'household', 'business'] as const

export default function WorkspaceAdministrationPage() {
  const { activeWorkspace } = useWorkspace()
  const [members, setMembers] = useState<AdminMember[]>([])
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceType, setWorkspaceType] = useState('personal')
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newWorkspaceType, setNewWorkspaceType] = useState('personal')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function refresh() {
    if (!activeWorkspace) return
    const data = await loadAdministration(activeWorkspace.workspaceId)
    setMembers(data.members); setRoles(data.roles); setPermissions(data.permissions)
  }

  useEffect(() => {
    if (!activeWorkspace) return
    setWorkspaceName(activeWorkspace.workspaceName)
    setWorkspaceType(activeWorkspace.workspaceType)
    void loadAdministration(activeWorkspace.workspaceId)
      .then((data) => { setMembers(data.members); setRoles(data.roles); setPermissions(data.permissions) })
      .catch(() => setError('Administration data could not be loaded.'))
  }, [activeWorkspace])

  if (!activeWorkspace) return <div className="empty-state">No active workspace is available.</div>

  async function run(action: () => Promise<void>, reload = true) {
    setSaving(true); setError('')
    try { await action(); if (reload) await refresh() } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'That change could not be saved.') } finally { setSaving(false) }
  }

  return <div className="admin-page">
    <Link className="back-link" to="/dashboard">← Back to home</Link>
    <div className="page-heading"><div className="eyebrow">Workspace administration</div><h1>{activeWorkspace.workspaceName}</h1><p className="lede">Manage this workspace, its members, permissions, and apps.</p></div>
    {error && <p className="notice error" role="alert">{error}</p>}

    <div className="settings-grid">
      <section className="settings-card"><h2>Workspace</h2><form onSubmit={(event) => { event.preventDefault(); void run(async () => { await updateWorkspace(activeWorkspace.workspaceId, workspaceName, workspaceType); window.location.reload() }, false) }}><label className="field">Name<input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} required /></label><label className="field">Type<select value={workspaceType} onChange={(event) => setWorkspaceType(event.target.value)}>{workspaceTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><button className="button button-primary" disabled={saving}>Save workspace</button></form></section>
      <section className="settings-card"><h2>Create workspace</h2><form onSubmit={(event) => { event.preventDefault(); void run(async () => { await createWorkspace(newWorkspaceName, newWorkspaceType); window.location.assign('/dashboard') }, false) }}><label className="field">Name<input value={newWorkspaceName} onChange={(event) => setNewWorkspaceName(event.target.value)} required /></label><label className="field">Type<select value={newWorkspaceType} onChange={(event) => setNewWorkspaceType(event.target.value)}>{workspaceTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><button className="button button-primary" disabled={saving}>Create workspace</button></form></section>
      <section className="settings-card"><h2>Invite member</h2><p>Invitations create a normal Supabase Auth user; no user is inserted directly into Auth.</p><form onSubmit={(event) => { event.preventDefault(); void run(async () => { await inviteMember(activeWorkspace.workspaceId, inviteEmail, inviteName); setInviteEmail(''); setInviteName('') }) }}><label className="field">Email<input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required /></label><label className="field">Display name<input value={inviteName} onChange={(event) => setInviteName(event.target.value)} /></label><button className="button button-primary" disabled={saving}>Send invitation</button></form></section>
    </div>

    <section className="admin-section"><h2>Members</h2><p className="lede">Roles set a baseline. Use Allow or Deny to set a member-specific permission.</p><div className="admin-members">{members.map((member) => <MemberRow key={member.membership_id} member={member} roles={roles} permissions={permissions} disabled={saving} onSave={(roleId, status) => run(() => updateMembership(activeWorkspace.workspaceId, member.membership_id, roleId, status))} onOverride={(permissionKey, effect) => run(() => setPermissionOverride(activeWorkspace.workspaceId, member.membership_id, permissionKey, effect))} />)}</div></section>

    <section className="admin-section"><h2>Apps in this workspace</h2><div className="admin-modules">{moduleRegistry.filter((module) => module.status === 'connected' && module.id !== 'workspace-admin').map((module) => <label key={module.id} className="admin-module-toggle"><span><strong>{module.name}</strong><small>{module.description}</small></span><input type="checkbox" checked={activeWorkspace.enabledModuleIds.includes(module.id)} disabled={saving} onChange={(event) => void run(async () => { await setModuleEnabled(activeWorkspace.workspaceId, module.id, event.target.checked); window.location.reload() }, false)} /></label>)}</div></section>
  </div>
}

function MemberRow({ member, roles, permissions, disabled, onSave, onOverride }: { member: AdminMember; roles: AdminRole[]; permissions: AdminPermission[]; disabled: boolean; onSave: (roleId: string, status: string) => void; onOverride: (permissionKey: string, effect: 'allow' | 'deny' | null) => void }) {
  const [roleId, setRoleId] = useState(member.role_id)
  const [status, setStatus] = useState(member.status)
  return <details className="admin-member"><summary><span><strong>{member.display_name ?? member.email ?? 'Member'}</strong><small>{member.email}</small></span><span>{member.role_name}</span></summary><div className="admin-member-content"><div className="admin-member-controls"><label>Role<select value={roleId} onChange={(event) => setRoleId(event.target.value)}>{roles.map((role) => <option key={role.role_id} value={role.role_id}>{role.role_name}</option>)}</select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as AdminMember['status'])}><option value="active">Active</option><option value="suspended">Suspended</option></select></label><button className="button button-secondary" type="button" disabled={disabled} onClick={() => onSave(roleId, status)}>Save member</button></div><div className="permission-list">{permissions.map((permission) => <label key={permission.permission_key}><span><strong>{permission.permission_key}</strong><small>{permission.permission_description}</small></span><select value={member.permission_overrides[permission.permission_key] ?? ''} disabled={disabled} onChange={(event) => onOverride(permission.permission_key, event.target.value ? event.target.value as 'allow' | 'deny' : null)}><option value="">Inherit</option><option value="allow">Allow</option><option value="deny">Deny</option></select></label>)}</div></div></details>
}
