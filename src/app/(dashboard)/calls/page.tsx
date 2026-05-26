import { createClient } from '@/lib/supabase/server'
import { CallLog, CallOutcome, Lead, Profile, UserRole } from '@/lib/types'
import { badgeShape } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CallsFilterTabs } from './calls-filter-tabs'
import { SortableHeader, SortDir } from '@/components/sortable-header'
import { NewCallDialog } from './new-call-dialog'
import Link from 'next/link'

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
  no_answer: 'no answer',
  voicemail: 'voicemail',
  callback_requested: 'callback requested',
  appointment_set: 'appointment set',
  contacted: 'contacted',
  not_interested: 'not interested',
  wrong_number: 'wrong number',
  sale: 'sale',
}

const outcomeColors: Record<CallOutcome, string> = {
  no_answer:          'bg-muted text-muted-foreground border border-border',
  voicemail:          'bg-muted text-muted-foreground border border-border',
  callback_requested: 'bg-cyan-100 text-cyan-700 border border-cyan-200',
  appointment_set:    'bg-purple-100 text-purple-700 border border-purple-200',
  contacted:          'bg-green-100 text-green-700 border border-green-200',
  not_interested:     'bg-orange-100 text-orange-700 border border-orange-200',
  wrong_number:       'bg-red-100 text-red-700 border border-red-200',
  sale:               'bg-green-100 text-green-700 border border-green-200',
}

type CallWithLead = CallLog & {
  leads: Pick<Lead, 'firstname' | 'lastname' | 'id'> | null
  agentProfile?: Pick<Profile, 'first_name' | 'last_name'> | null
}
type FilterTab = 'All' | 'Contacted' | 'Appointment Set' | 'Sale' | 'No Answer'

function sortCalls(data: CallWithLead[], col: string | null, dir: SortDir | null): CallWithLead[] {
  if (!col || !dir) return data
  return [...data].sort((a, b) => {
    let av: string | number | null, bv: string | number | null
    if (col === 'lead') { av = [a.leads?.firstname, a.leads?.lastname].filter(Boolean).join(' ') || null; bv = [b.leads?.firstname, b.leads?.lastname].filter(Boolean).join(' ') || null }
    else if (col === 'agent') { av = [a.agentProfile?.first_name, a.agentProfile?.last_name].filter(Boolean).join(' ') || null; bv = [b.agentProfile?.first_name, b.agentProfile?.last_name].filter(Boolean).join(' ') || null }
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

  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profileData?.role ?? 'user') as UserRole
  const isAdmin = role === 'super_admin' || role === 'team_admin'

  let calls: CallWithLead[] = []
  let leadsForNew: Pick<Lead, 'id' | 'firstname' | 'lastname'>[] = []

  if (role === 'super_admin') {
    const [{ data: callData }, { data: leadsData }] = await Promise.all([
      supabase.from('call_logs').select('*, leads(id, firstname, lastname)').order('called_at', { ascending: false }),
      supabase.from('leads').select('id, firstname, lastname').order('firstname'),
    ])
    calls = (callData ?? []) as CallWithLead[]
    leadsForNew = (leadsData ?? []) as Pick<Lead, 'id' | 'firstname' | 'lastname'>[]

    const agentIds = [...new Set(calls.map(c => c.agent_id))]
    if (agentIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', agentIds)
      const profileById = Object.fromEntries((profilesData ?? []).map(p => [p.id, p]))
      calls = calls.map(c => ({ ...c, agentProfile: profileById[c.agent_id] ?? null }))
    }

  } else if (role === 'team_admin') {
    const { data: assignments } = await supabase
      .from('team_admin_assignments')
      .select('team_id')
      .eq('user_id', user.id)
    const myTeamIds = (assignments ?? []).map((a: { team_id: string }) => a.team_id)

    const { data: members } = await supabase
      .from('team_members')
      .select('user_id')
      .in('team_id', myTeamIds.length > 0 ? myTeamIds : ['00000000-0000-0000-0000-000000000000'])
    const myMemberIds = (members ?? []).map((m: { user_id: string }) => m.user_id)

    if (myMemberIds.length > 0) {
      const [{ data: callData }, { data: leadsData }] = await Promise.all([
        supabase.from('call_logs').select('*, leads(id, firstname, lastname)').in('agent_id', myMemberIds).order('called_at', { ascending: false }),
        supabase.from('leads').select('id, firstname, lastname').in('assigned_to', myMemberIds).order('firstname'),
      ])
      calls = (callData ?? []) as CallWithLead[]
      leadsForNew = (leadsData ?? []) as Pick<Lead, 'id' | 'firstname' | 'lastname'>[]

      const agentIds = [...new Set(calls.map(c => c.agent_id))]
      if (agentIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', agentIds)
        const profileById = Object.fromEntries((profilesData ?? []).map(p => [p.id, p]))
        calls = calls.map(c => ({ ...c, agentProfile: profileById[c.agent_id] ?? null }))
      }
    }

  } else {
    const [{ data: callData }, { data: leadsData }] = await Promise.all([
      supabase.from('call_logs').select('*, leads(id, firstname, lastname)').eq('agent_id', user.id).order('called_at', { ascending: false }),
      supabase.from('leads').select('id, firstname, lastname').eq('assigned_to', user.id).order('firstname'),
    ])
    calls = (callData ?? []) as CallWithLead[]
    leadsForNew = (leadsData ?? []) as Pick<Lead, 'id' | 'firstname' | 'lastname'>[]
  }

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

  const colCount = isAdmin ? 6 : 5

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      <div className="flex items-center justify-between px-8 pt-5 pb-4 shrink-0">
        <h1 className="text-xl font-bold text-foreground">Calls</h1>
        <NewCallDialog leads={leadsForNew} />
      </div>

      <div className="flex flex-col flex-1 min-h-0 mx-8 mb-5 border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2.5 border-b border-border shrink-0">
          <CallsFilterTabs filter={filter} counts={counts} />
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2.5"><SortableHeader column="lead"     label="Lead"     currentSort={sort} currentDir={sortDir} /></th>
                {isAdmin && <th className="text-left px-3 py-2.5"><SortableHeader column="agent"    label="Agent"    currentSort={sort} currentDir={sortDir} /></th>}
                <th className="text-left px-3 py-2.5"><SortableHeader column="outcome"  label="Outcome"  currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="duration" label="Duration" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="notes"    label="Notes"    currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="date"     label="Date"     currentSort={sort} currentDir={sortDir} /></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="py-12 text-center text-xs text-muted-foreground">No calls found</td>
                </tr>
              )}
              {filtered.map(call => (
                <tr key={call.id} className="border-b border-border hover:bg-muted transition-colors">
                  <td className="px-3 py-2.5">
                    {call.leads ? (
                      <Link href={`/leads/${call.leads.id}`} className="text-xs font-medium text-foreground hover:text-muted-foreground transition-colors">
                        {[call.leads.firstname, call.leads.lastname].filter(Boolean).join(' ') || '—'}
                      </Link>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  {isAdmin && (
                    <td className="px-3 py-2.5 text-xs text-foreground">
                      {call.agentProfile
                        ? [call.agentProfile.first_name, call.agentProfile.last_name].filter(Boolean).join(' ')
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                  )}
                  <td className="px-3 py-2.5">
                    <span className={cn(badgeShape, outcomeColors[call.outcome])}>
                      {outcomeLabels[call.outcome]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDuration(call.duration_seconds)}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[220px] truncate">{call.notes ?? '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDate(call.called_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
