'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lead, LeadStatus, CallOutcome } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Phone, Plus } from 'lucide-react'

const statusLabels: Record<LeadStatus, string> = {
  new: 'New',
  not_contacted: 'Not Contacted',
  contacted: 'Contacted',
  appt_set: 'Appt Set',
  appt_no_show: 'No Show',
  appt_no_sale: 'No Sale',
  appt_rescheduled: 'Rescheduled',
  sale: 'Sale',
  lost: 'Lost',
}

const outcomeOptions: { value: CallOutcome; label: string }[] = [
  { value: 'no_answer', label: 'No Answer' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'left_message', label: 'Left Message' },
  { value: 'callback_requested', label: 'Callback Requested' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'sale', label: 'Sale' },
]

type Props = {
  lead: Lead
  statusOptions: LeadStatus[]
  userId: string
  showCallForm?: boolean
}

export function LeadActions({ lead, statusOptions, userId, showCallForm }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [savingStatus, setSavingStatus] = useState(false)

  const [showCall, setShowCall] = useState(false)
  const [outcome, setOutcome] = useState<CallOutcome>('no_answer')
  const [notes, setNotes] = useState('')
  const [duration, setDuration] = useState('')
  const [savingCall, setSavingCall] = useState(false)

  async function updateStatus(newStatus: LeadStatus) {
    setSavingStatus(true)
    setStatus(newStatus)
    await supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', lead.id)
    setSavingStatus(false)
    router.refresh()
  }

  async function logCall(e: React.FormEvent) {
    e.preventDefault()
    setSavingCall(true)
    await supabase.from('call_logs').insert({
      lead_id: lead.id,
      agent_id: userId,
      outcome,
      notes: notes || null,
      duration_seconds: duration ? parseInt(duration) : null,
      called_at: new Date().toISOString(),
    })
    setNotes('')
    setDuration('')
    setShowCall(false)
    setSavingCall(false)
    router.refresh()
  }

  if (!showCallForm) {
    return (
      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={e => updateStatus(e.target.value as LeadStatus)}
          disabled={savingStatus}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 bg-white"
        >
          {statusOptions.map(s => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>
        <Button onClick={() => setShowCall(true)} variant="outline" className="flex items-center gap-2">
          <Phone size={14} /> Log Call
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
          <Phone size={14} />
        </div>
        <p className="text-sm font-semibold text-gray-900">Log a Call</p>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={status}
            onChange={e => updateStatus(e.target.value as LeadStatus)}
            disabled={savingStatus}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 bg-white"
          >
            {statusOptions.map(s => (
              <option key={s} value={s}>{statusLabels[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={logCall} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Outcome</label>
            <select
              value={outcome}
              onChange={e => setOutcome(e.target.value as CallOutcome)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 bg-white"
            >
              {outcomeOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Duration (seconds)</label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              placeholder="e.g. 120"
              min="0"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-1">Notes</label>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Call notes…"
            rows={2}
            className="text-sm resize-none"
          />
        </div>
        <Button type="submit" disabled={savingCall} className="flex items-center gap-2">
          <Plus size={14} /> {savingCall ? 'Saving…' : 'Log Call'}
        </Button>
      </form>
    </div>
  )
}
