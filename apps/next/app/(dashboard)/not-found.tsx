import { RouteNotFound } from '@/components/route-not-found'

export default function DashboardNotFound() {
  return (
    <RouteNotFound homeHref="/dashboard" homeLabel="Back to dashboard" />
  )
}
