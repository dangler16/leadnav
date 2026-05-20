'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function uploadProfilePicture(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const file = formData.get('file') as File
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Image must be JPEG, PNG, or WebP.')

  const ext = file.name.split('.').pop()
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`

  const service = createServiceClient()
  const { error } = await service.storage.from('profile-pictures').upload(path, file, { contentType: file.type })
  if (error) throw new Error('Failed to upload image. Please try again.')

  const { data } = service.storage.from('profile-pictures').getPublicUrl(path)
  await service.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id)

  revalidatePath('/profile')
  revalidatePath('/users')
}
