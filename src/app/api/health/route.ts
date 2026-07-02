import { createServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const REQUIRED_ENVIRONMENT_VARIABLES = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_APP_URL',
] as const

export async function GET() {
  const missingEnvironment = REQUIRED_ENVIRONMENT_VARIABLES.filter(name => !process.env[name])

  if (missingEnvironment.length > 0) {
    return Response.json(
      { status: 'unavailable', reason: 'configuration' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const supabase = createServiceClient()
    const { error } = await supabase
      .from('profiles')
      .select('id', { head: true, count: 'exact' })

    if (error) throw error

    return Response.json(
      { status: 'ok', database: 'reachable', timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[health] Supabase check failed', error)
    return Response.json(
      { status: 'unavailable', reason: 'database' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
