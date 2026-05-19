'use client'

import { useRouter } from 'next/navigation'
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { cn } from '@/lib/utils'

interface FilterTab<T extends string> {
  value: T
  label: string
}

interface FilterTabsProps<T extends string> {
  tabs: FilterTab<T>[]
  counts: Record<T, number>
  value: T
  basePath: string
  extraParams?: Record<string, string>
}

export function FilterTabs<T extends string>({ tabs, counts, value, basePath, extraParams }: FilterTabsProps<T>) {
  const router = useRouter()

  function handleChange(newValue: string | null) {
    if (!newValue) return
    const params = new URLSearchParams({ filter: newValue, ...extraParams })
    router.push(`${basePath}?${params.toString()}`)
  }

  return (
    <TabsPrimitive.Root value={value} onValueChange={handleChange}>
      <TabsPrimitive.List
        className="relative inline-flex items-center gap-0.5 rounded bg-gray-100 border border-gray-200 p-0.5 text-gray-500 w-fit flex-wrap"
      >
        {tabs.map(tab => {
          const count = counts[tab.value]
          const isEmpty = count === 0
          return (
            <TabsPrimitive.Tab
              key={tab.value}
              value={tab.value}
              className={cn(
                'relative z-10 inline-flex items-center gap-1 justify-center rounded-sm px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                'data-[active]:text-white',
                isEmpty
                  ? 'text-gray-400 opacity-40'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              {tab.label}
              <span className={cn('font-mono tabular-nums', isEmpty ? 'text-gray-400' : 'text-gray-400')}>
                {count}
              </span>
            </TabsPrimitive.Tab>
          )
        })}
        <TabsPrimitive.Indicator
          className="absolute rounded-sm bg-gray-900 transition-all duration-200 ease-out"
          style={{
            left: 'var(--active-tab-left)',
            top: 'var(--active-tab-top)',
            width: 'var(--active-tab-width)',
            height: 'var(--active-tab-height)',
          }}
        />
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  )
}
