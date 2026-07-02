import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const requiredTables = [
  'profiles',
  'teams',
  'team_members',
  'team_admin_assignments',
  'vendors',
  'vendor_api_keys',
  'orders',
  'order_agents',
  'leads',
  'call_logs',
  'disputes',
  'notifications',
  'wallet_transactions',
]

const failures = []

for (const table of requiredTables) {
  const { error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })

  if (error) {
    failures.push(`Table ${table}: ${error.message}`)
  } else {
    console.log(`✓ table ${table}`)
  }
}

const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
if (bucketError) {
  failures.push(`Storage buckets: ${bucketError.message}`)
} else {
  const bucketById = new Map((buckets ?? []).map(bucket => [bucket.id, bucket]))
  for (const bucketId of ['profile-pictures', 'team-logos', 'vendor-logos', 'call-recordings']) {
    if (!bucketById.has(bucketId)) {
      failures.push(`Missing storage bucket ${bucketId}`)
    } else {
      console.log(`✓ storage bucket ${bucketId}`)
    }
  }

  const recordingBucket = bucketById.get('call-recordings')
  if (recordingBucket?.public) {
    failures.push('The call-recordings bucket must be private')
  } else if (recordingBucket) {
    console.log('✓ call-recordings bucket is private')
  }
}

const { error: spendRpcError } = await supabase.rpc('get_order_spend_today', {
  p_order_ids: [],
  p_timezone: 'UTC',
})

if (spendRpcError) {
  failures.push(`RPC get_order_spend_today: ${spendRpcError.message}`)
} else {
  console.log('✓ RPC get_order_spend_today')
}

const { count: adminCount, error: adminError } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true })
  .eq('role', 'super_admin')

if (adminError) {
  failures.push(`Super administrator check: ${adminError.message}`)
} else if (!adminCount) {
  failures.push('No super administrator profile exists')
} else {
  console.log(`✓ ${adminCount} super administrator profile${adminCount === 1 ? '' : 's'}`)
}

if (failures.length > 0) {
  console.error('\nSupabase verification failed:')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('\nSupabase verification passed.')
