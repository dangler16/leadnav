'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, Check } from 'lucide-react'
import { badgeShape } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const statusConfig = {
  active:   { label: 'active',   className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800', dotClass: 'bg-green-500' },
  inactive: { label: 'inactive', className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',       dotClass: 'bg-gray-400 dark:bg-gray-500' },
}

export function VendorStatusSelect({ vendorId, initialIsActive }: { vendorId: string; initialIsActive: boolean }) {
  const [isActive, setIsActive] = useState(initialIsActive)
  const [open, setOpen] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { setIsActive(initialIsActive) }, [initialIsActive])
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
      const goUp = spaceBelow < 80 && rect.top > spaceBelow
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

  async function handleSelect(newIsActive: boolean) {
    setOpen(false)
    if (newIsActive === isActive) return
    const previous = isActive
    setSaving(true)
    setIsActive(newIsActive)
    const { error } = await supabase.from('vendors').update({ is_active: newIsActive }).eq('id', vendorId)
    if (error) setIsActive(previous)
    setSaving(false)
    if (!error) router.refresh()
  }

  const current = isActive ? statusConfig.active : statusConfig.inactive
  const options: [boolean, (typeof statusConfig)[keyof typeof statusConfig]][] = [
    [true, statusConfig.active],
    [false, statusConfig.inactive],
  ]

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        onClick={handleToggle}
        disabled={saving}
        className={cn(badgeShape, 'justify-between gap-1.5 cursor-pointer border outline-none disabled:opacity-50 transition-colors', current.className, open && 'ring-1 ring-gray-900')}
      >
        <span className="flex items-center gap-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', current.dotClass)} />
          <span className="whitespace-nowrap">{current.label}</span>
        </span>
        <ChevronDown size={13} className={cn('opacity-60 dropdown-chevron', open && 'open')} />
      </button>

      {rendered && (
        <div
          className={cn('z-50 bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden dropdown-panel', openUpward && 'opens-up', open && 'open')}
          style={dropdownStyle}
        >
          {options.map(([value, cfg]) => (
            <button
              key={String(value)}
              onClick={() => handleSelect(value)}
              className="w-full flex items-center gap-1.5 p-2 text-xs text-left hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dotClass)} />
              <span className="flex-1 text-gray-900">{cfg.label}</span>
              {value === isActive && <Check size={13} className="text-gray-900 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
