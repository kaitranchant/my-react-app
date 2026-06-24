import {

  Activity,

  Building2,

  CalendarDays,

  Camera,

  CalendarCheck,

  CalendarClock,

  ClipboardCheck,

  Contact,

  Flag,

  LayoutDashboard,

  LibraryBig,

  MessageSquare,

  TrendingUp,

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



export type NavGroup = {

  label: string

  icon: LucideIcon

  items: NavItem[]

}



export const topNavItems: NavItem[] = [

  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },

  { label: 'My Workouts', href: '/my-workouts', icon: CalendarDays },

  { label: 'Inbox', href: '/messages', icon: MessageSquare },

]



export const navGroups: NavGroup[] = [

  {

    label: 'Clients',

    icon: Contact,

    items: [

      { label: 'Users', href: '/clients', icon: Users },

      { label: 'Compliance', href: '/compliance', icon: ClipboardCheck },

      { label: 'Teams', href: '/teams', icon: Flag },
      { label: 'Gym', href: '/gym', icon: Building2 },

      {

        label: 'Attendance',

        href: '/attendance',

        icon: CalendarClock,

      },

      { label: 'Leaderboards', href: '/leaderboards', icon: Trophy },

    ],

  },

  {

    label: 'Programming',

    icon: LibraryBig,

    items: [

      { label: 'Library', href: '/library', icon: LibraryBig },

      { label: 'Load Management', href: '/load', icon: Activity },

      {
        label: 'Progressive overload',
        href: '/progressive-overload',
        icon: TrendingUp,
      },

    ],

  },

  {

    label: 'Monitoring',

    icon: Camera,

    items: [

      { label: 'Check-ins', href: '/check-ins', icon: CalendarCheck },

      { label: 'Progress Photos', href: '/progress-photos', icon: Camera },

      { label: 'Form Review', href: '/form-review', icon: Video },

      { label: 'Wearables', href: '/wearables', icon: Watch, soon: true },

    ],

  },

]



export const navItems: NavItem[] = [

  ...topNavItems,

  ...navGroups.flatMap((group) => group.items),

]


