'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LeadStatus } from '@/lib/types'
import { ChevronDown, Check } from 'lucide-react'
import { badgeShape } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig: Record<LeadStatus, { label: string; className: string; dotClass: string }> = {
  new:              { label: 'New',           className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',       dotClass: 'bg-blue-500' },
  not_contacted:    { label: 'Not Contacted', className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',       dotClass: 'bg-gray-400 dark:bg-gray-500' },
  contacted:        { label: 'Contacted',     className: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800',       dotClass: 'bg-cyan-500' },
  appt_set:         { label: 'Appt Set',      className: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800', dotClass: 'bg-indigo-500' },
  appt_no_show:     { label: 'No Show',       className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800', dotClass: 'bg-yellow-500' },
  appt_no_sale:     { label: 'No Sale',       className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800', dotClass: 'bg-orange-500' },
  appt_rescheduled: { label: 'Rescheduled',   className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800', dotClass: 'bg-purple-500' },
  sale:             { label: 'Sale',          className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', dotClass: 'bg-green-500' },
  lost:             { label: 'Lost',          className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',             dotClass: 'bg-red-500' },
}

export function LeadStatusSelect({ leadId, initialStatus }: { leadId: string; initialStatus: LeadStatus }) {
  const [status, setStatus] = useState(initialStatus)
  const [open, setOpen] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setStatus(initialStatus)
  }, [initialStatus])

  useEffect(() => {
    if (open) setRendered(true)
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleToggle() {
    if (saving) return
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropdownHeight = Object.keys(statusConfig).length * 36
      if (spaceBelow < dropdownHeight && rect.top > spaceBelow) {
        setDropdownStyle({ position: 'fixed', bottom: window.innerHeight - rect.top + 2, left: rect.left, minWidth: rect.width })
      } else {
        setDropdownStyle({ position: 'fixed', top: rect.bottom + 2, left: rect.left, minWidth: rect.width })
      }
    }
    setOpen(v => !v)
  }

  async function handleSelect(newStatus: LeadStatus) {
    setOpen(false)
    if (newStatus === status) return
    setSaving(true)
    setStatus(newStatus)
    await supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', leadId)
    setSaving(false)
    router.refresh()
  }

  const current = statusConfig[status]

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        onClick={handleToggle}
        disabled={saving}
        className={cn(badgeShape, 'justify-between gap-1.5 cursor-pointer border outline-none disabled:opacity-50 transition-colors', current.className, open && 'ring-1 ring-red-400')}
      >
        <span className="flex items-center gap-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', current.dotClass)} />
          <span className="whitespace-nowrap">{current.label}</span>
        </span>
        <ChevronDown
          size={13}
          className={`opacity-60 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {rendered && (
        <div
          data-closed={!open ? '' : undefined}
          onAnimationEnd={(e) => { if (e.currentTarget === e.target && !open) setRendered(false) }}
          className="z-50 bg-card border border-border rounded-3xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100"
          style={dropdownStyle}
        >
          {(Object.entries(statusConfig) as [LeadStatus, typeof statusConfig[LeadStatus]][]).map(([value, cfg]) => (
            <button
              key={value}
              onClick={() => handleSelect(value)}
              className="w-full flex items-center gap-1.5 p-2 text-xs text-left hover:bg-muted transition-colors cursor-pointer"
            >
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dotClass)} />
              <span className="flex-1 text-foreground">{cfg.label}</span>
              {value === status && <Check size={13} className="text-red-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
