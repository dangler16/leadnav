import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Lead, Profile, CallLog, Dispute, CallOutcome, formatDisputeReason } from '@/lib/types'
import { LeadActions } from './lead-actions'
import { LeadStatusSelect } from '@/app/(dashboard)/leads/lead-status-select'
import { ContactInfoCard } from './contact-info-card'
import { HouseholdCard } from './household-card'
import { NotesCard } from './notes-card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ChevronLeft, AlertCircle, Play } from 'lucide-react'
import { DisputeStatusBadge } from '@/components/status-badge'
import { badgeShape } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

const outcomeConfig: Record<CallOutcome, { label: string; className: string; dotClass: string }> = {
  no_answer:          { label: 'No Answer',         className: 'bg-muted text-muted-foreground border-border',     dotClass: 'bg-muted-foreground' },
  voicemail:          { label: 'Voicemail',          className: 'bg-muted text-muted-foreground border-border',     dotClass: 'bg-muted-foreground' },
  callback_requested: { label: 'Callback Requested', className: 'bg-cyan-100 text-cyan-700 border-cyan-200',     dotClass: 'bg-cyan-500' },
  appointment_set:    { label: 'Appointment Set',    className: 'bg-indigo-100 text-indigo-700 border-indigo-200', dotClass: 'bg-indigo-500' },
  contacted:          { label: 'Contacted',          className: 'bg-cyan-100 text-cyan-700 border-cyan-200',     dotClass: 'bg-cyan-500' },
  not_interested:     { label: 'Not Interested',     className: 'bg-red-100 text-red-700 border-red-200',        dotClass: 'bg-red-500' },
  wrong_number:       { label: 'Wrong Number',       className: 'bg-red-100 text-red-700 border-red-200',        dotClass: 'bg-red-500' },
  sale:               { label: 'Sale',               className: 'bg-green-100 text-green-700 border-green-200',  dotClass: 'bg-green-500' },
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: leadData }, { data: callLogs }, { data: leadDisputes }, { data: myProfile }] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase.from('call_logs').select('*').eq('lead_id', id).order('called_at', { ascending: false }),
    supabase.from('disputes').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('profiles').select('role, dialer_preference').eq('id', user.id).single(),
  ])

  if (!leadData) notFound()
  const lead = leadData as Lead
  const calls = (callLogs ?? []) as CallLog[]
  const disputes = (leadDisputes ?? []) as Dispute[]
  const isAdmin = myProfile?.role === 'super_admin' || myProfile?.role === 'team_admin'
  const dialerPreference = (myProfile as { dialer_preference?: string } | null)?.dialer_preference ?? 'default'

  const [vendorResult, agentsResult, assignedResult] = await Promise.all([
    lead.vendor_id
      ? supabase.from('vendors').select('name').eq('id', lead.vendor_id).single()
      : Promise.resolve({ data: null }),
    isAdmin
      ? supabase.from('profiles').select('*').order('first_name')
      : Promise.resolve({ data: [] }),
    lead.assigned_to
      ? supabase.from('profiles').select('first_name, last_name').eq('id', lead.assigned_to).single()
      : Promise.resolve({ data: null }),
  ])

  const vendorName = (vendorResult.data as { name: string } | null)?.name ?? null
  const agents = (agentsResult.data ?? []) as Profile[]
  const assignedName = assignedResult.data
    ? [assignedResult.data.first_name, assignedResult.data.last_name].filter(Boolean).join(' ')
    : null

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">

      {/* Header */}
      <div className="px-8 pt-5 pb-4 shrink-0 border-b border-border">
        <Link href="/leads" className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
          <ChevronLeft size={13} /> Back to Leads
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">
            {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || 'Unknown Lead'}
          </h1>
          <LeadStatusSelect leadId={lead.id} initialStatus={lead.status} />
          <LeadActions lead={lead} userId={user.id} dialerPreference={dialerPreference} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-8 pt-5 pb-5">
        <Tabs defaultValue="details" className="flex-1 min-h-0">

          <div className="shrink-0 mb-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="calls">Dial History ({calls.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="details" className="flex-1 min-h-0 overflow-hidden">
            <div className="grid grid-cols-3 grid-rows-1 gap-4 h-full">
              <ContactInfoCard
                lead={lead}
                vendorName={vendorName}
                isAdmin={isAdmin}
                agents={agents}
                assignedName={assignedName}
                dialerPreference={dialerPreference}
              />

              <HouseholdCard lead={lead} />

              <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
                <NotesCard lead={lead} className="flex-1 min-h-0" />

                <div className="bg-card border border-border rounded-lg p-5 shrink-0">
                  <div className="flex items-center gap-2 pb-4 mb-4 border-b border-border">
                    <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs font-semibold text-foreground">Disputes</p>
                  </div>
                  {disputes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-5 gap-2">
                      <AlertCircle size={20} className="text-border" strokeWidth={1.5} />
                      <p className="text-xs text-muted-foreground">No disputes filed</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0">
                      {disputes.map(d => (
                        <div key={d.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                          <div>
                            <p className="text-xs text-foreground">{formatDisputeReason(d.reason)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(d.created_at)}</p>
                          </div>
                          <DisputeStatusBadge status={d.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="calls" className="flex-1 min-h-0 overflow-y-auto">
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground px-3 py-2.5">Outcome</th>
                    <th className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground px-3 py-2.5">Duration</th>
                    <th className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground px-3 py-2.5">Ended By</th>
                    <th className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground px-3 py-2.5">Notes</th>
                    <th className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground px-3 py-2.5">Recording</th>
                    <th className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground px-3 py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">No dials logged yet</td>
                    </tr>
                  )}
                  {calls.map(call => (
                    <tr key={call.id} className="border-b border-border last:border-0 hover:bg-muted transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={cn(badgeShape, 'gap-1.5 border', outcomeConfig[call.outcome].className)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', outcomeConfig[call.outcome].dotClass)} />
                          {outcomeConfig[call.outcome].label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {call.duration_seconds != null
                          ? `${Math.floor(call.duration_seconds / 60)}:${String(call.duration_seconds % 60).padStart(2, '0')}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {call.ended_by === 'agent' ? 'Agent' : call.ended_by === 'lead' ? 'Lead' : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{call.notes ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        {call.recording_url ? (
                          <a
                            href={call.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-foreground hover:text-muted-foreground transition-colors"
                          >
                            <Play size={11} strokeWidth={2} />
                            Play
                          </a>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{formatDate(call.called_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}
