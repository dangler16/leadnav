'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lead } from '@/lib/types'
import { Textarea } from '@/components/ui/textarea'
import { FileText } from 'lucide-react'

export function NotesCard({ lead }: { lead: Lead }) {
  const router = useRouter()
  const supabase = createClient()
  const [notes, setNotes] = useState(lead.notes ?? '')

  async function handleBlur() {
    const value = notes || null
    if (value === (lead.notes ?? null)) return
    await supabase.from('leads').update({ notes: value, updated_at: new Date().toISOString() }).eq('id', lead.id)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-sm bg-red-50 flex items-center justify-center text-red-600">
          <FileText size={18} />
        </div>
        <p className="font-semibold text-base text-gray-800">Notes</p>
      </div>
      <Textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={handleBlur}
        placeholder="Add notes about this lead…"
        rows={5}
        className="text-sm resize-none hover:border-red-600 focus:border-red-600"
      />
    </div>
  )
}
