import { createClient } from '@/lib/supabase/server'
import { CallLog, CallOutcome, Lead } from '@/lib/types'
import { Phone } from 'lucide-react'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const outcomeLabels: Record<CallOutcome, string> = {
  no_answer: 'No Answer',
  voicemail: 'Voicemail',
  left_message: 'Left Message',
  callback_requested: 'Callback Requested',
  contacted: 'Contacted',
  not_interested: 'Not Interested',
  wrong_number: 'Wrong Number',
  sale: 'Sale',
}

const outcomeColors: Record<CallOutcome, string> = {
  no_answer: 'bg-gray-100 text-gray-600',
  voicemail: 'bg-gray-100 text-gray-600',
  left_message: 'bg-blue-100 text-blue-700',
  callback_requested: 'bg-indigo-100 text-indigo-700',
  contacted: 'bg-green-100 text-green-700',
  not_interested: 'bg-orange-100 text-orange-700',
  wrong_number: 'bg-red-100 text-red-700',
  sale: 'bg-green-100 text-green-800',
}

type CallWithLead = CallLog & { leads: Pick<Lead, 'firstname' | 'lastname' | 'id'> | null }

export default async function CallsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('call_logs')
    .select('*, leads(id, firstname, lastname)')
    .eq('agent_id', user.id)
    .order('called_at', { ascending: false })

  const calls = (data ?? []) as CallWithLead[]

  const totalCalls = calls.length
  const contacted = calls.filter(c => c.outcome === 'contacted' || c.outcome === 'sale').length
  const sales = calls.filter(c => c.outcome === 'sale').length

  return (
    <div className="flex flex-col gap-6 pt-6 px-7 pb-7">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calls</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your complete call history.</p>
      </div>

      <div className="flex gap-6">
        {[
          { label: 'Total Calls', value: totalCalls },
          { label: 'Contacted', value: contacted },
          { label: 'Sales', value: sales },
        ].map(s => (
          <div key={s.label} className="flex-1 bg-white rounded-[5px] border border-gray-200 p-5">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[5px] border border-gray-200">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <div className="w-[30px] h-[30px] rounded-[5px] bg-red-50 flex items-center justify-center text-red-600">
            <Phone size={20} />
          </div>
          <p className="font-semibold text-base text-gray-800">Call Log</p>
          <span className="text-xs text-gray-400 ml-1">({calls.length})</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Lead</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Outcome</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Duration</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Notes</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {calls.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-gray-400">No calls logged yet</td>
              </tr>
            )}
            {calls.map(call => (
              <tr key={call.id} className="hover:bg-gray-50">
                <td className="px-5 py-3">
                  {call.leads ? (
                    <a href={`/leads/${call.leads.id}`} className="font-medium text-gray-800 hover:text-red-600">
                      {[call.leads.firstname, call.leads.lastname].filter(Boolean).join(' ') || '—'}
                    </a>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center rounded-[3px] px-2 py-[6px] text-xs font-medium leading-none ${outcomeColors[call.outcome]}`}>
                    {outcomeLabels[call.outcome]}
                  </span>
                </td>
                <td className="px-3 py-3 text-gray-500">{formatDuration(call.duration_seconds)}</td>
                <td className="px-3 py-3 text-gray-500 text-xs max-w-[220px] truncate">{call.notes ?? '—'}</td>
                <td className="px-3 py-3 text-xs text-gray-400">{formatDate(call.called_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
