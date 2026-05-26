'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SelectOption = { value: string; label: string }

type Props = {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  name?: string
  disabled?: boolean
  className?: string
  buttonClassName?: string
}

export function SelectDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  name,
  disabled,
  className,
  buttonClassName,
}: Props) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleToggle() {
    if (disabled) return
    if (!open) {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        setOpenUpward(spaceBelow < 240 && rect.top > spaceBelow)
      }
      requestAnimationFrame(() => setOpen(true))
    } else {
      setOpen(false)
    }
  }

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className={cn('relative', className)}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={cn(
          'flex h-8 w-full items-center justify-between cursor-pointer gap-1.5 text-xs border rounded-md pl-2 pr-1.5 disabled:opacity-50 disabled:cursor-not-allowed outline-none bg-card text-foreground transition-colors hover:border-border/80',
          open ? 'border-ring ring-2 ring-ring' : 'border-border',
          buttonClassName,
        )}
      >
        <span className={cn('whitespace-nowrap truncate', !selected && 'text-muted-foreground')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={13}
          className={cn('opacity-60 shrink-0 dropdown-chevron', open && 'open')}
        />
      </button>

      <div
        className={cn(
          'absolute z-50 left-0 min-w-full max-h-60 overflow-y-auto bg-card border border-border rounded-md shadow-sm dropdown-panel',
          open && 'open',
          openUpward ? 'bottom-full mb-0.5 opens-up' : 'top-full mt-0.5',
        )}
      >
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => { onChange(opt.value); setOpen(false) }}
            className="w-full flex items-center gap-2 pl-2.5 pr-1.5 py-2 text-xs text-left hover:bg-muted transition-colors cursor-pointer"
          >
            <span className="flex-1 text-foreground">{opt.label}</span>
            {opt.value === value && <Check size={13} className="text-foreground shrink-0" />}
          </button>
        ))}
      </div>
    </div>
  )
}
