import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Lead, Profile, CallLog, Dispute, LeadStatus, CallOutcome, formatDisputeReason } from '@/lib/types'
import { LeadStatusBadge, DisputeStatusBadge } from '@/components/status-badge'
import { LeadActions } from './lead-actions'
import { ReassignLead } from './reassign-lead'
import { ChevronLeft, Phone, AlertCircle, User, Mail, PhoneCall, MapPin, Calendar, DollarSign, Store } from 'lucide-react'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
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
  no_answer: 'text-gray-500',
  voicemail: 'text-gray-500',
  left_message: 'text-blue-600',
  callback_requested: 'text-indigo-600',
  contacted: 'text-green-600',
  not_interested: 'text-orange-600',
  wrong_number: 'text-red-600',
  sale: 'text-green-700',
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
      ? supabase.from('profiles').select('*').eq('role', 'agent').order('first_name')
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

  const statusOptions: LeadStatus[] = [
    'new', 'not_contacted', 'contacted', 'appt_set',
    'appt_no_show', 'appt_no_sale', 'appt_rescheduled', 'sale', 'lost',
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/leads" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ChevronLeft size={15} /> Back to Leads
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || 'Unknown Lead'}
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <LeadStatusBadge status={lead.status} />
              <span className="text-xs text-gray-400">Added {formatDate(lead.created_at)}</span>
            </div>
          </div>
          <LeadActions lead={lead} statusOptions={statusOptions} userId={user.id} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          {/* Contact info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <User size={14} />
              </div>
              <p className="text-sm font-semibold text-gray-900">Contact Info</p>
            </div>
            <div className="space-y-3">
              {[
                { icon: <PhoneCall size={13} />, label: 'Phone', value: lead.phone },
                { icon: <Mail size={13} />, label: 'Email', value: lead.email },
                { icon: <Calendar size={13} />, label: 'Birthday', value: lead.birthday },
                { icon: <MapPin size={13} />, label: 'Location', value: [lead.state, lead.zip].filter(Boolean).join(', ') || null },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-gray-400">{icon}</span>
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-sm text-gray-800 font-medium">{value ?? '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insurance info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <DollarSign size={14} />
              </div>
              <p className="text-sm font-semibold text-gray-900">Insurance Details</p>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Lead Type', value: lead.lead_type },
                { label: 'Plan For', value: lead.plan_for },
                { label: 'Looking For', value: lead.looking_for },
                { label: 'Household Size', value: lead.household?.toString() },
                { label: 'Income', value: lead.income ? `$${lead.income.toLocaleString()}` : null },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-sm text-gray-800 font-medium">{value ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Source & assignment */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <Store size={14} />
              </div>
              <p className="text-sm font-semibold text-gray-900">Source</p>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400">Vendor</p>
                <p className="text-sm text-gray-800 font-medium">{vendorName ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Assigned To</p>
                {isAdmin ? (
                  <ReassignLead leadId={lead.id} currentAgentId={lead.assigned_to} agents={agents} />
                ) : (
                  <p className="text-sm text-gray-800 font-medium">{assignedName ?? 'Unassigned'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Disputes */}
          {disputes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                  <AlertCircle size={14} />
                </div>
                <p className="text-sm font-semibold text-gray-900">Disputes</p>
              </div>
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
            </div>
          )}
        </div>

        <div className="col-span-2 space-y-4">
          <LeadActions lead={lead} statusOptions={statusOptions} userId={user.id} showCallForm />

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                <Phone size={14} />
              </div>
              <p className="text-sm font-semibold text-gray-900">Call History</p>
              <span className="ml-auto text-xs text-gray-400">{calls.length} call{calls.length !== 1 ? 's' : ''}</span>
            </div>
            {calls.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No calls logged yet</p>
            ) : (
              <div className="space-y-3">
                {calls.map(call => (
                  <div key={call.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Phone size={12} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${outcomeColors[call.outcome]}`}>
                          {outcomeLabels[call.outcome]}
                        </span>
                        {call.duration_seconds && (
                          <span className="text-xs text-gray-400">
                            {Math.floor(call.duration_seconds / 60)}:{String(call.duration_seconds % 60).padStart(2, '0')}
                          </span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">{formatDate(call.called_at)}</span>
                      </div>
                      {call.notes && <p className="text-sm text-gray-600 mt-1">{call.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
