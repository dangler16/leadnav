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
import { UserRole, TeamMember } from '@/lib/types'

type SidebarPermissions = Pick<TeamMember, 'can_order' | 'can_view_leads' | 'can_make_calls' | 'can_file_disputes'>

interface SidebarProps {
  role?: UserRole
  notificationCount?: number
  permissions?: SidebarPermissions
}

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors group',
        isActive
          ? 'bg-red-950 text-red-300 border-l-2 border-red-600 px-2.5 font-medium'
          : 'hover:bg-white/5'
      )}
    >
      <Icon size={16} className={cn('flex-shrink-0 transition-colors', isActive ? '' : 'text-white/50 group-hover:text-white')} strokeWidth={2.5} />
      <span className={cn('flex-1', isActive ? '' : 'text-white')}>{label}</span>
    </Link>
  )
}

export function Sidebar({ role = 'user', notificationCount = 0, permissions }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isSuperAdmin = role === 'super_admin'
  const isTeamAdmin  = role === 'team_admin'

  const showLeads    = isSuperAdmin || isTeamAdmin || permissions?.can_view_leads
  const showOrders   = isSuperAdmin || isTeamAdmin || permissions?.can_order
  const showDisputes = isSuperAdmin || isTeamAdmin || permissions?.can_file_disputes
  const showCalls    = isSuperAdmin || isTeamAdmin || permissions?.can_make_calls

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-neutral-900 text-white flex-shrink-0 gap-2.5 pt-2.5">
      <div className="flex items-center px-3 py-2.5">
        <img src="/leadnav-white-text.svg" alt="LeadNav" width="106" />
      </div>

      <div className="flex items-center border-y-2 border-white/10 pl-1">
        <Link href="/profile" className={cn('py-2 px-1.5 transition-colors cursor-pointer', pathname === '/profile' ? 'text-white' : 'text-white/35 hover:text-white')}>
          <CircleUser size={18} strokeWidth={2.5} />
        </Link>
        <Link href="/settings" className={cn('py-2 px-1.5 transition-colors cursor-pointer', pathname === '/settings' ? 'text-white' : 'text-white/35 hover:text-white')}>
          <Settings size={18} strokeWidth={2.5} />
        </Link>
        <NotificationBell initialCount={notificationCount} />
      </div>

      <p className="px-3 pt-3 pb-0 text-xs font-bold uppercase tracking-widest text-white/35">Menu</p>

      <nav className="flex-1">
        <NavLink href="/dashboard" label="Dashboard" icon={House} />
        {showLeads    && <NavLink href="/leads"    label="Leads"    icon={SquareUser} />}
        {showOrders   && <NavLink href="/orders"   label="Orders"   icon={Package} />}
        {showDisputes && <NavLink href="/disputes" label="Disputes" icon={AlertCircle} />}
        {showCalls    && <NavLink href="/calls"    label="Calls"    icon={Phone} />}
        {(isSuperAdmin || isTeamAdmin) && <NavLink href="/reports" label="Reports" icon={ChartColumnBig} />}

        {isSuperAdmin && (
          <>
            <p className="p-3 pt-5 text-xs font-bold uppercase tracking-widest text-white/35">Admin</p>
            <NavLink href="/vendors" label="Vendors" icon={Cable} />
            <NavLink href="/teams"   label="Teams"   icon={Users} />
            <NavLink href="/users"   label="Users"   icon={User} />
          </>
        )}

        {isTeamAdmin && (
          <>
            <p className="p-3 pt-5 text-xs font-bold uppercase tracking-widest text-white/35">Admin</p>
            <NavLink href="/users" label="Users" icon={User} />
          </>
        )}
      </nav>

      <div className="flex items-center px-1.5 py-1 border-t-2 border-white/10">
        <button
          onClick={handleSignOut}
          className="gap-2.5 p-3 text-sm flex items-center w-full text-white/35 cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
