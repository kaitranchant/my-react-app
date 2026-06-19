import {
  CalendarCheck,
  CalendarDays,
  LayoutDashboard,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

export type PortalNavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export const portalNavItems: PortalNavItem[] = [
  { label: 'Home', href: '/portal', icon: LayoutDashboard },
  { label: 'Workouts', href: '/portal/workouts', icon: CalendarDays },
  { label: 'Check-in', href: '/portal/check-in', icon: CalendarCheck },
  { label: 'Progress', href: '/portal/progress', icon: TrendingUp },
]
