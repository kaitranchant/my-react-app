import {

  Activity,

  Building2,

  Camera,

  CalendarCheck,

  CalendarClock,

  CalendarRange,

  ClipboardCheck,

  Contact,

  CreditCard,

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

  { label: 'Schedule', href: '/scheduling', icon: CalendarRange },

  { label: 'Inbox', href: '/messages', icon: MessageSquare },

]



export const postNavGroupItems: NavItem[] = [

  { label: 'Billing', href: '/billing', icon: CreditCard },

]



export const navGroups: NavGroup[] = [

  {

    label: 'Clients',

    icon: Contact,

    items: [

      { label: 'Users', href: '/clients', icon: Users },

      { label: 'Gyms', href: '/gym', icon: Building2 },

      { label: 'Team', href: '/teams', icon: Flag },

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

      {
        label: 'Prog. Overload',
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

      { label: 'Compliance', href: '/compliance', icon: ClipboardCheck },

      { label: 'Load Management', href: '/load', icon: Activity },

      { label: 'Progress Photos', href: '/progress-photos', icon: Camera },

      { label: 'Form Review', href: '/form-review', icon: Video },

      { label: 'Wearables', href: '/wearables', icon: Watch, soon: true },

    ],

  },

]



export const navItems: NavItem[] = [

  ...topNavItems,

  ...navGroups.flatMap((group) => group.items),

  ...postNavGroupItems,

]


