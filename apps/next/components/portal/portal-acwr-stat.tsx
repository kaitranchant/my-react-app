import { PortalStatCard } from '@/components/portal/portal-stat-cards'
import {
  getPortalAcwrHint,
  type PortalLoadMetrics,
} from '@/lib/portal-data'

type PortalAcwrStatCardProps = {
  loadMetrics: PortalLoadMetrics | null
}

export function PortalAcwrStatCard({ loadMetrics }: PortalAcwrStatCardProps) {
  return (
    <PortalStatCard
      label="ACWR"
      value={loadMetrics?.acwrLabel ?? '—'}
      hint={getPortalAcwrHint(loadMetrics?.acwrVariant)}
      accent={loadMetrics?.acwrVariant === 'success'}
    />
  )
}
