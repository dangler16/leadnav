'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const PRESET_AMOUNTS = [50, 100, 250, 500]

function formatAmount(digits: string): string {
  if (!digits) return '$'
  const n = parseInt(digits)
  return isNaN(n) ? '$' : '$' + n.toLocaleString('en-US')
}

export function AddFundsButton() {
  const [open, setOpen] = useState(false)
  const [digits, setDigits] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const amountDollars = parseInt(digits) || 0
  const canSubmit = amountDollars >= 1

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selStart = e.target.selectionStart ?? 0
    const digitsBeforeCursor = e.target.value.slice(0, selStart).replace(/\D/g, '').length
    const raw = e.target.value.replace(/\D/g, '')
    setDigits(raw)
    const newFormatted = formatAmount(raw)
    requestAnimationFrame(() => {
      if (!inputRef.current) return
      if (digitsBeforeCursor === 0) { inputRef.current.setSelectionRange(1, 1); return }
      let digitCount = 0
      let newCursor = newFormatted.length
      for (let i = 0; i < newFormatted.length; i++) {
        if (/\d/.test(newFormatted[i])) {
          digitCount++
          if (digitCount === digitsBeforeCursor) { newCursor = i + 1; break }
        }
      }
      inputRef.current.setSelectionRange(newCursor, newCursor)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_cents: amountDollars * 100 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) { setDigits(''); setError(null) }
  }

  return (
    <>
      <Button
        className="flex items-center px-3 py-1.5 rounded bg-gray-900 text-white text-xs font-medium whitespace-nowrap hover:bg-gray-800 transition-colors leading-none"
        onClick={() => setOpen(true)}
      >
        Add Funds
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Funds to Wallet</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                ref={inputRef}
                value={formatAmount(digits)}
                onChange={handleAmountChange}
                inputMode="numeric"
                placeholder="$0"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              {PRESET_AMOUNTS.map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setDigits(String(amt))}
                  className={`flex-1 text-xs py-1.5 rounded transition-colors font-medium ${
                    amountDollars === amt
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-accent dark:text-gray-900 dark:hover:bg-accent/80'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={loading || !canSubmit}>
                {loading ? 'Redirecting…' : `Add ${canSubmit ? `$${amountDollars.toLocaleString()}` : 'Funds'}`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
