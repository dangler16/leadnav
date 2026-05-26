'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, Check, X } from 'lucide-react'
import { badgeShape } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type TriggerStatus = 'active' | 'paused'

const triggerStyles: Record<TriggerStatus, { label: string; className: string; dotClass: string }> = {
  active: { label: 'active', className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800', dotClass: 'bg-green-500' },
  paused: { label: 'paused', className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800', dotClass: 'bg-yellow-500' },
}

export function OrderStatusSelect({ orderId, initialStatus }: { orderId: string; initialStatus: TriggerStatus }) {
  const [status, setStatus] = useState<TriggerStatus>(initialStatus)
  const [open, setOpen] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
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
      const dropdownHeight = 3 * 36
      const goUp = spaceBelow < dropdownHeight && rect.top > spaceBelow
      setOpenUpward(goUp)
      if (goUp) {
        setDropdownStyle({ position: 'fixed', bottom: window.innerHeight - rect.top + 2, left: rect.left, minWidth: rect.width })
      } else {
        setDropdownStyle({ position: 'fixed', top: rect.bottom + 2, left: rect.left, minWidth: rect.width })
      }
      setRendered(true)
      requestAnimationFrame(() => setOpen(true))
    } else {
      setOpen(false)
    }
  }

  async function handleSelect(newStatus: TriggerStatus | 'completed') {
    setOpen(false)
    if (newStatus === status) return
    const previous = status
    setSaving(true)
    if (newStatus !== 'completed') setStatus(newStatus)
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (error) setStatus(previous)
    setSaving(false)
    if (!error) router.refresh()
  }

  const current = triggerStyles[status]

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        onClick={handleToggle}
        disabled={saving}
        className={cn(badgeShape, 'justify-between gap-1.5 cursor-pointer border outline-none disabled:opacity-50 transition-colors', current.className, open && 'ring-1 ring-border')}
      >
        <span className="flex items-center gap-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', current.dotClass)} />
          <span className="whitespace-nowrap">{current.label}</span>
        </span>
        <ChevronDown size={13} className={cn('opacity-60 dropdown-chevron', open && 'open')} />
      </button>

      {rendered && (
        <div
          className={cn('z-50 bg-card border border-border rounded shadow-sm overflow-hidden dropdown-panel', openUpward && 'opens-up', open && 'open')}
          style={dropdownStyle}
        >
          {(Object.entries(triggerStyles) as [TriggerStatus, typeof triggerStyles[TriggerStatus]][]).map(([value, cfg]) => (
            <button
              key={value}
              onClick={() => handleSelect(value)}
              className="w-full flex items-center gap-1.5 p-2 text-xs text-left hover:bg-muted transition-colors cursor-pointer"
            >
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dotClass)} />
              <span className="flex-1 text-foreground">{cfg.label}</span>
              {value === status && <Check size={13} className="text-foreground shrink-0" />}
  </button>
          ))}
          <div className="border-t border-border" />
          <button
            onClick={() => { setOpen(false); setConfirmOpen(true) }}
            className="w-full flex items-center gap-1.5 p-2 text-xs text-left hover:bg-muted text-red-600 transition-colors cursor-pointer"
          >
            <X size={13} className="shrink-0" />
            <span className="flex-1">close order</span>
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
