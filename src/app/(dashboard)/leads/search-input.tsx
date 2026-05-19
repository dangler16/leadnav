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
      className="text-sm bg-white border border-gray-200 rounded-md px-3 py-2 w-60 outline-none hover:border-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 placeholder:text-gray-400 transition-colors"
    />
  )
}
