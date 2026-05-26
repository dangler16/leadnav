export type UserRole = 'super_admin' | 'team_admin' | 'user'

export type Profile = {
  id: string
  first_name: string
  last_name: string
  role: UserRole
  wallet_balance_cents: number
  stripe_customer_id: string | null
  avatar_url: string | null
  dark_mode: boolean
  dialer_preference: string
  created_at: string
}

export type WalletTransactionType = 'topup' | 'charge' | 'refund'

export type WalletTransaction = {
  id: string
  user_id: string
  type: WalletTransactionType
  amount_cents: number
  stripe_payment_intent_id: string | null
  lead_id: string | null
  description: string | null
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
  notes: string | null
  status: LeadStatus
  created_at: string
  updated_at: string
}

export type Order = {
  id: string
  account_id: string | null
  placed_by: string | null
  vendor_id: string | null
  lead_type: string | null
  lead_types: string[]
  daily_budget: number | null
  states: string[]
  availability: string[]
  status: 'active' | 'paused' | 'completed'
  created_at: string
}

export type OrderAgent = {
  order_id: string
  user_id: string
  created_at: string
}

export type Vendor = {
  id: string
  name: string
  logo_url: string | null
  type: 'inbound' | 'manual'
  lead_types: string[]
  lead_type_costs: Record<string, number>
  locations: string[]
  cost_per_lead: number | null
  is_active: boolean
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
  | 'callback_requested'
  | 'appointment_set'
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
  ended_by: string | null
  recording_url: string | null
  notes: string | null
  created_at: string
}

export type DisputeReason = 'bad_phone' | 'bad_email' | 'bad_address' | 'duplicate' | 'not_interested' | 'other'
export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'rejected'

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

export type TeamBillingMode = 'team_card' | 'individual'

export type Team = {
  id: string
  name: string
  logo_url: string | null
  billing_mode: TeamBillingMode
  created_at: string
}

export type TeamMember = {
  team_id: string
  user_id: string
  can_order: boolean
  can_view_leads: boolean
  can_make_calls: boolean
  can_file_disputes: boolean
  created_at: string
}

export type TeamAdminAssignment = {
  team_id: string
  user_id: string
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
