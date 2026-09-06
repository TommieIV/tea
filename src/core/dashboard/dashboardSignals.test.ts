import { describe, expect, it } from 'vitest'
import { aggregateDashboardSignals } from './dashboardSignals'

describe('aggregateDashboardSignals', () => {
  it('adds module item counts and retains the highest severity', () => {
    expect(aggregateDashboardSignals([
      { itemCount: 2, severity: 'regular' },
      { itemCount: 1, severity: 'high' },
      { itemCount: 4, severity: 'medium' },
    ])).toEqual({ itemCount: 7, severity: 'high' })
  })
})
