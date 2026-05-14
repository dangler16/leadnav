import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'
import { Settings, Lock, ShieldCheck, Palette } from 'lucide-react'
import { ResetPassword } from './reset-password'
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

  return (
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account and security settings.</p>
      </div>

      <div className="max-w-lg flex flex-col gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-sm bg-accent flex items-center justify-center text-accent-foreground">
              <Settings size={18} />
            </div>
            <p className="font-semibold text-base text-foreground">Account</p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Email</p>
              <p className="text-sm text-foreground">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Role</p>
              <span className={`inline-flex items-center gap-1 rounded-[3px] px-2 py-[6px] text-xs font-medium leading-none ${
                profile?.role === 'super_admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                profile?.role === 'team_admin'  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                'bg-muted text-muted-foreground'
              }`}>
                {profile?.role === 'super_admin' && <ShieldCheck size={11} />}
                {profile?.role === 'super_admin' ? 'Super Admin' : profile?.role === 'team_admin' ? 'Team Admin' : 'User'}
              </span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Member Since</p>
              <p className="text-sm text-foreground">{formatDate(profile?.created_at ?? '')}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-sm bg-accent flex items-center justify-center text-accent-foreground">
              <Palette size={18} />
            </div>
            <p className="font-semibold text-base text-foreground">Appearance</p>
          </div>
          <DarkModeToggle />
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-sm bg-accent flex items-center justify-center text-accent-foreground">
              <Lock size={18} />
            </div>
            <p className="font-semibold text-base text-foreground">Security</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Password</p>
              <p className="text-xs text-muted-foreground mt-0.5">Send a reset link to your email address</p>
            </div>
            <ResetPassword email={user.email!} />
          </div>
        </div>
      </div>
    </div>
  )
}
