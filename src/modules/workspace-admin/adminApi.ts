import { supabase } from '../../core/auth/supabase'

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export type AdminMember = {
  membership_id: string; user_id: string; display_name: string | null; workspace_display_name: string | null; email: string | null; role_id: string; role_name: string; status: 'active' | 'invited' | 'suspended'; permission_overrides: Record<string, 'allow' | 'deny'>; effective_permission_keys: string[]
}
export type AdminRole = { role_id: string; role_name: string }
export type AdminPermission = { permission_key: string; permission_description: string }
export type AdminGroup = { group_id: string; group_name: string; membership_ids: string[] }

export async function loadAdministration(workspaceId: string) {
  const api = client()
  const [members, roles, permissions, groups] = await Promise.all([
    api.rpc('admin_list_workspace_members', { target_workspace_id: workspaceId }),
    api.rpc('admin_list_workspace_roles', { target_workspace_id: workspaceId }),
    api.rpc('admin_list_workspace_permissions', { target_workspace_id: workspaceId }),
    api.rpc('admin_list_workspace_groups', { target_workspace_id: workspaceId }),
  ])
  if (members.error || roles.error || permissions.error || groups.error) throw members.error ?? roles.error ?? permissions.error ?? groups.error
  return { members: (members.data ?? []) as AdminMember[], roles: (roles.data ?? []) as AdminRole[], permissions: (permissions.data ?? []) as AdminPermission[], groups: (groups.data ?? []) as AdminGroup[] }
}

export async function updateWorkspace(workspaceId: string, name: string, type: string) {
  const { error } = await client().rpc('admin_update_workspace', { target_workspace_id: workspaceId, new_workspace_name: name, new_workspace_type: type })
  if (error) throw error
}
export async function createWorkspace(name: string, type: string) {
  const { error } = await client().rpc('admin_create_workspace', { new_workspace_name: name, new_workspace_type: type })
  if (error) throw error
}
export async function updateMembership(workspaceId: string, membershipId: string, roleId: string, status: string) {
  const { error } = await client().rpc('admin_update_membership', { target_workspace_id: workspaceId, target_membership_id: membershipId, new_role_id: roleId, new_status: status })
  if (error) throw error
}
export async function setPermissionOverride(workspaceId: string, membershipId: string, permissionKey: string, effect: 'allow' | 'deny' | null) {
  const { error } = await client().rpc('admin_set_membership_permission_override', { target_workspace_id: workspaceId, target_membership_id: membershipId, target_permission_key: permissionKey, target_effect: effect })
  if (error) throw error
}
export async function setModuleEnabled(workspaceId: string, moduleId: string, enabled: boolean) {
  const { error } = await client().rpc('admin_set_workspace_module', { target_workspace_id: workspaceId, target_module_id: moduleId, target_enabled: enabled })
  if (error) throw error
}
export async function inviteMember(workspaceId: string, email: string, displayName: string) {
  const { error } = await client().functions.invoke('admin-invite', { body: { workspaceId, email, displayName } })
  if (error) throw error
}
export async function createWorkspaceGroup(workspaceId: string, name: string, membershipIds: string[]) {
  const { error } = await client().rpc('admin_create_workspace_group', { target_workspace_id: workspaceId, new_group_name: name, member_ids: membershipIds })
  if (error) throw error
}
export async function updateWorkspaceGroup(workspaceId: string, groupId: string, name: string, membershipIds: string[]) {
  const { error } = await client().rpc('admin_update_workspace_group', { target_workspace_id: workspaceId, target_group_id: groupId, new_group_name: name, member_ids: membershipIds })
  if (error) throw error
}
