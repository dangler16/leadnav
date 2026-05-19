'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lead } from '@/lib/types'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

function parseNoteLines(text: string): { key: string | null; value: string }[] {
  return text
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      const match = line.match(/^([^:]{1,40}):\s*(.+)$/)
      if (match) return { key: match[1].trim(), value: match[2].trim() }
      return { key: null, value: line.trim() }
    })
}

export function NotesCard({ lead, className }: { lead: Lead; className?: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)

  const parsedLines = lead.notes ? parseNoteLines(lead.notes) : []

  async function handleSave() {
    if (!newNote.trim()) return
    setSaving(true)
    const appended = [lead.notes, newNote.trim()].filter(Boolean).join('\n')
    await supabase.from('leads').update({ notes: appended, updated_at: new Date().toISOString() }).eq('id', lead.id)
    setNewNote('')
    setSaving(false)
    router.refresh()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg p-5 flex flex-col', className)}>
      <div className="flex items-center gap-2 pb-4 mb-4 border-b border-gray-200 shrink-0">
        <FileText className="w-4 h-4 text-gray-500" />
        <p className="text-xs font-semibold text-gray-900">Notes</p>
      </div>

      {/* Existing notes — two-column key/value grid */}
      <div className="flex-1 min-h-0 overflow-y-auto mb-3">
        {parsedLines.length > 0 ? (
          <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 py-1">
            {parsedLines.map((line, i) =>
              line.key !== null ? (
                <Fragment key={i}>
                  <span className="text-xs text-gray-400 whitespace-nowrap leading-5">{line.key}</span>
                  <span className="text-xs text-gray-700 leading-5 min-w-0 truncate">{line.value}</span>
                </Fragment>
              ) : (
                <span key={i} className="col-span-2 text-xs text-gray-600 leading-relaxed py-0.5 border-b border-gray-100 last:border-0">
                  {line.value}
                </span>
              )
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 py-2">No notes yet.</p>
        )}
      </div>

      {/* Add note */}
      <div className="shrink-0 space-y-2 pt-4 border-t border-gray-200">
        <Textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note…"
          rows={3}
          className="text-xs resize-none"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!newNote.trim() || saving}
            variant="outline"
            size="sm"
          >
            {saving ? 'Saving…' : 'Save Note'}
          </Button>
        </div>
      </div>
    </div>
  )
}
