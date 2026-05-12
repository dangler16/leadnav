import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ count: notificationCount }, { data: profile }] = await Promise.all([
    supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar isAdmin={profile?.role === 'admin'} notificationCount={notificationCount ?? 0} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
