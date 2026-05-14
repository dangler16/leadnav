'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export type SortDir = 'asc' | 'desc'

interface Props {
  column: string
  label: string
  currentSort: string | null
  currentDir: SortDir | null
}

export function SortableHeader({ column, label, currentSort, currentDir }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleClick() {
    const params = new URLSearchParams(searchParams.toString())
    if (currentSort !== column) {
      params.set('sort', column)
      params.set('sortDir', 'asc')
    } else if (currentDir === 'asc') {
      params.set('sortDir', 'desc')
    } else {
      params.delete('sort')
      params.delete('sortDir')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const isActive = currentSort === column

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
    >
      {label}
      {isActive ? (
        currentDir === 'asc'
          ? <ChevronUp className="w-3.5 h-3.5" />
          : <ChevronDown className="w-3.5 h-3.5" />
      ) : (
        <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
      )}
    </button>
  )
}
