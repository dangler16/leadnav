'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export function ResetPassword({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'sent'>('idle')
  const supabase = createClient()

  async function sendReset() {
    setState('loading')
    await supabase.auth.resetPasswordForEmail(email)
    setState('sent')
  }

  if (state === 'sent') {
    return <p className="text-xs text-green-600 font-medium">Reset email sent!</p>
  }

  return (
    <Button variant="outline" size="sm" onClick={sendReset} disabled={state === 'loading'}>
      {state === 'loading' ? '…' : 'Reset Password'}
    </Button>
  )
}
