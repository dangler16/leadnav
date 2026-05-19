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
  no_answer:          { label: 'No Answer',         className: 'bg-gray-100 text-gray-600 border-gray-200',     dotClass: 'bg-gray-400' },
  voicemail:          { label: 'Voicemail',          className: 'bg-gray-100 text-gray-600 border-gray-200',     dotClass: 'bg-gray-400' },
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
    <div className="flex flex-col h-full overflow-hidden bg-white">

      {/* Header */}
      <div className="px-8 pt-5 pb-4 shrink-0 border-b border-gray-100">
        <Link href="/leads" className="flex items-center gap-0.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-2">
          <ChevronLeft size={13} /> Back to Leads
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || 'Unknown Lead'}
          </h1>
          <LeadStatusSelect leadId={lead.id} initialStatus={lead.status} />
          <LeadActions lead={lead} userId={user.id} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-8 pt-5 pb-5">
        <Tabs defaultValue="details" className="flex-1 min-h-0">

          <div className="shrink-0 mb-4">
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="calls">Call History ({calls.length})</TabsTrigger>
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
              />

              <HouseholdCard lead={lead} />

              <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
                <NotesCard lead={lead} className="flex-1 min-h-0" />

                <div className="bg-white border border-gray-200 rounded-lg p-5 shrink-0">
                  <div className="flex items-center gap-2 pb-4 mb-4 border-b border-gray-200">
                    <AlertCircle className="w-4 h-4 text-gray-500" />
                    <p className="text-sm font-semibold text-gray-900">Disputes</p>
                  </div>
                  {disputes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-5 gap-2">
                      <AlertCircle size={20} className="text-gray-200" strokeWidth={1.5} />
                      <p className="text-xs text-gray-400">No disputes filed</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0">
                      {disputes.map(d => (
                        <div key={d.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                          <div>
                            <p className="text-sm text-gray-900">{formatDisputeReason(d.reason)}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{formatDate(d.created_at)}</p>
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
            <div className="border border-gray-200 rounded overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium uppercase tracking-wide text-gray-500 px-3 py-2.5">Outcome</th>
                    <th className="text-left text-xs font-medium uppercase tracking-wide text-gray-500 px-3 py-2.5">Notes</th>
                    <th className="text-left text-xs font-medium uppercase tracking-wide text-gray-500 px-3 py-2.5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-sm text-gray-400">No calls logged yet</td>
                    </tr>
                  )}
                  {calls.map(call => (
                    <tr key={call.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={cn(badgeShape, 'gap-1.5 border', outcomeConfig[call.outcome].className)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', outcomeConfig[call.outcome].dotClass)} />
                          {outcomeConfig[call.outcome].label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{call.notes ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">{formatDate(call.called_at)}</td>
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
