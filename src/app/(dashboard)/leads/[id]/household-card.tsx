'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lead } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SelectDropdown } from '@/components/ui/select-dropdown'
import { DollarSign, Check } from 'lucide-react'

const LEAD_TYPE_OPTIONS = [
  { value: 'ACA', label: 'ACA' },
  { value: 'Medicare', label: 'Medicare' },
]

function formatCurrency(raw: string): string {
  if (!raw) return '$'
  const n = parseInt(raw)
  return isNaN(n) ? '$' : '$' + n.toLocaleString('en-US')
}

type Fields = {
  lead_type: string
  household: string
  income: string
  birthday: string
}

function initFields(lead: Lead): Fields {
  return {
    lead_type: lead.lead_type ?? '',
    household: lead.household?.toString() ?? '',
    income: lead.income?.toString() ?? '',
    birthday: lead.birthday ?? '',
  }
}

export function HouseholdCard({ lead }: { lead: Lead }) {
  const router = useRouter()
  const supabase = createClient()
  const incomeRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [vals, setVals] = useState<Fields>(() => initFields(lead))
  const [savedVals, setSavedVals] = useState<Fields>(() => initFields(lead))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isDirty = (Object.keys(vals) as (keyof Fields)[]).some(k => vals[k] !== savedVals[k])

  function flashSaved() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaved(true)
    saveTimer.current = setTimeout(() => setSaved(false), 2000)
  }

  function handleChange(field: keyof Fields) {
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

  function handleLeadTypeChange(value: string) {
    setVals(v => ({ ...v, lead_type: value }))
  }

  async function handleSave() {
    if (!isDirty || saving) return
    setSaving(true)
    await supabase.from('leads').update({
      lead_type: vals.lead_type || null,
      household: vals.household ? parseInt(vals.household) : null,
      income: vals.income ? parseInt(vals.income) : null,
      birthday: vals.birthday || null,
      updated_at: new Date().toISOString(),
    }).eq('id', lead.id)
    setSavedVals({ ...vals })
    flashSaved()
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 pb-4 mb-4 border-b border-gray-200 shrink-0">
        <DollarSign className="w-4 h-4 text-gray-500" />
        <p className="text-xs font-semibold text-gray-900">Household Details</p>
      </div>

      <div className="space-y-4 flex-1">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Lead Type</p>
            <SelectDropdown
              options={LEAD_TYPE_OPTIONS}
              value={vals.lead_type}
              onChange={handleLeadTypeChange}
              placeholder="Select…"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Birthday</p>
            <Input
              value={vals.birthday}
              onChange={handleChange('birthday')}
              type="date"
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Household Size</p>
            <Input
              value={vals.household}
              onChange={handleChange('household')}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Annual Income</p>
            <Input
              ref={incomeRef}
              value={formatCurrency(vals.income)}
              onChange={handleIncomeChange}
              inputMode="numeric"
              className="h-8 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-end gap-2 pt-4 mt-4 border-t border-gray-200">
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-gray-500 mr-auto">
            <Check size={11} strokeWidth={2.5} /> Saved
          </span>
        )}
        <Button onClick={handleSave} disabled={!isDirty || saving} variant="outline" size="sm">
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
