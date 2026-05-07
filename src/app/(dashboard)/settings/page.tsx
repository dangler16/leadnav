import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'
import { Settings, Lock, ShieldCheck } from 'lucide-react'
import { ResetPassword } from './reset-password'

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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and security settings.</p>
      </div>

      <div className="max-w-lg space-y-4">
        {/* Account info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <Settings size={15} />
            </div>
            <p className="text-sm font-semibold text-gray-900">Account</p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Email</p>
              <p className="text-sm text-gray-800">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Role</p>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                profile?.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {profile?.role === 'admin' && <ShieldCheck size={11} />}
                {profile?.role === 'admin' ? 'Admin' : 'Agent'}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Member Since</p>
              <p className="text-sm text-gray-800">{formatDate(profile?.created_at ?? '')}</p>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <Lock size={15} />
            </div>
            <p className="text-sm font-semibold text-gray-900">Security</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Password</p>
              <p className="text-xs text-gray-400 mt-0.5">Send a reset link to your email address</p>
            </div>
            <ResetPassword email={user.email!} />
          </div>
        </div>
      </div>
    </div>
  )
}
