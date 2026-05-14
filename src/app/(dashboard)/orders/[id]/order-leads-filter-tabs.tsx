'use client'

import { FilterTabs } from '@/components/ui/filter-tabs'
import type { LeadStatus } from '@/lib/types'

type LeadStatusFilter = 'all' | LeadStatus

const tabs: { value: LeadStatusFilter; label: string }[] = [
  { value: 'all',              label: 'All' },
  { value: 'new',              label: 'New' },
  { value: 'not_contacted',    label: 'Not Contacted' },
  { value: 'contacted',        label: 'Contacted' },
  { value: 'appt_set',         label: 'Appt Set' },
  { value: 'appt_no_show',     label: 'No-Show' },
  { value: 'appt_no_sale',     label: 'No-Sale' },
  { value: 'appt_rescheduled', label: 'Rescheduled' },
  { value: 'sale',             label: 'Sale' },
  { value: 'lost',             label: 'Lost' },
]

interface OrderLeadsFilterTabsProps {
  orderId: string
  filter: LeadStatusFilter
  counts: Record<LeadStatusFilter, number>
}

export function OrderLeadsFilterTabs({ orderId, filter, counts }: OrderLeadsFilterTabsProps) {
  return <FilterTabs tabs={tabs} counts={counts} value={filter} basePath={`/orders/${orderId}`} />
}
