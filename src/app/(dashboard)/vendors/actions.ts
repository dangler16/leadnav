'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createHash, randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') throw new Error('Unauthorized')
  return supabase
}

async function requireAdminService() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') throw new Error('Unauthorized')
  return createServiceClient()
}

const ALLOWED_LOGO_TYPES = ['image/png', 'image/webp', 'image/svg+xml']

export async function uploadVendorLogo(formData: FormData): Promise<string> {
  const service = await requireAdminService()
  const file = formData.get('file') as File
  if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
    throw new Error('Logo must be a PNG, WebP, or SVG.')
  }
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await service.storage.from('vendor-logos').upload(path, file, { contentType: file.type })
  if (error) throw new Error('Failed to upload logo. Please try again.')
  const { data } = service.storage.from('vendor-logos').getPublicUrl(path)
  return data.publicUrl
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
  const { error } = await supabase.from('vendor_api_keys').update({ is_active: false }).eq('id', id)
  if (error) throw new Error('Failed to revoke key')
  revalidatePath('/vendors')
}

export async function deleteVendor(id: string): Promise<void> {
  const supabase = await requireAdmin()
  const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('vendor_id', id)
  if (count && count > 0) throw new Error(`This vendor has ${count} order${count === 1 ? '' : 's'} and cannot be deleted.`)
  const { error } = await supabase.from('vendors').delete().eq('id', id)
  if (error) throw new Error('Failed to delete vendor.')
  revalidatePath('/vendors')
}
