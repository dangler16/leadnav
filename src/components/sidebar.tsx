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
  Cable,
  ChartColumnBig,
} from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: House },
  { label: 'Leads', href: '/leads', icon: SquareUser },
  { label: 'Orders', href: '/orders', icon: Package },
  { label: 'Disputes', href: '/disputes', icon: AlertCircle, badge: true },
  { label: 'Calls', href: '/calls', icon: Phone },
  { label: 'Reports', href: '/reports', icon: ChartColumnBig },
]

const adminNavItems = [
  { label: 'Vendors', href: '/vendors', icon: Cable },
  { label: 'Users', href: '/users', icon: Users },
]

export function Sidebar({ disputeCount = 0, isAdmin = false, notificationCount = 0 }: { disputeCount?: number; isAdmin?: boolean; notificationCount?: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex flex-col w-[216px] min-h-screen bg-[#0F1117FF] text-white flex-shrink-0 gap-[10px] pt-[10px]">
      {/* Logo */}
      <div className="flex items-center px-[12px] py-[10px]">
        <img src="/leadnav-white-text.svg" alt="LeadNav" width="106" />
      </div>

      {/* Top icons */}
      <div className="flex items-center px-[6px] py-[4px] border-y-[2px] border-white/10">
        <Link href="/profile" className={cn('p-[6px] transition-colors cursor-pointer', pathname === '/profile' ? 'text-white' : 'text-white/35 hover:text-white')}>
          <User size={18} strokeWidth={2.5}/>
        </Link>
        <Link href="/settings" className={cn('p-[6px] transition-colors cursor-pointer', pathname === '/settings' ? 'text-white' : 'text-white/35 hover:text-white')}>
          <Settings size={18} strokeWidth={2.5}/>
        </Link>
        <NotificationBell initialCount={notificationCount} />
      </div>

      {/* Menu label */}
      <p className="px-[12px] pt-[12px] pb-0 text-[11px] font-bold uppercase tracking-[10%] text-white/35">
        Menu
      </p>

      {/* Nav */}
      <nav className="flex-1">
        {navItems.map(({ label, href, icon: Icon, badge }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-[10px] px-[12px] py-[8px] text-[14px] font-regular transition-colors',
                isActive
                  ? 'bg-[#EA121240] text-[#F9B7B7] border-l-2 border-[#EA1212] px-[10px]'
                  : 'hover:bg-white/5 font-regular'
              )}
            >
              <Icon size={16} className={cn('flex-shrink-0', isActive ? '' : 'text-white/50')} strokeWidth={2.5}/>
              <span className={cn('flex-1', isActive ? '' : 'text-white')}>{label}</span>
              {badge && disputeCount > 0 && (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {disputeCount > 9 ? '9+' : disputeCount}
                </span>
              )}
            </Link>
          )
        })}
        {isAdmin && (
          <>
            <p className="px-[12px] pt-[12px] pb-[10px] text-[11px] font-bold uppercase tracking-[10%] text-white/35">
              Admin
            </p>
            {adminNavItems.map(({ label, href, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-[10px] px-[12px] py-[8px] text-[14px] font-regular transition-colors',
                    isActive
                      ? 'bg-[#EA121240] text-[#F9B7B7] border-l-2 border-[#EA1212] px-[10px]'
                      : 'hover:bg-white/5 font-regular'
                  )}
                >
                  <Icon size={16} className={cn('flex-shrink-0', isActive ? '' : 'text-white/50')} strokeWidth={2.5}/>
                  <span className={cn('flex-1', isActive ? '' : 'text-white')}>{label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Sign out */}
      <div className="flex items-center px-[6px] py-[4px] border-t-[2px] border-white/10">
        <button
          onClick={handleSignOut}
          className="gap-[10px] px-[12px] py-[12px] text-[14px] font-medium flex items-center w-full text-white/35 cursor-pointer"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
