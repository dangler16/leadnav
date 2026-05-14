import { createClient } from '@/lib/supabase/server'
import { CallLog, CallOutcome, Lead } from '@/lib/types'
import { badgeShape } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CallsFilterTabs } from './calls-filter-tabs'
import { SortableHeader, SortDir } from '@/components/sortable-header'

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
  callback_requested: 'Callback Requested',
  appointment_set: 'Appointment Set',
  contacted: 'Contacted',
  not_interested: 'Not Interested',
  wrong_number: 'Wrong Number',
  sale: 'Sale',
}

const outcomeColors: Record<CallOutcome, string> = {
  no_answer:          'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  voicemail:          'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
  callback_requested: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  appointment_set:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  contacted:          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  not_interested:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  wrong_number:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  sale:               'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

type CallWithLead = CallLog & { leads: Pick<Lead, 'firstname' | 'lastname' | 'id'> | null }
type FilterTab = 'All' | 'Contacted' | 'Appointment Set' | 'Sale' | 'No Answer'

function sortCalls(data: CallWithLead[], col: string | null, dir: SortDir | null): CallWithLead[] {
  if (!col || !dir) return data
  return [...data].sort((a, b) => {
    let av: string | number | null, bv: string | number | null
    if (col === 'lead') { av = [a.leads?.firstname, a.leads?.lastname].filter(Boolean).join(' ') || null; bv = [b.leads?.firstname, b.leads?.lastname].filter(Boolean).join(' ') || null }
    else if (col === 'outcome') { av = a.outcome; bv = b.outcome }
    else if (col === 'duration') { av = a.duration_seconds ?? null; bv = b.duration_seconds ?? null }
    else if (col === 'notes') { av = a.notes ?? null; bv = b.notes ?? null }
    else { av = a.called_at; bv = b.called_at }
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return dir === 'asc' ? av - bv : bv - av
    const cmp = String(av).localeCompare(String(bv))
    return dir === 'asc' ? cmp : -cmp
  })
}

export default async function CallsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sort?: string; sortDir?: string }>
}) {
  const params = await searchParams
  const filter = (params.filter as FilterTab) ?? 'All'
  const sort = params.sort ?? null
  const sortDir = (params.sortDir as SortDir | undefined) ?? null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('call_logs')
    .select('*, leads(id, firstname, lastname)')
    .eq('agent_id', user.id)
    .order('called_at', { ascending: false })

  const calls = (data ?? []) as CallWithLead[]

  const filtered = sortCalls(
    calls.filter(c => {
      if (filter === 'All') return true
      if (filter === 'Contacted') return c.outcome === 'contacted'
      if (filter === 'Appointment Set') return c.outcome === 'appointment_set'
      if (filter === 'Sale') return c.outcome === 'sale'
      if (filter === 'No Answer') return c.outcome === 'no_answer' || c.outcome === 'voicemail'
      return true
    }),
    sort, sortDir,
  )

  const counts: Record<FilterTab, number> = {
    All: calls.length,
    Contacted: calls.filter(c => c.outcome === 'contacted').length,
    'Appointment Set': calls.filter(c => c.outcome === 'appointment_set').length,
    Sale: calls.filter(c => c.outcome === 'sale').length,
    'No Answer': calls.filter(c => c.outcome === 'no_answer' || c.outcome === 'voicemail').length,
  }

  return (
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7 h-full">
      <div className="pb-2">
        <h1 className="text-2xl font-bold text-foreground">Calls</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your complete call history.</p>
      </div>

      <div className="bg-card rounded-lg border border-border">
        <div className="p-3 border-b border-border/50">
          <CallsFilterTabs filter={filter} counts={counts} />
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left px-3 py-2"><SortableHeader column="lead" label="Lead" currentSort={sort} currentDir={sortDir} /></th>
              <th className="text-left px-3 py-2"><SortableHeader column="outcome" label="Outcome" currentSort={sort} currentDir={sortDir} /></th>
              <th className="text-left px-3 py-2"><SortableHeader column="duration" label="Duration" currentSort={sort} currentDir={sortDir} /></th>
              <th className="text-left px-3 py-2"><SortableHeader column="notes" label="Notes" currentSort={sort} currentDir={sortDir} /></th>
              <th className="text-left px-3 py-2"><SortableHeader column="date" label="Date" currentSort={sort} currentDir={sortDir} /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-muted-foreground">No calls found</td>
              </tr>
            )}
            {filtered.map(call => (
              <tr key={call.id} className="hover:bg-muted transition-colors">
                <td className="px-3 py-2">
                  {call.leads ? (
                    <a href={`/leads/${call.leads.id}`} className="font-medium text-foreground hover:text-red-600">
                      {[call.leads.firstname, call.leads.lastname].filter(Boolean).join(' ') || '—'}
                    </a>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2">
                  <span className={cn(badgeShape, 'border border-transparent', outcomeColors[call.outcome])}>
                    {outcomeLabels[call.outcome]}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{formatDuration(call.duration_seconds)}</td>
                <td className="px-3 py-2 text-muted-foreground text-xs max-w-[220px] truncate">{call.notes ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(call.called_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
