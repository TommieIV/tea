import { describe, expect, it } from 'vitest'
import { moduleRegistry } from '../../core/modules/registry'

describe('Tasks module manifest', () => {
  it('registers a workspace-scoped dashboard report behind task-view access', () => {
    const tasks = moduleRegistry.find((module) => module.id === 'tasks')

    expect(tasks).toMatchObject({
      route: '/modules/tasks',
      supportedWorkspaceTypes: ['personal', 'household', 'business'],
      permissions: ['tasks.items.view'],
    })
    expect(tasks?.dashboardReport).toBeTypeOf('function')
  })
})
