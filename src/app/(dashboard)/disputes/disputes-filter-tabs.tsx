'use client'

import { FilterTabs } from '@/components/ui/filter-tabs'

type FilterTab = 'All' | 'Active' | 'Resolved' | 'Rejected'

const tabs: { value: FilterTab; label: string }[] = [
  { value: 'All',      label: 'All' },
  { value: 'Active',   label: 'Active' },
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Rejected', label: 'Rejected' },
]

interface DisputesFilterTabsProps {
  filter: FilterTab
  counts: Record<FilterTab, number>
}

export function DisputesFilterTabs({ filter, counts }: DisputesFilterTabsProps) {
  return <FilterTabs tabs={tabs} counts={counts} value={filter} basePath="/disputes" />
}
