'use client'

import { FilterTabs } from '@/components/ui/filter-tabs'

type FilterTab = 'All' | 'Active' | 'Closed' | 'Lost'

const tabs: { value: FilterTab; label: string }[] = [
  { value: 'All',    label: 'All' },
  { value: 'Active', label: 'Active' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Lost',   label: 'Lost' },
]

interface DisputesFilterTabsProps {
  filter: FilterTab
  counts: Record<FilterTab, number>
}

export function DisputesFilterTabs({ filter, counts }: DisputesFilterTabsProps) {
  return <FilterTabs tabs={tabs} counts={counts} value={filter} basePath="/disputes" />
}
