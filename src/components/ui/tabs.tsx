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
      className={cn("flex gap-2 data-horizontal:flex-col", className)}
      {...props}
    />
  )
}

function TabsList({ className, children, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative inline-flex items-center gap-1 rounded-lg bg-transparent border-1 border-black/10 p-0.5 text-muted-foreground w-fit -mb-1",
        className
      )}
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator
        className="absolute rounded-sm bg-red-600 border-1 border-black/10 transition-all duration-200 ease-out"
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
        "relative z-10 inline-flex items-center justify-center rounded-sm px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors",
        "not-data-active:hover:text-foreground",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-active:text-white",
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
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
