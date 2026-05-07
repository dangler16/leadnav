import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'
import { redirect } from 'next/navigation'
import { Users, ShieldCheck } from 'lucide-react'
import { AdminActions } from './admin-actions'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!myProfile || myProfile.role !== 'admin') redirect('/dashboard')

  const { data: profilesData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
  const profiles = (profilesData ?? []) as Profile[]

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage agents and user roles.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
            <Users size={15} />
          </div>
          <p className="text-sm font-semibold text-gray-900">All Users</p>
          <span className="text-xs text-gray-400 ml-1">({profiles.length})</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Name</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Role</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Joined</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {profiles.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold">
                      {(p.first_name?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    p.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {p.role === 'admin' && <ShieldCheck size={11} />}
                    {p.role === 'admin' ? 'Admin' : 'Agent'}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-gray-400">{formatDate(p.created_at)}</td>
                <td className="px-3 py-3">
                  {p.id !== user.id && (
                    <AdminActions profile={p} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
