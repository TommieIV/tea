import type { ModuleManifest } from './registry'
import type { WorkspaceContext } from '../workspaces/types'

export function canAccessModule(module: ModuleManifest, workspace: WorkspaceContext) {
  return module.status === 'connected'
    && workspace.enabledModuleIds.includes(module.id)
    && module.supportedWorkspaceTypes.includes(workspace.workspaceType)
    && module.permissions.every((permission) => workspace.permissionKeys.includes(permission))
}

