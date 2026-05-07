'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CheckCheck } from 'lucide-react'

export function MarkAllRead({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function markAll() {
    setLoading(true)
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setLoading(false)
    router.refresh()
  }

  return (
    <Button variant="outline" size="sm" onClick={markAll} disabled={loading} className="flex items-center gap-1.5">
      <CheckCheck size={14} />
      {loading ? '…' : 'Mark all read'}
    </Button>
  )
}
