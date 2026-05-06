import { createClient } from '@/lib/supabase/server'
import { Dispute, Lead, DisputeStatus, formatDisputeReason } from '@/lib/types'
import { DisputeStatusBadge } from '@/components/status-badge'
import { AlertCircle } from 'lucide-react'
import { NewDisputeDialog } from './new-dispute-dialog'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type DisputeWithLead = Dispute & { leads: Pick<Lead, 'firstname' | 'lastname'> | null }
type FilterTab = 'All' | 'Active' | 'Closed' | 'Lost'

export default async function DisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const params = await searchParams
  const filter = (params.filter as FilterTab) ?? 'All'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: disputesData }, { data: leadsData }] = await Promise.all([
    supabase.from('disputes').select('*, leads(firstname, lastname)').eq('agent_id', user.id).order('created_at', { ascending: false }),
    supabase.from('leads').select('id, firstname, lastname').eq('assigned_to', user.id),
  ])

  const disputes = (disputesData ?? []) as DisputeWithLead[]
  const leads = (leadsData ?? []) as Pick<Lead, 'id' | 'firstname' | 'lastname'>[]

  const filtered = disputes.filter(d => {
    if (filter === 'All') return true
    if (filter === 'Active') return d.status === 'pending' || d.status === 'active'
    if (filter === 'Closed') return d.status === 'closed'
    if (filter === 'Lost') return d.status === 'lost'
    return true
  })

  const counts = {
    All: disputes.length,
    Active: disputes.filter(d => d.status === 'pending' || d.status === 'active').length,
    Closed: disputes.filter(d => d.status === 'closed').length,
    Lost: disputes.filter(d => d.status === 'lost').length,
  }

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
          <p className="text-sm text-gray-500 mt-0.5">File and track lead quality disputes.</p>
        </div>
        <NewDisputeDialog leads={leads} userId={user.id} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
            <AlertCircle size={15} />
          </div>
          <p className="text-sm font-semibold text-gray-900">All Disputes</p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
          {(['All', 'Active', 'Closed', 'Lost'] as FilterTab[]).map(f => (
            <a
              key={f}
              href={`/disputes?filter=${f}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-red-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 border border-gray-200'
              }`}
            >
              {f} <span className="opacity-70">({counts[f]})</span>
            </a>
          ))}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Lead</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Reason</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Status</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Notes</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Filed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-gray-400">No disputes found</td>
              </tr>
            )}
            {filtered.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-800">
                  {d.leads ? [d.leads.firstname, d.leads.lastname].filter(Boolean).join(' ') : '—'}
                </td>
                <td className="px-3 py-3 text-gray-600">{formatDisputeReason(d.reason)}</td>
                <td className="px-3 py-3"><DisputeStatusBadge status={d.status} /></td>
                <td className="px-3 py-3 text-gray-500 text-xs max-w-[200px] truncate">{d.notes ?? '—'}</td>
                <td className="px-3 py-3 text-xs text-gray-400">{formatDate(d.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
