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
        className="relative inline-flex items-center gap-1 rounded-md bg-muted border border-border p-0.5 text-muted-foreground w-fit flex-wrap"
      >
        {tabs.map(tab => (
          <TabsPrimitive.Tab
            key={tab.value}
            value={tab.value}
            className={cn(
              'relative z-10 inline-flex items-center justify-center rounded-sm px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors',
              'text-muted-foreground hover:text-foreground data-[active]:text-white',
            )}
          >
            {tab.label} ({counts[tab.value]})
          </TabsPrimitive.Tab>
        ))}
        <TabsPrimitive.Indicator
          className="absolute rounded-sm bg-red-600 border-1 border-black/10 transition-all duration-200 ease-out"
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
