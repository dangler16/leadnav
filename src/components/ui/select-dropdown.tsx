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
  const [rendered, setRendered] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { if (open) setRendered(true) }, [open])

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
    if (disabled) return
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      setOpenUpward(spaceBelow < 240 && spaceAbove > spaceBelow)
    }
    setOpen(v => !v)
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
          'flex h-8 w-full items-center justify-between cursor-pointer gap-1.5 text-xs border rounded-md pl-2 pr-1.5 disabled:opacity-50 disabled:cursor-not-allowed outline-none bg-white text-gray-900 transition-colors hover:border-gray-400',
          open ? 'border-gray-900 ring-2 ring-gray-900' : 'border-gray-200',
          buttonClassName,
        )}
      >
        <span className={cn('whitespace-nowrap truncate', !selected && 'text-gray-400')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={13}
          className={cn('opacity-60 shrink-0 transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {rendered && (
        <div
          data-closed={!open ? '' : undefined}
          onAnimationEnd={(e) => { if (e.currentTarget === e.target && !open) setRendered(false) }}
          className={cn(
            'absolute z-50 left-0 min-w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-sm animate-in fade-in zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100',
            openUpward ? 'bottom-full mb-0.5' : 'top-full mt-0.5',
          )}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className="w-full flex items-center gap-2 pl-2.5 pr-1.5 py-2 text-xs text-left hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <span className="flex-1 text-gray-900">{opt.label}</span>
              {opt.value === value && <Check size={13} className="text-gray-900 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
