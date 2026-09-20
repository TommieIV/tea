import { describe, expect, it } from 'vitest'
import { tasksDashboardSignal } from './tasksApi'

describe('Tasks dashboard signal', () => {
  it('only exposes high-priority work to the shared badge and attention treatment', () => {
    expect(tasksDashboardSignal({ openCount: 6, highPriorityCount: 0, mediumPriorityCount: 3, overdueCount: 2 })).toEqual({ itemCount: 0, severity: 'none' })
    expect(tasksDashboardSignal({ openCount: 6, highPriorityCount: 2, mediumPriorityCount: 3, overdueCount: 2 })).toEqual({ itemCount: 2, severity: 'high' })
  })
})
