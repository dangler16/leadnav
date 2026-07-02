'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ConfirmPage() {
  const router = useRouter()
  const supabase = createClient()

  const [status, setStatus] = useState<'verifying' | 'set-password' | 'error'>('verifying')
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    async function initializeSession() {
      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash')
      const type = params.get('type')
      const code = params.get('code')

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (!active) return
        if (exchangeError) {
          setError(exchangeError.message)
          setStatus('error')
          return
        }
        setStatus('set-password')
        return
      }

      if (tokenHash && (type === 'invite' || type === 'recovery')) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        })
        if (!active) return
        if (verifyError) {
          setError(verifyError.message)
          setStatus('error')
          return
        }
        setStatus('set-password')
        return
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!active) return

      if (session) {
        setStatus('set-password')
      } else {
        setError(sessionError?.message ?? 'Invalid, expired, or missing invite link.')
        setStatus('error')
      }
    }

    void initializeSession()
    return () => { active = false }
  }, [supabase.auth])

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    router.replace('/dashboard')
    router.refresh()
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
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <Button type="button" variant="outline" className="w-full" onClick={() => router.replace('/login')}>
                Return to sign in
              </Button>
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
                    minLength={8}
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
                    minLength={8}
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
