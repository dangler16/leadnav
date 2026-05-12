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
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and security settings.</p>
      </div>

      <div className="max-w-lg flex flex-col gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-sm bg-red-50 flex items-center justify-center text-red-600">
              <Settings size={18} />
            </div>
            <p className="font-semibold text-base text-gray-800">Account</p>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Email</p>
              <p className="text-sm text-gray-800">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Role</p>
              <span className={`inline-flex items-center gap-1 rounded-[3px] px-2 py-[6px] text-xs font-medium leading-none ${
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

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-sm bg-red-50 flex items-center justify-center text-red-600">
              <Lock size={18} />
            </div>
            <p className="font-semibold text-base text-gray-800">Security</p>
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
