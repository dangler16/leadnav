import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Lead, Profile, CallLog, Dispute, CallOutcome, formatDisputeReason } from '@/lib/types'
import { LeadActions } from './lead-actions'
import { ContactInfoCard } from './contact-info-card'
import { HouseholdCard } from './household-card'
import { NotesCard } from './notes-card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ChevronLeft, AlertCircle } from 'lucide-react'
import { DisputeStatusBadge } from '@/components/status-badge'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

const outcomeConfig: Record<CallOutcome, { label: string; bg: string; color: string; borderColor: string; dotColor: string }> = {
  no_answer:        { label: 'No Answer',         bg: '#f3f4f6', color: '#4b5563', borderColor: '#e5e7eb', dotColor: '#9ca3af' },
  voicemail:        { label: 'Voicemail',          bg: '#f3f4f6', color: '#4b5563', borderColor: '#e5e7eb', dotColor: '#9ca3af' },
  callback_requested: { label: 'Callback Requested', bg: '#cffafe', color: '#0e7490', borderColor: '#a5f3fc', dotColor: '#06b6d4' },
  appointment_set:  { label: 'Appointment Set',   bg: '#e0e7ff', color: '#4338ca', borderColor: '#c7d2fe', dotColor: '#6366f1' },
  contacted:        { label: 'Contacted',          bg: '#cffafe', color: '#0e7490', borderColor: '#a5f3fc', dotColor: '#06b6d4' },
  not_interested:   { label: 'Not Interested',     bg: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca', dotColor: '#ef4444' },
  wrong_number:     { label: 'Wrong Number',       bg: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca', dotColor: '#ef4444' },
  sale:             { label: 'Sale',               bg: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0', dotColor: '#22c55e' },
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
  const isAdmin = myProfile?.role === 'admin'

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
        <Link href="/leads" className="flex items-center gap-0 text-sm text-gray-500 hover:text-gray-700 mb-1 -mt-1 -ml-1">
          <ChevronLeft size={15} /> Back to Leads
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || 'Unknown Lead'}
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-gray-400">{formatDate(lead.created_at)}</span>
            </div>
          </div>
          <LeadActions lead={lead} userId={user.id} />
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="calls">Call History ({calls.length})</TabsTrigger>
        </TabsList>

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
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-sm bg-red-50 flex items-center justify-center text-red-600">
                  <AlertCircle size={18} />
                </div>
                <p className="font-semibold text-base text-gray-800">Disputes</p>
              </div>
              {disputes.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No disputes</p>
              ) : (
                <div className="space-y-2">
                  {disputes.map(d => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm text-gray-800">{formatDisputeReason(d.reason)}</p>
                        <p className="text-xs text-gray-400">{formatDate(d.created_at)}</p>
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
          <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-md">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Outcome</th>
                  <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Notes</th>
                  <th className="text-left text-sm font-medium text-gray-400 px-3 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {calls.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-sm text-gray-400">No calls logged yet</td>
                  </tr>
                )}
                {calls.map(call => (
                  <tr key={call.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1.5 text-sm font-medium px-1.5 py-0.5 rounded-sm border"
                        style={{
                          background: outcomeConfig[call.outcome].bg,
                          color: outcomeConfig[call.outcome].color,
                          borderColor: outcomeConfig[call.outcome].borderColor,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: outcomeConfig[call.outcome].dotColor }} />
                        {outcomeConfig[call.outcome].label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">{call.notes ?? '—'}</td>
                    <td className="px-3 py-2 text-sm text-gray-400 whitespace-nowrap">{formatDate(call.called_at)}</td>
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
