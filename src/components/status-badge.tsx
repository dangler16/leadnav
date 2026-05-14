import { cn } from '@/lib/utils'
import { badgeShape } from '@/components/ui/badge'
import { LeadStatus, DisputeStatus, getLeadDisplayStatus } from '@/lib/types'

type LeadBadgeProps = { status: LeadStatus; variant?: 'display' | 'raw'; className?: string }
type DisputeBadgeProps = { status: DisputeStatus; className?: string }

const shape = badgeShape

const displayColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Closed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Lost:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function LeadStatusBadge({ status, variant = 'display', className }: LeadBadgeProps) {
  if (variant === 'display') {
    const display = getLeadDisplayStatus(status)
    return (
      <span className={cn(shape, displayColors[display], className)}>
        {display}
      </span>
    )
  }
  const rawColors: Record<LeadStatus, string> = {
    new:              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    not_contacted:    'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400',
    contacted:        'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    appt_set:         'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    appt_no_show:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    appt_no_sale:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    appt_rescheduled: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    sale:             'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    lost:             'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
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
    <span className={cn(shape, rawColors[status], className)}>
      {rawLabels[status]}
    </span>
  )
}

export function DisputeStatusBadge({ status, className }: DisputeBadgeProps) {
  const colors: Record<DisputeStatus, string> = {
    open:      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    in_review: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    resolved:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  const labels: Record<DisputeStatus, string> = {
    open:      'Open',
    in_review: 'In Review',
    resolved:  'Resolved',
    rejected:  'Rejected',
  }
  return (
    <span className={cn(shape, colors[status], className)}>
      {labels[status]}
    </span>
  )
}
