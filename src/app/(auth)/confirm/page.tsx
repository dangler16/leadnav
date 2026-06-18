'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ConfirmPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const [status, setStatus] = useState<'verifying' | 'set-password' | 'error'>('verifying')
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type') as 'invite' | 'recovery' | null

    if (!tokenHash || !type) {
      setError('Invalid or missing invite link.')
      setStatus('error')
      return
    }

    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
      if (error) {
        setError(error.message)
        setStatus('error')
      } else {
        setStatus('set-password')
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSaving(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src="/leadnav-black-text.svg" alt="LeadNav" width="200" />
        </div>
        <div className="bg-card rounded-[10px] border border-border p-8 shadow-sm">
          {status === 'verifying' && (
            <p className="text-sm text-muted-foreground">Verifying your invite…</p>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-lg font-semibold text-foreground mb-2">Link invalid</h1>
              <p className="text-sm text-red-600">{error}</p>
            </>
          )}

          {status === 'set-password' && (
            <>
              <h1 className="text-lg font-semibold text-foreground mb-[20px]">Set your password</h1>
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    className="rounded-[5px]"
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    className="rounded-[5px]"
                    id="confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? 'Saving…' : 'Set password & sign in'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
