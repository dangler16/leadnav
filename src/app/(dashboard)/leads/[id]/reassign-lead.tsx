'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { reassignLead } from '../actions'

export function ReassignLead({ leadId, currentAgentId, agents }: {
  leadId: string
  currentAgentId: string | null
  agents: Profile[]
}) {
  const [agentId, setAgentId] = useState(currentAgentId ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSave() {
    setLoading(true)
    setError(null)
    try {
      await reassignLead(leadId, agentId)
      router.refresh()
    } catch {
      setError('Failed to reassign.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <select
          value={agentId}
          onChange={e => setAgentId(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-red-400 bg-white"
        >
          <option value="">Unassigned</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>
              {[a.first_name, a.last_name].filter(Boolean).join(' ')}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={loading || agentId === (currentAgentId ?? '')}
          className="text-xs"
        >
          {loading ? 'Saving…' : 'Reassign'}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
