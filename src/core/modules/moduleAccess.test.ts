import { describe, expect, it } from 'vitest'
import { FlaskConical } from 'lucide-react'
import { canAccessModule, isModuleVisibleInLauncher } from './moduleAccess'
import type { ModuleManifest } from './registry'
import type { WorkspaceContext } from '../workspaces/types'

const module: ModuleManifest = {
  id: 'example',
  name: 'Example',
  version: '0.1.0',
  description: 'Test module',
  icon: FlaskConical,
  status: 'connected',
  classification: 'generic',
  supportedWorkspaceTypes: ['personal'],
  permissions: ['example.overview.view'],
}

const workspace: WorkspaceContext = {
  workspaceId: 'workspace-1',
  workspaceName: 'Workspace',
  workspaceType: 'personal',
  roleName: 'Owner',
  workspaceDisplayName: null,
  permissionKeys: ['example.overview.view'],
  enabledModuleIds: ['example'],
}

describe('canAccessModule', () => {
  it('requires module enablement, workspace support, and every declared permission', () => {
    expect(canAccessModule(module, workspace)).toBe(true)
    expect(canAccessModule(module, { ...workspace, enabledModuleIds: [] })).toBe(false)
    expect(canAccessModule(module, { ...workspace, permissionKeys: [] })).toBe(false)
    expect(canAccessModule(module, { ...workspace, workspaceType: 'business' })).toBe(false)
  })

  it('hides connected modules that are unavailable while retaining eligible Coming Soon modules', () => {
    expect(isModuleVisibleInLauncher(module, { ...workspace, permissionKeys: [] })).toBe(false)
    expect(isModuleVisibleInLauncher({ ...module, status: 'coming-soon', permissions: [] }, workspace)).toBe(true)
    expect(isModuleVisibleInLauncher({ ...module, status: 'coming-soon', permissions: [], supportedWorkspaceTypes: ['business'] }, workspace)).toBe(false)
  })
})
