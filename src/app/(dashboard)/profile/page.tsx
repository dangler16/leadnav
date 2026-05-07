import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'
import { User, ShieldCheck } from 'lucide-react'
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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">View and update your account information.</p>
      </div>

      <div className="max-w-lg space-y-4">
        {/* Identity card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xl font-bold flex-shrink-0">
              {(profile?.first_name?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">
                {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '—'}
              </p>
              <p className="text-sm text-gray-400 truncate">{user.email}</p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0 ${
              profile?.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {profile?.role === 'admin' && <ShieldCheck size={11} />}
              {profile?.role === 'admin' ? 'Admin' : 'Agent'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-4">
            {[
              { label: 'Leads', value: leadsCount ?? 0 },
              { label: 'Calls', value: callsCount ?? 0 },
              { label: 'Sales', value: salesCount ?? 0 },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 border-t border-gray-100 pt-4 mt-4">
            Member since {formatDate(profile?.created_at ?? '')}
          </p>
        </div>

        {/* Edit form */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <User size={15} />
            </div>
            <p className="text-sm font-semibold text-gray-900">Edit Name</p>
          </div>
          <ProfileForm profile={profile} />
        </div>
      </div>
    </div>
  )
}
