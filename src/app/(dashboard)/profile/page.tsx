import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'
import { User, ShieldCheck } from 'lucide-react'
import { badgeShape } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ProfileForm } from './profile-form'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profileData }, { count: leadsCount }, { count: callsCount }, { count: salesCount }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_to', user.id),
    supabase.from('call_logs').select('*', { count: 'exact', head: true }).eq('agent_id', user.id),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('assigned_to', user.id).eq('status', 'sale'),
  ])

  const profile = profileData as Profile

  return (
    <div className="flex flex-col bg-white min-h-full px-8 pt-5 pb-8">

      <h1 className="text-2xl font-bold text-gray-900 mb-5">My Profile</h1>

      <div className="max-w-lg flex flex-col gap-4">

        {/* Profile card */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg font-bold flex-shrink-0">
              {(profile?.first_name?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '—'}
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
            </div>
            <span className={cn(badgeShape, 'gap-1 shrink-0',
              profile?.role === 'super_admin' ? 'bg-red-100 text-red-700 border border-red-200' :
              profile?.role === 'team_admin'  ? 'bg-purple-100 text-purple-700 border border-purple-200' :
              'bg-gray-100 text-gray-600 border border-gray-200'
            )}>
              {profile?.role === 'super_admin' && <ShieldCheck size={10} />}
              {profile?.role === 'super_admin' ? 'Super Admin' : profile?.role === 'team_admin' ? 'Team Admin' : 'User'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-gray-200 pt-4">
            {[
              { label: 'Leads', value: leadsCount ?? 0 },
              { label: 'Calls', value: callsCount ?? 0 },
              { label: 'Sales', value: salesCount ?? 0 },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-semibold text-gray-900 leading-none tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 border-t border-gray-200 pt-4 mt-4">
            Member since {formatDate(profile?.created_at ?? '')}
          </p>
        </div>

        {/* Edit name card */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-gray-200">
            <User className="w-4 h-4 text-gray-500" />
            <p className="text-sm font-semibold text-gray-900">Edit Name</p>
          </div>
          <ProfileForm profile={profile} />
        </div>

      </div>
    </div>
  )
}
