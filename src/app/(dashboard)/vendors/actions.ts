'use server'

import { createClient } from '@/lib/supabase/server'
import { createHash, randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') throw new Error('Unauthorized')
  return supabase
}

export async function generateApiKey(vendor_id: string): Promise<string> {
  const supabase = await requireAdmin()

  const rawKey = 'lnk_' + randomBytes(24).toString('hex')
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.slice(0, 12)

  const { error } = await supabase
    .from('vendor_api_keys')
    .insert({ vendor_id, key_hash: keyHash, key_prefix: keyPrefix })

  if (error) throw new Error('Failed to generate key')

  revalidatePath('/vendors')
  return rawKey
}

export async function revokeApiKey(id: string): Promise<void> {
  const supabase = await requireAdmin()
  await supabase.from('vendor_api_keys').update({ is_active: false }).eq('id', id)
  revalidatePath('/vendors')
}
