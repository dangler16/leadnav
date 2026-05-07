'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'

export function AdminActions({ profile }: { profile: Profile }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function toggleRole() {
    setLoading(true)
    const newRole = profile.role === 'admin' ? 'agent' : 'admin'
    await supabase.from('profiles').update({ role: newRole }).eq('id', profile.id)
    setLoading(false)
    router.refresh()
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={toggleRole}
      disabled={loading}
      className="text-xs"
    >
      {loading ? '…' : profile.role === 'admin' ? 'Make Agent' : 'Make Admin'}
    </Button>
  )
}
