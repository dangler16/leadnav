'use client'

import { FilterTabs } from '@/components/ui/filter-tabs'
import type { Order } from '@/lib/types'

type StatusFilter = 'all' | Order['status']

const tabs: { value: StatusFilter; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'active',    label: 'Active' },
  { value: 'paused',    label: 'Paused' },
  { value: 'completed', label: 'Completed' },
]

interface OrdersFilterTabsProps {
  filter: StatusFilter
  counts: Record<StatusFilter, number>
}

export function OrdersFilterTabs({ filter, counts }: OrdersFilterTabsProps) {
  return <FilterTabs tabs={tabs} counts={counts} value={filter} basePath="/orders" />
}
