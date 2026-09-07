import { describe, expect, it } from 'vitest'
import { moduleRegistry } from '../../core/modules/registry'

describe('Workspace Administration manifest', () => {
  it('requires workspace-management permissions and remains workspace-scoped', () => {
    expect(moduleRegistry.find((module) => module.id === 'workspace-admin')).toMatchObject({
      route: '/modules/administration',
      supportedWorkspaceTypes: ['personal', 'household', 'business'],
      permissions: ['core.workspaces.create', 'core.workspaces.manage', 'core.members.manage', 'core.modules.manage'],
    })
  })
})
