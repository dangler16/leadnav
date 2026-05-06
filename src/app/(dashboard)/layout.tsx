import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ count: disputeCount }, { data: profile }] = await Promise.all([
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('agent_id', user.id).in('status', ['pending', 'active']),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar disputeCount={disputeCount ?? 0} isAdmin={profile?.role === 'admin'} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
