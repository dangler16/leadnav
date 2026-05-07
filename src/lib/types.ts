export type Profile = {
  id: string
  first_name: string
  last_name: string
  role: 'agent' | 'admin'
  created_at: string
}

export type LeadStatus =
  | 'new'
  | 'not_contacted'
  | 'contacted'
  | 'appt_set'
  | 'appt_no_show'
  | 'appt_no_sale'
  | 'appt_rescheduled'
  | 'sale'
  | 'lost'

export type Lead = {
  id: string
  order_id: string | null
  vendor_id: string | null
  assigned_to: string | null
  firstname: string | null
  lastname: string | null
  birthday: string | null
  email: string | null
  phone: string | null
  state: string | null
  zip: string | null
  plan_for: string | null
  looking_for: string | null
  income: number | null
  household: number | null
  utm_source: string | null
  utm_campaign: string | null
  utm_medium: string | null
  lead_type: string | null
  status: LeadStatus
  created_at: string
  updated_at: string
}

export type Order = {
  id: string
  account_id: string | null
  vendor_id: string | null
  lead_type: string | null
  daily_budget: number | null
  status: 'placed' | 'active' | 'paused' | 'completed' | 'cancelled' | 'expired'
  created_at: string
}

export type Vendor = {
  id: string
  name: string
  type: 'inbound' | 'manual'
  lead_types: string[]
  locations: string[]
  cost_per_lead: number | null
  created_at: string
}

export type VendorApiKey = {
  id: string
  vendor_id: string
  key_prefix: string
  label: string | null
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

export type CallOutcome =
  | 'no_answer'
  | 'voicemail'
  | 'left_message'
  | 'callback_requested'
  | 'contacted'
  | 'not_interested'
  | 'wrong_number'
  | 'sale'

export type CallLog = {
  id: string
  lead_id: string
  agent_id: string
  called_at: string
  outcome: CallOutcome
  duration_seconds: number | null
  notes: string | null
  created_at: string
}

export type DisputeReason = 'bad_phone' | 'bad_email' | 'bad_address' | 'duplicate' | 'not_interested' | 'other'
export type DisputeStatus = 'pending' | 'active' | 'closed' | 'lost'

export type Dispute = {
  id: string
  lead_id: string
  agent_id: string
  reason: DisputeReason
  status: DisputeStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type Team = {
  id: string
  name: string
  logo_url: string | null
  phone: string | null
  created_at: string
}

export type TeamMember = {
  team_id: string
  user_id: string
  role: 'leader' | 'member'
  created_at: string
}

export type NotificationType = 'new_lead' | 'dispute_update' | 'order_update' | 'general'

export type Notification = {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  link: string | null
  read: boolean
  created_at: string
}

export type LeadDisplayStatus = 'Active' | 'Closed' | 'Lost'

export function getLeadDisplayStatus(status: LeadStatus): LeadDisplayStatus {
  if (status === 'lost') return 'Lost'
  if (status === 'sale' || status === 'appt_no_sale') return 'Closed'
  return 'Active'
}

export function formatLeadStatusLabel(status: LeadStatus): string {
  const labels: Record<LeadStatus, string> = {
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
  return labels[status]
}

export function formatDisputeReason(reason: DisputeReason): string {
  const labels: Record<DisputeReason, string> = {
    bad_phone: 'Bad Phone',
    bad_email: 'Bad Email',
    bad_address: 'Bad Address',
    duplicate: 'Duplicate',
    not_interested: 'Not Interested',
    other: 'Other',
  }
  return labels[reason]
}
