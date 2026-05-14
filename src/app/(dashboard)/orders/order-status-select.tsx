'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, Check, X } from 'lucide-react'
import { badgeShape } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type TriggerStatus = 'active' | 'paused'

type StatusStyle = { label: string; dotColor: string; bg: string; color: string; borderColor: string }

const triggerStyles: Record<TriggerStatus, StatusStyle> = {
  active: { label: 'Active',  dotColor: '#22c55e', bg: '#dcfce7', color: '#15803d', borderColor: '#bbf7d0' },
  paused: { label: 'Paused',  dotColor: '#eab308', bg: '#fef9c3', color: '#a16207', borderColor: '#fef08a' },
}

const dropdownOptions: [TriggerStatus, StatusStyle][] = [
  ['active', triggerStyles.active],
  ['paused', triggerStyles.paused],
]

const TRANSITION = 'background-color 200ms, color 200ms, border-color 200ms'

export function OrderStatusSelect({ orderId, initialStatus }: { orderId: string; initialStatus: TriggerStatus }) {
  const [status, setStatus] = useState<TriggerStatus>(initialStatus)
  const [open, setOpen] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { setStatus(initialStatus) }, [initialStatus])
  useEffect(() => { if (open) setRendered(true) }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleToggle() {
    if (saving) return
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropdownHeight = dropdownOptions.length * 36
      if (spaceBelow < dropdownHeight && rect.top > spaceBelow) {
        setDropdownStyle({ position: 'fixed', bottom: window.innerHeight - rect.top + 2, left: rect.left, minWidth: rect.width })
      } else {
        setDropdownStyle({ position: 'fixed', top: rect.bottom + 2, left: rect.left, minWidth: rect.width })
      }
    }
    setOpen(v => !v)
  }

  async function handleSelect(newStatus: TriggerStatus | 'completed') {
    setOpen(false)
    if (newStatus === status) return
    setSaving(true)
    if (newStatus !== 'completed') setStatus(newStatus)
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    setSaving(false)
    router.refresh()
  }

  const current = triggerStyles[status]

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
        <ChevronDown size={13} className={`opacity-60 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {rendered && (
        <div
          data-closed={!open ? '' : undefined}
          onAnimationEnd={(e) => { if (e.currentTarget === e.target && !open) setRendered(false) }}
          className="z-50 bg-white border border-gray-200 rounded-3xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100"
          style={dropdownStyle}
        >
          {dropdownOptions.map(([value, cfg]) => (
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
          <div className="border-t border-gray-100" />
          <button
            onClick={() => { setOpen(false); setConfirmOpen(true) }}
            className="w-full flex items-center gap-1.5 p-2 text-xs text-left hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
          >
            <X size={13} className="shrink-0" />
            <span className="flex-1">Close Order</span>
          </button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Close this order?</DialogTitle>
            <DialogDescription>
              This will stop all lead delivery and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() => { setConfirmOpen(false); handleSelect('completed') }}
            >
              Close order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
