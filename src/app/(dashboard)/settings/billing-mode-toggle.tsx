'use client'

import { useState, useTransition } from 'react'
import { CreditCard, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TeamBillingMode } from '@/lib/types'
import { updateTeamBillingMode } from './actions'

const options: { value: TeamBillingMode; label: string; description: string; icon: React.ReactNode }[] = [
  {
    value: 'team_card',
    label: 'Team Card',
    description: 'All team members charge to one shared payment method',
    icon: <CreditCard size={14} />,
  },
  {
    value: 'individual',
    label: 'Individual',
    description: 'Each member uses their own payment method',
    icon: <User size={14} />,
  },
]

export function BillingModeToggle({ teamId, initialMode }: { teamId: string; initialMode: TeamBillingMode }) {
  const [mode, setMode] = useState<TeamBillingMode>(initialMode)
  const [isPending, startTransition] = useTransition()

  function handleSelect(value: TeamBillingMode) {
    if (value === mode || isPending) return
    setMode(value)
    startTransition(async () => {
      await updateTeamBillingMode(teamId, value)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => handleSelect(opt.value)}
          disabled={isPending}
          className={cn(
            'flex items-start gap-3 rounded border p-3 text-left transition-colors cursor-pointer disabled:opacity-60',
            mode === opt.value
              ? 'border-gray-900 bg-gray-50'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
          )}
        >
          <div className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
            mode === opt.value ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-400'
          )}>
            {opt.icon}
          </div>
          <div>
            <p className={cn('text-xs font-medium', mode === opt.value ? 'text-gray-900' : 'text-gray-600')}>{opt.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{opt.description}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
