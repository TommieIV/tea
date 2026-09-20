import { describe, expect, it } from 'vitest'
import { aggregateDashboardSignals, highPriorityDashboardSignal } from './dashboardSignals'

describe('aggregateDashboardSignals', () => {
  it('adds module item counts and retains the highest severity', () => {
    expect(aggregateDashboardSignals([
      { itemCount: 2, severity: 'regular' },
      { itemCount: 1, severity: 'high' },
      { itemCount: 4, severity: 'medium' },
    ])).toEqual({ itemCount: 7, severity: 'high' })
  })
})

describe('highPriorityDashboardSignal', () => {
  it('excludes ordinary and medium module work from shared dashboard attention', () => {
    expect(highPriorityDashboardSignal([
      { itemCount: 2, severity: 'regular' },
      { itemCount: 4, severity: 'medium' },
    ])).toEqual({ itemCount: 0, severity: 'none' })
    expect(highPriorityDashboardSignal([
      { itemCount: 2, severity: 'regular' },
      { itemCount: 1, severity: 'high' },
    ])).toEqual({ itemCount: 1, severity: 'high' })
  })
})
