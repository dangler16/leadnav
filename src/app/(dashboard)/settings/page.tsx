import { createClient } from '@/lib/supabase/server'
import { Profile, Team } from '@/lib/types'
import { Settings, Lock, ShieldCheck, CreditCard, Palette } from 'lucide-react'
import { badgeShape } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ResetPassword } from './reset-password'
import { BillingModeToggle } from './billing-mode-toggle'
import { DarkModeToggle } from './dark-mode-toggle'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = profileData as Profile

  let adminTeam: Team | null = null
  if (profile?.role === 'team_admin' || profile?.role === 'super_admin') {
    const { data: assignment } = await supabase
      .from('team_admin_assignments')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()
    if (assignment) {
      const { data: teamData } = await supabase.from('teams').select('*').eq('id', assignment.team_id).single()
      adminTeam = teamData as Team | null
    }
  }

  return (
    <div className="flex flex-col bg-background min-h-full px-8 pt-5 pb-8">

      <h1 className="text-xl font-bold text-foreground mb-5">Settings</h1>

      <div className="max-w-lg flex flex-col gap-4">

        {/* Account */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-border">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground">Account</p>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Email</p>
              <p className="text-xs text-foreground">{user.email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Role</p>
              <span className={cn(badgeShape, 'gap-1',
                profile?.role === 'super_admin' ? 'bg-red-100 text-red-700 border border-red-200' :
                profile?.role === 'team_admin'  ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                'bg-muted text-muted-foreground border border-border'
              )}>
                {profile?.role === 'super_admin' && <ShieldCheck size={10} />}
                {profile?.role === 'super_admin' ? 'Super Admin' : profile?.role === 'team_admin' ? 'Team Admin' : 'User'}
              </span>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Member Since</p>
              <p className="text-xs text-foreground">{formatDate(profile?.created_at ?? '')}</p>
            </div>
          </div>
        </div>

        {/* Billing */}
        {adminTeam && (
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 pb-4 mb-1 border-b border-border">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">Billing</p>
            </div>
            <p className="text-xs text-muted-foreground mb-4 ml-9">Controls how charges are applied across <span className="font-medium text-foreground">{adminTeam.name}</span></p>
            <BillingModeToggle teamId={adminTeam.id} initialMode={adminTeam.billing_mode} />
          </div>
        )}

        {/* Appearance */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-border">
            <Palette className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground">Appearance</p>
          </div>
          <DarkModeToggle initialDark={profile?.dark_mode ?? false} />
        </div>

        {/* Security */}
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-border">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground">Security</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">Password</p>
              <p className="text-xs text-muted-foreground mt-0.5">Send a reset link to your email address</p>
            </div>
            <ResetPassword email={user.email!} />
          </div>
        </div>

      </div>
    </div>
  )
}
