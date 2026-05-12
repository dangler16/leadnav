'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lead } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { DollarSign } from 'lucide-react'

const LEAD_TYPE_OPTIONS = [
  { value: 'ACA', label: 'ACA' },
  { value: 'Medicare', label: 'Medicare' },
]

function formatCurrency(raw: string): string {
  if (!raw) return '$'
  const n = parseInt(raw)
  return isNaN(n) ? '$' : '$' + n.toLocaleString('en-US')
}

export function HouseholdCard({ lead }: { lead: Lead }) {
  const router = useRouter()
  const supabase = createClient()
  const incomeRef = useRef<HTMLInputElement>(null)

  const [vals, setVals] = useState({
    lead_type: lead.lead_type ?? '',
    household: lead.household?.toString() ?? '',
    income: lead.income?.toString() ?? '',
    birthday: lead.birthday ?? '',
  })

  function handleChange(field: keyof typeof vals) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setVals(v => ({ ...v, [field]: e.target.value }))
  }

  function handleIncomeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selStart = e.target.selectionStart ?? 0
    const digitsBeforeCursor = e.target.value.slice(0, selStart).replace(/\D/g, '').length
    const digits = e.target.value.replace(/\D/g, '')
    setVals(v => ({ ...v, income: digits }))
    const newFormatted = formatCurrency(digits)
    requestAnimationFrame(() => {
      if (!incomeRef.current) return
      if (digitsBeforeCursor === 0) {
        incomeRef.current.setSelectionRange(1, 1)
        return
      }
      let digitCount = 0
      let newCursor = newFormatted.length
      for (let i = 0; i < newFormatted.length; i++) {
        if (/\d/.test(newFormatted[i])) {
          digitCount++
          if (digitCount === digitsBeforeCursor) { newCursor = i + 1; break }
        }
      }
      incomeRef.current.setSelectionRange(newCursor, newCursor)
    })
  }

  async function handleBlur(field: keyof typeof vals) {
    const raw = vals[field]
    let value: string | number | null
    if (field === 'lead_type' || field === 'birthday') {
      value = raw || null
    } else {
      value = raw ? parseInt(raw) : null
    }
    await supabase.from('leads').update({
      [field]: value,
      updated_at: new Date().toISOString(),
    }).eq('id', lead.id)
    router.refresh()
  }

  async function handleLeadTypeChange(value: string) {
    setVals(v => ({ ...v, lead_type: value }))
    await supabase.from('leads').update({
      lead_type: value || null,
      updated_at: new Date().toISOString(),
    }).eq('id', lead.id)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-sm bg-red-50 flex items-center justify-center text-red-600">
          <DollarSign size={18} />
        </div>
        <p className="font-semibold text-base text-gray-800">Household Details</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Lead Type</p>
            <SelectDropdown
              options={LEAD_TYPE_OPTIONS}
              value={vals.lead_type}
              onChange={handleLeadTypeChange}
              placeholder="Select…"
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Birthday</p>
            <Input
              value={vals.birthday}
              onChange={handleChange('birthday')}
              onBlur={() => handleBlur('birthday')}
              type="date"
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Household Size</p>
            <Input
              value={vals.household}
              onChange={handleChange('household')}
              onBlur={() => handleBlur('household')}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Annual Income</p>
            <Input
              ref={incomeRef}
              value={formatCurrency(vals.income)}
              onChange={handleIncomeChange}
              onBlur={() => handleBlur('income')}
              inputMode="numeric"
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
