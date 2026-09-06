import type { DashboardSeverity, DashboardSignal } from '../modules/registry'

const severityRank: Record<DashboardSeverity, number> = {
  none: 0,
  regular: 1,
  medium: 2,
  high: 3,
}

export function aggregateDashboardSignals(signals: DashboardSignal[]): DashboardSignal {
  return signals.reduce<DashboardSignal>((summary, signal) => (
    {
      itemCount: summary.itemCount + signal.itemCount,
      severity: severityRank[signal.severity] > severityRank[summary.severity] ? signal.severity : summary.severity,
    }
  ), { itemCount: 0, severity: 'none' })
}
