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
        className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal size={13} strokeWidth={2} />
      </button>

      <div className={cn('absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded shadow-sm z-50 py-1 overflow-hidden dropdown-panel', open && 'open')}>
          <Link
            href={`/leads/${leadId}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Phone size={11} strokeWidth={2} className="text-gray-400" />
            Call
          </Link>
          <Link
            href={`/leads/${leadId}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Eye size={11} strokeWidth={2} className="text-gray-400" />
            View
          </Link>
          <Link
            href={`/leads/${leadId}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <AlertCircle size={11} strokeWidth={2} className="text-gray-400" />
            Dispute
          </Link>
        </div>
    </div>
  )
}
