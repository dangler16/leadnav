'use client'

import React, { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Check } from 'lucide-react'
import { Team } from '@/lib/types'
import { setUserTeam } from './actions'
import { badgeShape } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const TRANSITION = 'background-color 200ms, color 200ms, border-color 200ms'

export function UserTeamSelect({
  userId,
  initialTeamId,
  teams,
}: {
  userId: string
  initialTeamId: string | null
  teams: Team[]
}) {
  const [teamId, setTeamId] = useState(initialTeamId ?? '')
  const [open, setOpen] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()

  useEffect(() => { setTeamId(initialTeamId ?? '') }, [initialTeamId])
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
      const dropdownHeight = (teams.length + 1) * 36
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

  function handleSelect(newTeamId: string) {
    setOpen(false)
    if (newTeamId === teamId) return
    setTeamId(newTeamId)
    startTransition(async () => {
      await setUserTeam(userId, newTeamId || null)
      router.refresh()
    })
  }

  const selectedTeam = teams.find(t => t.id === teamId)
  const hasTeam = !!selectedTeam

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        onClick={handleToggle}
        disabled={isPending}
        style={{
          backgroundColor: hasTeam ? '#dbeafe' : '#f3f4f6',
          color: hasTeam ? '#1d4ed8' : '#9ca3af',
          borderColor: open ? '#f87171' : hasTeam ? '#bfdbfe' : '#e5e7eb',
          transition: TRANSITION,
        }}
        className={`${badgeShape} justify-between gap-1.5 cursor-pointer border outline-none disabled:opacity-50`}
      >
        <span className="whitespace-nowrap">{selectedTeam?.name ?? 'No team'}</span>
        <ChevronDown size={13} className={cn('opacity-60 dropdown-chevron', open && 'open')} />
      </button>

      {rendered && (
        <div
          className={cn('z-50 bg-card border border-border rounded-3xl shadow-lg overflow-hidden dropdown-panel', openUpward && 'opens-up', open && 'open')}
          style={dropdownStyle}
        >
          <button
            onClick={() => handleSelect('')}
            className="w-full flex items-center gap-1.5 p-2 text-xs text-left hover:bg-muted transition-colors cursor-pointer"
          >
            <span className="flex-1 text-muted-foreground">No team</span>
            {!teamId && <Check size={13} className="text-red-600 shrink-0" />}
          </button>
          {teams.map(t => (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className="w-full flex items-center gap-1.5 p-2 text-xs text-left hover:bg-muted transition-colors cursor-pointer"
            >
              <span className="flex-1 text-foreground">{t.name}</span>
              {t.id === teamId && <Check size={13} className="text-red-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
