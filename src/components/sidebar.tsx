'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  House, Users, Package, AlertCircle, Phone, LogOut, User,
  Settings, SquareUser, CircleUser, Cable, ChartColumnBig, Wallet,
} from 'lucide-react'
import { NotificationBell } from '@/components/notification-bell'
import { UserRole, TeamMember } from '@/lib/types'

type SidebarPermissions = Pick<TeamMember, 'can_order' | 'can_view_leads' | 'can_make_calls' | 'can_file_disputes'>

interface SidebarProps {
  role?: UserRole
  userId?: string
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
        'flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors',
        isActive
          ? 'bg-neutral-800 text-white'
          : 'text-gray-300 hover:bg-neutral-800 hover:text-white'
      )}
    >
      <Icon size={14} className="flex-shrink-0" strokeWidth={2} />
      <span className="flex-1">{label}</span>
    </Link>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-widest">
      {children}
    </p>
  )
}

export function Sidebar({ role = 'user', userId, notificationCount = 0, permissions }: SidebarProps) {
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
    <aside className="flex flex-col w-52 min-h-screen bg-neutral-950 text-white flex-shrink-0">

      {/* Logo */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-white/10">
        <img src="/leadnav-white-text.svg" alt="LeadNav" width="100" />
        <NotificationBell userId={userId} initialCount={notificationCount} />
      </div>

      {/* Main nav */}
      <nav className="flex-1 flex flex-col gap-0.5 pt-1 pb-2">
        <SectionLabel>Menu</SectionLabel>
        <NavLink href="/dashboard" label="Dashboard" icon={House} />
        {showLeads    && <NavLink href="/leads"    label="Leads"    icon={SquareUser} />}
        {showOrders   && <NavLink href="/orders"   label="Orders"   icon={Package} />}
        {showDisputes && <NavLink href="/disputes" label="Disputes" icon={AlertCircle} />}
        {showCalls    && <NavLink href="/calls"    label="Calls"    icon={Phone} />}
        {(isSuperAdmin || isTeamAdmin) && <NavLink href="/reports" label="Reports" icon={ChartColumnBig} />}

        {isSuperAdmin && (
          <>
            <SectionLabel>Admin</SectionLabel>
            <NavLink href="/vendors" label="Vendors" icon={Cable} />
            <NavLink href="/teams"   label="Teams"   icon={Users} />
            <NavLink href="/users"   label="Users"   icon={User} />
          </>
        )}

        {isTeamAdmin && (
          <>
            <SectionLabel>Admin</SectionLabel>
            <NavLink href="/users" label="Users" icon={User} />
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 pt-2 pb-2 flex flex-col gap-0.5">
        <NavLink href="/profile"  label="Profile"  icon={CircleUser} />
        <NavLink href="/settings" label="Settings" icon={Settings} />
        <NavLink href="/billing"  label="Billing"  icon={Wallet} />
      </div>

      <div className="border-t border-white/10 pt-2 pb-2 flex flex-col gap-0.5">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-neutral-800 hover:text-white rounded-md transition-colors cursor-pointer"
        >
          <LogOut size={14} strokeWidth={2} className="flex-shrink-0" />
          <span>Sign out</span>
        </button>
      </div>

    </aside>
  )
}
