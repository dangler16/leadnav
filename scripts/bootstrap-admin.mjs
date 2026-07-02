import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminEmail = process.env.SUPABASE_ADMIN_EMAIL?.trim().toLowerCase()

if (!supabaseUrl || !serviceRoleKey || !adminEmail) {
  console.error('NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ADMIN_EMAIL are required.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let matchingUser = null
let page = 1

while (!matchingUser) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
  if (error) throw error

  matchingUser = data.users.find(user => user.email?.toLowerCase() === adminEmail) ?? null
  if (matchingUser || data.users.length < 1000) break
  page += 1
}

if (!matchingUser) {
  console.error(`No Supabase Auth user exists for ${adminEmail}. Create or invite that user first.`)
  process.exit(1)
}

const { data: existingProfile, error: profileReadError } = await supabase
  .from('profiles')
  .select('first_name, last_name')
  .eq('id', matchingUser.id)
  .maybeSingle()

if (profileReadError) throw profileReadError

const metadata = matchingUser.user_metadata ?? {}
const firstName = existingProfile?.first_name || String(metadata.first_name ?? '')
const lastName = existingProfile?.last_name || String(metadata.last_name ?? '')

const { error: profileWriteError } = await supabase
  .from('profiles')
  .upsert({
    id: matchingUser.id,
    first_name: firstName,
    last_name: lastName,
    role: 'super_admin',
  }, { onConflict: 'id' })

if (profileWriteError) throw profileWriteError

console.log(`Promoted ${adminEmail} to LeadNav super administrator.`)
