export type WorkspaceType = 'personal' | 'household' | 'business'

export type WorkspaceContext = {
  workspaceId: string
  workspaceName: string
  workspaceType: WorkspaceType
  roleName: string
  workspaceDisplayName: string | null
  permissionKeys: string[]
  enabledModuleIds: string[]
}
