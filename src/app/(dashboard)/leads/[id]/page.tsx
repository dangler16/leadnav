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
import { ChevronLeft, AlertCircle } from 'lucide-react'
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
  no_answer:          { label: 'No Answer',         className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',     dotClass: 'bg-gray-400 dark:bg-gray-500' },
  voicemail:          { label: 'Voicemail',          className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',     dotClass: 'bg-gray-400 dark:bg-gray-500' },
  callback_requested: { label: 'Callback Requested', className: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',     dotClass: 'bg-cyan-500' },
  appointment_set:    { label: 'Appointment Set',    className: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800', dotClass: 'bg-indigo-500' },
  contacted:          { label: 'Contacted',          className: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',     dotClass: 'bg-cyan-500' },
  not_interested:     { label: 'Not Interested',     className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',           dotClass: 'bg-red-500' },
  wrong_number:       { label: 'Wrong Number',       className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',           dotClass: 'bg-red-500' },
  sale:               { label: 'Sale',               className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', dotClass: 'bg-green-500' },
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
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ])

  if (!leadData) notFound()
  const lead = leadData as Lead
  const calls = (callLogs ?? []) as CallLog[]
  const disputes = (leadDisputes ?? []) as Dispute[]
  const isAdmin = myProfile?.role === 'super_admin' || myProfile?.role === 'team_admin'

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
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7">
      <div>
        <Link href="/leads" className="flex items-center gap-0 text-sm text-muted-foreground hover:text-foreground mb-1 -mt-1 -ml-1">
          <ChevronLeft size={15} /> Back to Leads
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || 'Unknown Lead'}
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-muted-foreground">{formatDate(lead.created_at)}</span>
            </div>
          </div>
          <LeadActions lead={lead} userId={user.id} />
        </div>
      </div>

      <Tabs defaultValue="details">
        <div className="flex items-center gap-3">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="calls">Call History ({calls.length})</TabsTrigger>
          </TabsList>
          <LeadStatusSelect leadId={lead.id} initialStatus={lead.status} />
        </div>

        <TabsContent value="details">
          <div className="grid grid-cols-3 gap-4 mt-4">
            <ContactInfoCard
              lead={lead}
              vendorName={vendorName}
              isAdmin={isAdmin}
              agents={agents}
              assignedName={assignedName}
            />

            <HouseholdCard lead={lead} />

            <div className="flex flex-col gap-4">
            <NotesCard lead={lead} />
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-sm bg-accent flex items-center justify-center text-accent-foreground">
                  <AlertCircle size={18} />
                </div>
                <p className="font-semibold text-base text-foreground">Disputes</p>
              </div>
              {disputes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No disputes</p>
              ) : (
                <div className="space-y-2">
                  {disputes.map(d => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <div>
                        <p className="text-sm text-foreground">{formatDisputeReason(d.reason)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(d.created_at)}</p>
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

        <TabsContent value="calls">
          <div className="mt-4 bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-md">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Outcome</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Notes</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {calls.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-sm text-muted-foreground">No calls logged yet</td>
                  </tr>
                )}
                {calls.map(call => (
                  <tr key={call.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={cn(badgeShape, 'gap-1.5 border', outcomeConfig[call.outcome].className)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', outcomeConfig[call.outcome].dotClass)} />
                        {outcomeConfig[call.outcome].label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">{call.notes ?? '—'}</td>
                    <td className="px-3 py-2 text-sm text-muted-foreground whitespace-nowrap">{formatDate(call.called_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
