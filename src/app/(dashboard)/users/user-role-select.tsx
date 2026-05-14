'use client'

import React, { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Check } from 'lucide-react'
import { UserRole } from '@/lib/types'
import { updateUserRole } from './actions'
import { badgeShape } from '@/components/ui/badge'

type RoleStyle = { label: string; dotColor: string; bg: string; color: string; borderColor: string }

const roleConfig: Record<UserRole, RoleStyle> = {
  super_admin: { label: 'Super Admin', dotColor: '#ef4444', bg: '#fee2e2', color: '#b91c1c', borderColor: '#fecaca' },
  team_admin:  { label: 'Team Admin',  dotColor: '#a855f7', bg: '#f3e8ff', color: '#7e22ce', borderColor: '#e9d5ff' },
  user:        { label: 'User',        dotColor: '#9ca3af', bg: '#f3f4f6', color: '#4b5563', borderColor: '#e5e7eb' },
}

const TRANSITION = 'background-color 200ms, color 200ms, border-color 200ms'
const ROLES: UserRole[] = ['user', 'team_admin', 'super_admin']

export function UserRoleSelect({ userId, initialRole }: { userId: string; initialRole: UserRole }) {
  const [role, setRole] = useState(initialRole)
  const [open, setOpen] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()

  useEffect(() => { setRole(initialRole) }, [initialRole])
  useEffect(() => { if (open) setRendered(true) }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleToggle() {
    if (isPending) return
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const dropdownHeight = ROLES.length * 36
      if (spaceBelow < dropdownHeight && rect.top > spaceBelow) {
        setDropdownStyle({ position: 'fixed', bottom: window.innerHeight - rect.top + 2, left: rect.left, minWidth: rect.width })
      } else {
        setDropdownStyle({ position: 'fixed', top: rect.bottom + 2, left: rect.left, minWidth: rect.width })
      }
    }
    setOpen(v => !v)
  }

  function handleSelect(newRole: UserRole) {
    setOpen(false)
    if (newRole === role) return
    setRole(newRole)
    startTransition(async () => {
      await updateUserRole(userId, newRole)
      router.refresh()
    })
  }

  const current = roleConfig[role]

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        onClick={handleToggle}
        disabled={isPending}
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
          className="z-50 bg-card border border-border rounded-3xl shadow-lg overflow-hidden animate-in fade-in zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-100"
          style={dropdownStyle}
        >
          {ROLES.map(value => {
            const cfg = roleConfig[value]
            return (
              <button
                key={value}
                onClick={() => handleSelect(value)}
                className="w-full flex items-center gap-1.5 p-2 text-xs text-left hover:bg-muted transition-colors cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dotColor }} />
                <span className="flex-1 text-foreground">{cfg.label}</span>
                {value === role && <Check size={13} className="text-red-600 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
