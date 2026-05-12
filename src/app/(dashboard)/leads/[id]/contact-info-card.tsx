'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lead, Profile } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { ReassignLead } from './reassign-lead'
import { User, Store } from 'lucide-react'

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

type Props = {
  lead: Lead
  vendorName: string | null
  isAdmin: boolean
  agents: Profile[]
  assignedName: string | null
}

type Fields = {
  firstname: string
  lastname: string
  phone: string
  email: string
  state: string
  zip: string
}

function formatPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length < 4) return d
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

export function ContactInfoCard({ lead, vendorName, isAdmin, agents, assignedName }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const phoneRef = useRef<HTMLInputElement>(null)

  const [vals, setVals] = useState<Fields>({
    firstname: lead.firstname ?? '',
    lastname: lead.lastname ?? '',
    phone: lead.phone ?? '',
    email: lead.email ?? '',
    state: lead.state ?? '',
    zip: lead.zip ?? '',
  })

  function handleChange(field: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setVals(v => ({ ...v, [field]: e.target.value }))
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selStart = e.target.selectionStart ?? 0
    const digitsBeforeCursor = e.target.value.slice(0, selStart).replace(/\D/g, '').length
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setVals(v => ({ ...v, phone: digits }))
    const newFormatted = formatPhoneDisplay(digits)
    requestAnimationFrame(() => {
      if (!phoneRef.current) return
      let digitCount = 0
      let newCursor = newFormatted.length
      for (let i = 0; i < newFormatted.length; i++) {
        if (/\d/.test(newFormatted[i])) {
          digitCount++
          if (digitCount === digitsBeforeCursor) { newCursor = i + 1; break }
        }
      }
      phoneRef.current.setSelectionRange(newCursor, newCursor)
    })
  }

  async function handleBlur(field: keyof Fields) {
    await supabase.from('leads').update({
      [field]: vals[field] || null,
      updated_at: new Date().toISOString(),
    }).eq('id', lead.id)
    router.refresh()
  }

  async function handleStateChange(value: string) {
    setVals(v => ({ ...v, state: value }))
    await supabase.from('leads').update({
      state: value || null,
      updated_at: new Date().toISOString(),
    }).eq('id', lead.id)
    router.refresh()
  }

  function fieldProps(field: keyof Fields, extra?: React.InputHTMLAttributes<HTMLInputElement>) {
    return {
      value: vals[field],
      onChange: handleChange(field),
      onBlur: () => handleBlur(field),
      className: 'h-8 text-sm',
      ...extra,
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-sm bg-red-50 flex items-center justify-center text-red-600">
          <User size={18} />
        </div>
        <p className="font-semibold text-base text-gray-800">Contact Info</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <p className="text-xs text-gray-400 mb-1.5">First Name</p>
            <Input {...fieldProps('firstname')} />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Last Name</p>
            <Input {...fieldProps('lastname')} />
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1.5">Phone</p>
            <Input
              ref={phoneRef}
              value={formatPhoneDisplay(vals.phone)}
              onChange={handlePhoneChange}
              onBlur={() => handleBlur('phone')}
              className="h-8 text-sm"
              inputMode="numeric"
            />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1.5">Email</p>
            <Input {...fieldProps('email', { type: 'email' })} />
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1.5">State</p>
            <SelectDropdown
              options={US_STATES}
              value={vals.state}
              onChange={handleStateChange}
              placeholder="State"
            />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1.5">ZIP Code</p>
            <Input {...fieldProps('zip', { placeholder: 'Zip' })} />
          </div>
        </div>

        {vendorName && (
          <div>
            <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-0.5">
              Vendor
            </p>
            <p className="text-sm text-gray-800 font-medium">{vendorName}</p>
          </div>
        )}

        {isAdmin && (
          <div className="flex items-start gap-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-1">Assigned To</p>
              <ReassignLead leadId={lead.id} currentAgentId={lead.assigned_to} agents={agents} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
