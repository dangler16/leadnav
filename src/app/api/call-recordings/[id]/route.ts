import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { NextRequest } from 'next/server'

const LEGACY_PUBLIC_MARKER = '/storage/v1/object/public/call-recordings/'
const LEGACY_SIGNED_MARKER = '/storage/v1/object/sign/call-recordings/'

function normalizeRecordingPath(value: string): string | null {
  try {
    let path = value.trim()

    if (/^https?:\/\//i.test(path)) {
      const url = new URL(path)
      const marker = url.pathname.includes(LEGACY_PUBLIC_MARKER)
        ? LEGACY_PUBLIC_MARKER
        : url.pathname.includes(LEGACY_SIGNED_MARKER)
          ? LEGACY_SIGNED_MARKER
          : null

      if (!marker) return null
      path = url.pathname.split(marker)[1] ?? ''
    }

    path = decodeURIComponent(path).replace(/^\/+/, '')
    if (!path || path.includes('..') || path.includes('\\')) return null
    return path
  } catch {
    return null
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callLog } = await supabase
    .from('call_logs')
    .select('recording_url')
    .eq('id', id)
    .single()

  if (!callLog?.recording_url) {
    return Response.json({ error: 'Recording not found' }, { status: 404 })
  }

  const objectPath = normalizeRecordingPath(callLog.recording_url)
  if (!objectPath) {
    return Response.json({ error: 'Recording path is invalid' }, { status: 404 })
  }

  const service = createServiceClient()
  const { data, error } = await service.storage
    .from('call-recordings')
    .createSignedUrl(objectPath, 300)

  if (error || !data?.signedUrl) {
    return Response.json({ error: 'Recording is unavailable' }, { status: 404 })
  }

  return Response.redirect(data.signedUrl, 302)
}
