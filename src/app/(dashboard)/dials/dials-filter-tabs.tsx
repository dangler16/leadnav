'use client'

import { FilterTabs } from '@/components/ui/filter-tabs'

type FilterTab = 'All' | 'Contacted' | 'Appointment Set' | 'Sale' | 'No Answer'

const tabs: { value: FilterTab; label: string }[] = [
  { value: 'All',             label: 'All' },
  { value: 'Contacted',       label: 'Contacted' },
  { value: 'Appointment Set', label: 'Appointment Set' },
  { value: 'Sale',            label: 'Sale' },
  { value: 'No Answer',       label: 'No Answer' },
]

interface DialsFilterTabsProps {
  filter: FilterTab
  counts: Record<FilterTab, number>
}

export function DialsFilterTabs({ filter, counts }: DialsFilterTabsProps) {
  return <FilterTabs tabs={tabs} counts={counts} value={filter} basePath="/dials" />
}
