import { cn } from '@/lib/utils'
import { LeadStatus, DisputeStatus, getLeadDisplayStatus } from '@/lib/types'

type LeadBadgeProps = { status: LeadStatus; variant?: 'display' | 'raw' }
type DisputeBadgeProps = { status: DisputeStatus }

const displayColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-700',
  Closed: 'bg-amber-100 text-amber-700',
  Lost: 'bg-red-100 text-red-700',
  Pending: 'bg-orange-100 text-orange-700',
}

export function LeadStatusBadge({ status, variant = 'display' }: LeadBadgeProps) {
  if (variant === 'display') {
    const display = getLeadDisplayStatus(status)
    return (
      <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', displayColors[display])}>
        {display}
      </span>
    )
  }
  const rawColors: Record<LeadStatus, string> = {
    new: 'bg-blue-100 text-blue-700',
    not_contacted: 'bg-gray-100 text-gray-600',
    contacted: 'bg-cyan-100 text-cyan-700',
    appt_set: 'bg-indigo-100 text-indigo-700',
    appt_no_show: 'bg-yellow-100 text-yellow-700',
    appt_no_sale: 'bg-orange-100 text-orange-700',
    appt_rescheduled: 'bg-purple-100 text-purple-700',
    sale: 'bg-green-100 text-green-700',
    lost: 'bg-red-100 text-red-700',
  }
  const rawLabels: Record<LeadStatus, string> = {
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
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', rawColors[status])}>
      {rawLabels[status]}
    </span>
  )
}

export function DisputeStatusBadge({ status }: DisputeBadgeProps) {
  const colors: Record<DisputeStatus, string> = {
    pending: 'bg-orange-100 text-orange-700',
    active: 'bg-green-100 text-green-700',
    closed: 'bg-amber-100 text-amber-700',
    lost: 'bg-red-100 text-red-700',
  }
  const labels: Record<DisputeStatus, string> = {
    pending: 'Pending',
    active: 'Active',
    closed: 'Closed',
    lost: 'Lost',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', colors[status])}>
      {labels[status]}
    </span>
  )
}
