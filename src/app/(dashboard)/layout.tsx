import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { TeamMember, UserRole } from '@/lib/types'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ count: notificationCount }, { data: profile }] = await Promise.all([
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])

  const role = (profile?.role ?? 'user') as UserRole

  let permissions: Pick<TeamMember, 'can_order' | 'can_view_leads' | 'can_make_calls' | 'can_file_disputes'> | undefined
  if (role === 'user') {
    const { data: membership } = await supabase
      .from('team_members')
      .select('can_order, can_view_leads, can_make_calls, can_file_disputes')
      .eq('user_id', user.id)
      .single()
    permissions = membership ?? undefined
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar role={role} userId={user.id} notificationCount={notificationCount ?? 0} permissions={permissions} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
