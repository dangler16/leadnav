'use client'

import { FilterTabs } from '@/components/ui/filter-tabs'

type StatusFilter = 'all' | 'new' | 'contacted' | 'not_contacted' | 'appt_set' | 'appt_rescheduled' | 'appt_no_show' | 'appt_no_sale' | 'sale' | 'lost'

const tabs: { value: StatusFilter; label: string }[] = [
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

interface LeadsFilterTabsProps {
  filter: StatusFilter
  counts: Record<StatusFilter, number>
  search: string
}

export function LeadsFilterTabs({ filter, counts, search }: LeadsFilterTabsProps) {
  return (
    <FilterTabs
      tabs={tabs}
      counts={counts}
      value={filter}
      basePath="/leads"
      extraParams={search ? { search } : undefined}
    />
  )
}
