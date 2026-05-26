import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'
import { ShieldCheck } from 'lucide-react'
import { badgeShape } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AvatarUpload } from './avatar-upload'

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
    <div className="flex flex-col bg-background min-h-full px-8 pt-5 pb-8">

      <h1 className="text-xl font-bold text-foreground mb-5">My Profile</h1>

      <div className="max-w-lg flex flex-col gap-4">

        {/* Profile card */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-4 mb-4">
            <AvatarUpload
              currentUrl={profile?.avatar_url ?? null}
              initials={(profile?.first_name?.[0] ?? '?').toUpperCase()}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '—'}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
            </div>
            <span className={cn(badgeShape, 'gap-1 shrink-0',
              profile?.role === 'super_admin' ? 'bg-red-100 text-red-700 border border-red-200' :
              profile?.role === 'team_admin'  ? 'bg-purple-100 text-purple-700 border border-purple-200' :
              'bg-muted text-muted-foreground border border-border'
            )}>
              {profile?.role === 'super_admin' && <ShieldCheck size={10} />}
              {profile?.role === 'super_admin' ? 'Super Admin' : profile?.role === 'team_admin' ? 'Team Admin' : 'User'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-border pt-4">
            {[
              { label: 'Leads', value: leadsCount ?? 0 },
              { label: 'Calls', value: callsCount ?? 0 },
              { label: 'Sales', value: salesCount ?? 0 },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-semibold text-foreground leading-none tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground border-t border-border pt-4 mt-4">
            Member since {formatDate(profile?.created_at ?? '')}
          </p>
        </div>

      </div>
    </div>
  )
}
