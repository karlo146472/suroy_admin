import {
  Activity,
  Bus,
  LayoutDashboard,
  MapPinned,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/destinations', label: 'Destinations', icon: MapPinned },
  { to: '/transportation', label: 'Transportation', icon: Bus },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/activity-log', label: 'Activity Log', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
]

// Titles for every dashboard page, including the ones that are not in the sidebar.
const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/destinations': 'Destinations',
  '/destinations/new': 'Add Destination',
  '/destinations/categories': 'Categories',
  '/transportation': 'Transportation',
  '/users': 'Users',
  '/activity-log': 'Activity Log',
  '/settings': 'Settings',
}

export const pageTitleFor = (pathname: string) => PAGE_TITLES[pathname.replace(/\/+$/, '') || '/'] ?? 'Page Not Found'
