import {
  Activity,
  Camera,
  CalendarCheck,
  CalendarClock,
  Flag,
  LayoutDashboard,
  LibraryBig,
  Trophy,
  Users,
  Video,
  Watch,
  type LucideIcon,
} from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  soon?: boolean
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Teams', href: '/teams', icon: Flag },
  { label: 'Library', href: '/library', icon: LibraryBig },
  { label: 'Check-ins', href: '/check-ins', icon: CalendarCheck },
  { label: 'Load Management', href: '/load', icon: Activity },
  { label: 'Progress Photos', href: '/progress-photos', icon: Camera },
  { label: 'Attendance', href: '/attendance', icon: CalendarClock, soon: true },
  { label: 'Form Review', href: '/form-review', icon: Video, soon: true },
  { label: 'Leaderboards', href: '/leaderboards', icon: Trophy, soon: true },
  { label: 'Wearables', href: '/wearables', icon: Watch, soon: true },
]
