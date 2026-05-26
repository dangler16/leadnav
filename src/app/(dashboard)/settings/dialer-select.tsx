'use client'

import { useState } from 'react'
import { Phone } from 'lucide-react'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { updateDialerPreference } from './actions'
import { DIALER_OPTIONS, DialerPreference } from '@/lib/dialer'

export function DialerSelect({ initialPreference }: { initialPreference: string }) {
  const [value, setValue] = useState<DialerPreference>(
    (initialPreference as DialerPreference) ?? 'default'
  )

  async function handleChange(newValue: string) {
    setValue(newValue as DialerPreference)
    await updateDialerPreference(newValue)
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-foreground">Dialer App</p>
        <p className="text-xs text-muted-foreground mt-0.5">Choose which app handles outbound dials</p>
      </div>
      <div className="w-52">
        <SelectDropdown
          options={DIALER_OPTIONS}
          value={value}
          onChange={handleChange}
          placeholder="Select dialer…"
        />
      </div>
    </div>
  )
}
