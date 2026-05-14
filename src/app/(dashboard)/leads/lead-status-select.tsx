'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LeadStatus } from '@/lib/types'
import { ChevronDown, Check } from 'lucide-react'
import { badgeShape } from '@/components/ui/badge'

const statusConfig: Record<LeadStatus, { label: string; dotColor: string; bg: string; color: string; borderColor: string }> = {
  new:               { label: 'New',           dotColor: '#3b82f6', bg: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' },
  not_contacted:     { label: 'Not Contacted', dotColor: '#9ca3af', bg: '#f3f4f6', color: '#4b5563', borderColor: '#e5e7eb' },
  contacted:         { label: 'Contacted',     dotColor: '#06b6d4', bg: '#cffafe', color: '#0e7490', borderColor: '#a5f3fc' },
  appt_set:          { label: 'Appt Set',      dotColor: '#6366f1', bg: '#e0e7ff', color: '#4338ca', borderColor: '#c7d2fe' },
  appt_no_show:      { label: 'No Show',       dotColor: '#eab308', bg: '#fef9c3', color: '#a16207', borderColor: '#fef08a' },
  appt_no_sale:      { label: 'No Sale',       dotColor: '#f97316', bg: '#ffedd5', color: '#c2410c', borderColor: '#fed7aa' },
  appt_rescheduled:  { label: 'Rescheduled',   dotColor: '#a855f7', bg: '#f3e8ff', color: '#7e22ce', borderColor: '#e9d5ff' },
  sale:              { label: 'Sale',          dotColor: '#22c55e', bg: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' },
  lost:              { label: 'Lost',          dotColor: '#ef4444', bg: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' },
}

const TRANSITION = 'background-color 200ms, color 200ms, border-color 200ms'

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
        style={{
          backgroundColor: current.bg,
          color: current.color,
          borderColor: open ? '#f87171' : current.borderColor,
          transition: TRANSITION,
        }}
        className={`${badgeShape} justify-between gap-1.5 cursor-pointer border outline-none disabled:opacity-50`}
      >
        <span className="flex items-center gap-1.5">
          <span
            style={{ backgroundColor: current.dotColor, transition: 'background-color 200ms' }}
            className="w-1.5 h-1.5 rounded-full shrink-0"
          />
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
          className="z-50 bg-white border border-gray-200 rounded-3xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100"
          style={dropdownStyle}
        >
          {(Object.entries(statusConfig) as [LeadStatus, typeof statusConfig[LeadStatus]][]).map(([value, cfg]) => (
            <button
              key={value}
              onClick={() => handleSelect(value)}
              className="w-full flex items-center gap-1.5 p-2 text-xs text-left hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dotColor }} />
              <span className="flex-1 text-gray-800">{cfg.label}</span>
              {value === status && <Check size={13} className="text-red-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
