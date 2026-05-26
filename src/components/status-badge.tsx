import { cn } from '@/lib/utils'
import { LeadStatus, DisputeStatus, getLeadDisplayStatus } from '@/lib/types'

const pill = 'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap'

type LeadBadgeProps = { status: LeadStatus; variant?: 'display' | 'raw'; className?: string }
type DisputeBadgeProps = { status: DisputeStatus; className?: string }

export function LeadStatusBadge({ status, variant = 'display', className }: LeadBadgeProps) {
  if (variant === 'display') {
    const display = getLeadDisplayStatus(status)
    const displayColors: Record<string, string> = {
      Active: 'bg-green-50 text-green-700',
      Closed: 'bg-yellow-50 text-yellow-700',
      Lost:   'bg-red-50 text-red-700',
    }
    return (
      <span className={cn(pill, displayColors[display] ?? 'bg-muted text-muted-foreground', className)}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {display.toLowerCase()}
      </span>
    )
  }

  const rawColors: Record<LeadStatus, string> = {
    new:              'bg-blue-50 text-blue-700',
    not_contacted:    'bg-muted text-muted-foreground',
    contacted:        'bg-green-50 text-green-700',
    appt_set:         'bg-teal-50 text-teal-700',
    appt_no_show:     'bg-yellow-50 text-yellow-700',
    appt_no_sale:     'bg-red-50 text-red-700',
    appt_rescheduled: 'bg-purple-50 text-purple-700',
    sale:             'bg-green-50 text-green-700',
    lost:             'bg-red-50 text-red-700',
  }
  const rawLabels: Record<LeadStatus, string> = {
    new:              'new',
    not_contacted:    'not contacted',
    contacted:        'contacted',
    appt_set:         'appt set',
    appt_no_show:     'no show',
    appt_no_sale:     'no sale',
    appt_rescheduled: 'rescheduled',
    sale:             'sale',
    lost:             'lost',
  }
  return (
    <span className={cn(pill, rawColors[status], className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {rawLabels[status]}
    </span>
  )
}

export function DisputeStatusBadge({ status, className }: DisputeBadgeProps) {
  const colors: Record<DisputeStatus, string> = {
    open:      'bg-yellow-50 text-yellow-700',
    in_review: 'bg-blue-50 text-blue-700',
    resolved:  'bg-green-50 text-green-700',
    rejected:  'bg-red-50 text-red-700',
  }
  const labels: Record<DisputeStatus, string> = {
    open:      'open',
    in_review: 'in review',
    resolved:  'resolved',
    rejected:  'rejected',
  }
  return (
    <span className={cn(pill, colors[status], className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  )
}
