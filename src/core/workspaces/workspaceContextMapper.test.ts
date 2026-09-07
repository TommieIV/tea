import { describe, expect, it } from 'vitest'
import { mapWorkspaceContexts } from './workspaceContextMapper'

describe('mapWorkspaceContexts', () => {
  it('maps the snake_case RPC result into the frontend workspace context', () => {
    expect(mapWorkspaceContexts([{
      workspace_id: '27811589-fcd0-48b8-9adc-df020e1745b7',
      workspace_name: 'My Personal Workspace',
      workspace_type: 'personal',
      role_name: 'Owner',
      workspace_display_name: 'Dad',
      permission_keys: ['example.overview.view'],
      enabled_module_ids: ['example'],
    }])).toEqual([{
      workspaceId: '27811589-fcd0-48b8-9adc-df020e1745b7',
      workspaceName: 'My Personal Workspace',
      workspaceType: 'personal',
      roleName: 'Owner',
      workspaceDisplayName: 'Dad',
      permissionKeys: ['example.overview.view'],
      enabledModuleIds: ['example'],
    }])
  })

  it('uses empty arrays when optional aggregate values are null', () => {
    expect(mapWorkspaceContexts([{
      workspace_id: 'workspace-1',
      workspace_name: 'Workspace',
      workspace_type: 'personal',
      role_name: 'Owner',
      workspace_display_name: null,
      permission_keys: null,
      enabled_module_ids: null,
    }])[0]).toMatchObject({ permissionKeys: [], enabledModuleIds: [] })
  })
})
