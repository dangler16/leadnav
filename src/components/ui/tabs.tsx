"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("flex data-horizontal:flex-col", className)}
      {...props}
    />
  )
}

function TabsList({ className, children, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative inline-flex items-center gap-0.5 rounded bg-gray-100 border border-gray-200 p-0.5 text-gray-500 w-fit",
        className
      )}
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator
        className="absolute rounded-sm bg-gray-900 transition-all duration-200 ease-out"
        style={{
          left: "var(--active-tab-left)",
          top: "var(--active-tab-top)",
          width: "var(--active-tab-width)",
          height: "var(--active-tab-height)",
        }}
      />
    </TabsPrimitive.List>
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
        "not-data-[active]:text-gray-500 not-data-[active]:bg-gray-100 not-data-[active]:hover:text-gray-900",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[active]:text-white",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-xs outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
