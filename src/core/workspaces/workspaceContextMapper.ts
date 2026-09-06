import type { WorkspaceContext, WorkspaceType } from './types'

type WorkspaceContextRow = {
  workspace_id: string
  workspace_name: string
  workspace_type: WorkspaceType
  role_name: string
  permission_keys: string[] | null
  enabled_module_ids: string[] | null
}

export function mapWorkspaceContexts(rows: WorkspaceContextRow[] | null): WorkspaceContext[] {
  return (rows ?? []).map((row) => ({
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    workspaceType: row.workspace_type,
    roleName: row.role_name,
    permissionKeys: row.permission_keys ?? [],
    enabledModuleIds: row.enabled_module_ids ?? [],
  }))
}
