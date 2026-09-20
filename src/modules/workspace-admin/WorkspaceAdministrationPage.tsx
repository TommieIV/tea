import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { moduleRegistry } from '../../core/modules/registry'
import { useWorkspace } from '../../core/workspaces/useWorkspace'
import { createWorkspace, createWorkspaceGroup, inviteMember, loadAdministration, setModuleEnabled, setPermissionOverride, updateMembership, updateWorkspace, updateWorkspaceGroup, type AdminGroup, type AdminMember, type AdminPermission, type AdminRole } from './adminApi'

const workspaceTypes = ['personal', 'household', 'business'] as const

export default function WorkspaceAdministrationPage() {
  const { activeWorkspace } = useWorkspace()
  const [members, setMembers] = useState<AdminMember[]>([])
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [permissions, setPermissions] = useState<AdminPermission[]>([])
  const [groups, setGroups] = useState<AdminGroup[]>([])
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
    setMembers(data.members); setRoles(data.roles); setPermissions(data.permissions); setGroups(data.groups)
  }

  useEffect(() => {
    if (!activeWorkspace) return
    setWorkspaceName(activeWorkspace.workspaceName)
    setWorkspaceType(activeWorkspace.workspaceType)
    void loadAdministration(activeWorkspace.workspaceId)
      .then((data) => { setMembers(data.members); setRoles(data.roles); setPermissions(data.permissions); setGroups(data.groups) })
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

    <section className="admin-section"><h2>Groups</h2><p className="lede">Groups are reusable sets of active workspace members. Tasks can notify a group now, and future modules can use the same groups.</p><GroupForm members={members.filter((member) => member.status === 'active')} disabled={saving} submitLabel="Create group" onSave={(name, memberIds) => run(() => createWorkspaceGroup(activeWorkspace.workspaceId, name, memberIds))} />{groups.length > 0 && <div className="admin-members">{groups.map((group) => <GroupRow key={group.group_id} group={group} members={members.filter((member) => member.status === 'active')} disabled={saving} onSave={(name, memberIds) => run(() => updateWorkspaceGroup(activeWorkspace.workspaceId, group.group_id, name, memberIds))} />)}</div>}</section>

    <section className="admin-section"><h2>Apps in this workspace</h2><div className="admin-modules">{moduleRegistry.filter((module) => module.status === 'connected' && module.id !== 'workspace-admin').map((module) => <label key={module.id} className="admin-module-toggle"><span><strong>{module.name}</strong><small>{module.description}</small></span><input type="checkbox" checked={activeWorkspace.enabledModuleIds.includes(module.id)} disabled={saving} onChange={(event) => void run(async () => { await setModuleEnabled(activeWorkspace.workspaceId, module.id, event.target.checked); window.location.reload() }, false)} /></label>)}</div></section>
  </div>
}

function GroupForm({ members, disabled, submitLabel, initialName = '', initialMemberIds = [], onSave }: { members: AdminMember[]; disabled: boolean; submitLabel: string; initialName?: string; initialMemberIds?: string[]; onSave: (name: string, memberIds: string[]) => void }) {
  const [name, setName] = useState(initialName)
  const [memberIds, setMemberIds] = useState<string[]>(initialMemberIds)
  function toggle(memberId: string) { setMemberIds((current) => current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]) }
  return <form className="admin-group-form" onSubmit={(event) => { event.preventDefault(); onSave(name, memberIds); if (submitLabel === 'Create group') { setName(''); setMemberIds([]) } }}><label className="field">Group name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required /></label><div className="group-member-picker">{members.map((member) => <label key={member.membership_id}><input type="checkbox" checked={memberIds.includes(member.membership_id)} disabled={disabled} onChange={() => toggle(member.membership_id)} />{member.workspace_display_name ?? member.display_name ?? member.email ?? 'Member'}</label>)}</div><button className="button button-secondary" disabled={disabled}>{submitLabel}</button></form>
}

function GroupRow({ group, members, disabled, onSave }: { group: AdminGroup; members: AdminMember[]; disabled: boolean; onSave: (name: string, memberIds: string[]) => void }) {
  return <details className="admin-member"><summary><span><strong>{group.group_name}</strong><small>{group.membership_ids.length} {group.membership_ids.length === 1 ? 'member' : 'members'}</small></span></summary><div className="admin-member-content"><GroupForm members={members} disabled={disabled} submitLabel="Save group" initialName={group.group_name} initialMemberIds={group.membership_ids} onSave={onSave} /></div></details>
}

function MemberRow({ member, roles, permissions, disabled, onSave, onOverride }: { member: AdminMember; roles: AdminRole[]; permissions: AdminPermission[]; disabled: boolean; onSave: (roleId: string, status: string) => void; onOverride: (permissionKey: string, effect: 'allow' | 'deny' | null) => void }) {
  const [roleId, setRoleId] = useState(member.role_id)
  const [status, setStatus] = useState(member.status)
  return <details className="admin-member"><summary><span><strong>{member.workspace_display_name ?? member.display_name ?? member.email ?? 'Member'}</strong><small>{member.email}{member.workspace_display_name && ` · Profile: ${member.display_name ?? '—'}`}</small></span><span>{member.role_name}</span></summary><div className="admin-member-content"><div className="admin-member-controls"><label>Role<select value={roleId} onChange={(event) => setRoleId(event.target.value)}>{roles.map((role) => <option key={role.role_id} value={role.role_id}>{role.role_name}</option>)}</select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as AdminMember['status'])}><option value="active">Active</option><option value="suspended">Suspended</option></select></label><button className="button button-secondary" type="button" disabled={disabled} onClick={() => onSave(roleId, status)}>Save member</button></div><div className="permission-list">{permissions.map((permission) => <label key={permission.permission_key}><span><strong>{permission.permission_key}</strong><small>{permission.permission_description}</small></span><select value={member.permission_overrides[permission.permission_key] ?? ''} disabled={disabled} onChange={(event) => onOverride(permission.permission_key, event.target.value ? event.target.value as 'allow' | 'deny' : null)}><option value="">Inherit</option><option value="allow">Allow</option><option value="deny">Deny</option></select></label>)}</div></div></details>
}
