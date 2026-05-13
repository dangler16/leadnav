'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  House,
  Users,
  Package,
  AlertCircle,
  Phone,
  LogOut,
  User,
  Settings,
  SquareUser,
  CircleUser,
  Cable,
  ChartColumnBig,
} from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: House },
  { label: 'Leads', href: '/leads', icon: SquareUser },
  { label: 'Orders', href: '/orders', icon: Package },
  { label: 'Disputes', href: '/disputes', icon: AlertCircle },
  { label: 'Calls', href: '/calls', icon: Phone },
  { label: 'Reports', href: '/reports', icon: ChartColumnBig },
]

const adminNavItems = [
  { label: 'Vendors', href: '/vendors', icon: Cable },
  { label: 'Teams', href: '/teams', icon: Users },
  { label: 'Users', href: '/users', icon: User },
]

export function Sidebar({ isAdmin = false, notificationCount = 0 }: { isAdmin?: boolean; notificationCount?: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-neutral-900 text-white flex-shrink-0 gap-2.5 pt-2.5">
      {/* Logo */}
      <div className="flex items-center px-3 py-2.5">
        <img src="/leadnav-white-text.svg" alt="LeadNav" width="106" />
      </div>

      {/* Top icons */}
      <div className="flex items-center border-y-2 border-white/10">
        <Link href="/profile" className={cn('p-2 transition-colors cursor-pointer', pathname === '/profile' ? 'text-white' : 'text-white/35 hover:text-white')}>
          <CircleUser size={18} strokeWidth={2.5}/>
        </Link>
        <Link href="/settings" className={cn('p-2 transition-colors cursor-pointer', pathname === '/settings' ? 'text-white' : 'text-white/35 hover:text-white')}>
          <Settings size={18} strokeWidth={2.5}/>
        </Link>
        <NotificationBell initialCount={notificationCount} />
      </div>

      {/* Menu label */}
      <p className="px-3 pt-3 pb-0 text-xs font-bold uppercase tracking-widest text-white/35">
        Menu
      </p>

      {/* Nav */}
      <nav className="flex-1">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 text-sm font-regular transition-colors group',
                isActive
                  ? 'bg-red-950 text-red-300 border-l-2 border-red-600 px-2.5 font-medium'
                  : 'hover:bg-white/5 font-regular'
              )}
            >
              <Icon size={16} className={cn('flex-shrink-0 transition-colors', isActive ? '' : 'text-white/50 group-hover:text-white')} strokeWidth={2.5}/>
              <span className={cn('flex-1', isActive ? '' : 'text-white')}>{label}</span>
            </Link>
          )
        })}
        {isAdmin && (
          <>
            <p className="p-3 pt-5 text-xs font-bold uppercase tracking-widest text-white/35">
              Admin
            </p>
            {adminNavItems.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 text-sm font-regular transition-colors group',
                    isActive
                      ? 'bg-red-950 text-red-300 border-l-2 border-red-600 px-2.5 font-semibold'
                      : 'hover:bg-white/5 font-regular'
                  )}
                >
                  <Icon size={16} className={cn('flex-shrink-0 transition-colors', isActive ? '' : 'text-white/50 group-hover:text-white')} strokeWidth={2.5}/>
                  <span className={cn('flex-1', isActive ? '' : 'text-white')}>{label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Sign out */}
      <div className="flex items-center px-1.5 py-1 border-t-2 border-white/10">
        <button
          onClick={handleSignOut}
          className="gap-2.5 p-3 text-sm font-regular flex items-center w-full text-white/35 cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
