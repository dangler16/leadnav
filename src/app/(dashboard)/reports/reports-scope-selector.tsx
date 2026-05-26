'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UserRole } from '@/lib/types'

export type AgentOption = { id: string; name: string; isMe?: boolean }

interface Props {
  role: UserRole
  agents: AgentOption[]
  selectedIds: string[]
}

export function ReportsScopeSelector({ role, agents, selectedIds }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [rendered, setRendered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) setRendered(true)
  }, [open])

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleToggle() {
    if (!open) {
      setRendered(true)
      requestAnimationFrame(() => setOpen(true))
    } else {
      setOpen(false)
    }
  }

  function navigate(ids: string[]) {
    const p = new URLSearchParams(searchParams.toString())
    if (ids.length === 0) p.delete('agentIds')
    else p.set('agentIds', ids.join(','))
    router.push(`/reports?${p.toString()}`)
  }

  function toggle(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    navigate([...next])
  }

  function selectAll() {
    navigate([])
  }

  const allSelected = selectedIds.length === 0
  const allLabel = role === 'super_admin' ? 'All Agents' : 'My Team'

  let triggerLabel: string
  if (allSelected) {
    triggerLabel = allLabel
  } else if (selectedIds.length === 1) {
    triggerLabel = agents.find(a => a.id === selectedIds[0])?.name ?? '1 agent'
  } else {
    triggerLabel = `${selectedIds.length} agents`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs border border-border bg-card text-foreground rounded-md px-2.5 py-1.5 cursor-pointer hover:bg-muted transition-colors"
      >
        {triggerLabel}
        <ChevronDown size={11} className={cn('dropdown-chevron', open && 'open')} />
      </button>

      {rendered && (
        <div className={cn(
          'absolute top-full left-0 mt-0.5 z-50 bg-card border border-border rounded shadow-sm w-52 max-h-72 overflow-y-auto py-1 dropdown-panel',
          open && 'open',
        )}>
          <button
            onClick={selectAll}
            className="flex items-center justify-between w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
          >
            <span className="font-medium text-foreground">{allLabel}</span>
            {allSelected && <Check size={12} strokeWidth={2.5} className="text-foreground shrink-0" />}
          </button>
          <div className="h-px bg-border my-1 mx-1" />
          {agents.map(a => {
            const checked = selectedIds.includes(a.id)
            return (
              <button
                key={a.id}
                onClick={() => toggle(a.id)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
              >
                <span className={cn('text-foreground', checked && 'font-medium')}>
                  {a.name}{a.isMe && <span className="text-muted-foreground font-normal"> (me)</span>}
                </span>
                {checked && <Check size={12} strokeWidth={2.5} className="text-foreground shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
