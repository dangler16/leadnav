'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef } from 'react'

export function SearchInput({ defaultValue }: { defaultValue: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (e.target.value) {
        params.set('search', e.target.value)
      } else {
        params.delete('search')
      }
      router.push(`/leads?${params.toString()}`)
    }, 300)
  }

  return (
    <input
      defaultValue={defaultValue}
      onChange={handleChange}
      placeholder="Search by name, email, phone..."
      className="text-xs bg-card border border-border rounded-md px-3 py-2 w-60 outline-none hover:border-border/80 focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground transition-colors"
    />
  )
}
