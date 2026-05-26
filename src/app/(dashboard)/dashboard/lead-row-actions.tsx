'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Phone, Eye, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LeadRowActions({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  return (
    <div ref={ref} className="relative flex items-center justify-center">
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (open) setOpen(false); else requestAnimationFrame(() => setOpen(true)) }}
        className="p-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-colors"
      >
        <MoreHorizontal size={13} strokeWidth={2} />
      </button>

      <div className={cn('absolute right-0 top-full mt-1 w-32 bg-card border border-border rounded shadow-sm z-50 py-1 overflow-hidden dropdown-panel', open && 'open')}>
          <Link
            href={`/leads/${leadId}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
          >
            <Phone size={11} strokeWidth={2} className="text-muted-foreground" />
            Call
          </Link>
          <Link
            href={`/leads/${leadId}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
          >
            <Eye size={11} strokeWidth={2} className="text-muted-foreground" />
            View
          </Link>
          <Link
            href={`/leads/${leadId}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
          >
            <AlertCircle size={11} strokeWidth={2} className="text-muted-foreground" />
            Dispute
          </Link>
        </div>
    </div>
  )
}
