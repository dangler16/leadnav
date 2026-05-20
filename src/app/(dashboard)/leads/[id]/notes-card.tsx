'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lead } from '@/lib/types'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { FileText, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type NoteEntry = { id: string; text: string; created_at: string }

function parseNotes(raw: string | null): NoteEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  // legacy plain-text: treat entire string as one note
  return [{ id: 'legacy', text: raw, created_at: '' }]
}

function formatDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function NotesCard({ lead, className }: { lead: Lead; className?: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [notes, setNotes] = useState<NoteEntry[]>(() => parseNotes(lead.notes))
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  async function persist(updated: NoteEntry[]) {
    await supabase
      .from('leads')
      .update({ notes: JSON.stringify(updated), updated_at: new Date().toISOString() })
      .eq('id', lead.id)
    router.refresh()
  }

  async function handleAdd() {
    if (!newNote.trim()) return
    setSaving(true)
    const entry: NoteEntry = {
      id: crypto.randomUUID(),
      text: newNote.trim(),
      created_at: new Date().toISOString(),
    }
    const updated = [...notes, entry]
    setNotes(updated)
    await persist(updated)
    setNewNote('')
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    await persist(updated)
  }

  function startEdit(note: NoteEntry) {
    setEditingId(note.id)
    setEditText(note.text)
  }

  async function handleEditSave(id: string) {
    if (!editText.trim()) return
    const updated = notes.map(n => (n.id === id ? { ...n, text: editText.trim() } : n))
    setNotes(updated)
    await persist(updated)
    setEditingId(null)
  }

  function handleNewNoteKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleAdd()
    }
  }

  function handleEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, id: string) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleEditSave(id)
    }
    if (e.key === 'Escape') {
      setEditingId(null)
    }
  }

  return (
    <div className={cn('bg-white border border-gray-200 rounded-lg p-5 flex flex-col', className)}>
      <div className="flex items-center gap-2 pb-4 mb-4 border-b border-gray-200 shrink-0">
        <FileText className="w-4 h-4 text-gray-500" />
        <p className="text-xs font-semibold text-gray-900">Notes</p>
      </div>

      {/* Existing notes */}
      <div className="flex-1 min-h-0 overflow-y-auto mb-3 space-y-2">
        {notes.length > 0 ? (
          notes.map(note => (
            <div key={note.id} className="group relative rounded-md border border-gray-100 bg-gray-50 px-3 py-2.5">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => handleEditKeyDown(e, note.id)}
                    rows={3}
                    className="resize-none"
                    autoFocus
                  />
                  <div className="flex gap-1.5 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditSave(note.id)}>
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">{note.text}</p>
                  {note.created_at && (
                    <p className="text-[10px] text-gray-400 mt-1">{formatDate(note.created_at)}</p>
                  )}
                  <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                    <button
                      onClick={() => startEdit(note)}
                      className="p-0.5 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-400 py-2">No notes yet.</p>
        )}
      </div>

      {/* Add note */}
      <div className="shrink-0 space-y-2 pt-4 border-t border-gray-200">
        <Textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          onKeyDown={handleNewNoteKeyDown}
          placeholder="Add a note…"
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleAdd}
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
