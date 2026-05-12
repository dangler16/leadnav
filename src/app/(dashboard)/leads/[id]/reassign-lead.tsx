'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { SelectDropdown } from '@/components/ui/select-dropdown'
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
        <SelectDropdown
          options={[
            { value: '', label: 'Unassigned' },
            ...agents.map(a => ({ value: a.id, label: [a.first_name, a.last_name].filter(Boolean).join(' ') })),
          ]}
          value={agentId}
          onChange={setAgentId}
          className="w-full"
        />
        <Button
          onClick={handleSave}
          disabled={loading || agentId === (currentAgentId ?? '')}
          className="px-2 py-1 text-sm font-medium whitespace-nowrap"
        >
          {loading ? 'Saving…' : 'Reassign'}
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
