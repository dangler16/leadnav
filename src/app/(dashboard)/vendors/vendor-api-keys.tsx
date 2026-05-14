'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Vendor, VendorApiKey } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Key, Plus, Copy, Check, Ban } from 'lucide-react'
import { generateApiKey, revokeApiKey } from './actions'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function VendorApiKeys({ vendor, initialKeys }: { vendor: Vendor; initialKeys: VendorApiKey[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  async function handleGenerate() {
    setLoading(true)
    try {
      const raw = await generateApiKey(vendor.id)
      setNewKey(raw)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke(id: string) {
    setRevokingId(id)
    try {
      await revokeApiKey(id)
      router.refresh()
    } finally {
      setRevokingId(null)
    }
  }

  async function handleCopy() {
    if (!newKey) return
    await navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) setNewKey(null)
  }

  const activeKeys = initialKeys.filter(k => k.is_active)
  const revokedKeys = initialKeys.filter(k => !k.is_active)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="text-sm font-medium px-2 py-1 rounded-sm bg-white border-1 border-neutral-300 text-gray-900 transition-colors hover:bg-neutral-200">
        Keys ({activeKeys.length})
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              API Keys — {vendor.name}
            </DialogTitle>
          </DialogHeader>

          {newKey && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-xs font-medium text-amber-800">Copy this key now — it won&apos;t be shown again.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-card border border-amber-200 rounded px-2 py-1.5 break-all font-mono text-foreground">
                  {newKey}
                </code>
                <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0 text-xs">
                  {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {initialKeys.length === 0 && !newKey && (
              <p className="text-sm text-muted-foreground py-4 text-center">No API keys yet.</p>
            )}
            {activeKeys.map(k => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted px-3 py-2.5">
                <div>
                  <code className="text-xs font-mono text-foreground">{k.key_prefix}…</code>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Created {formatDate(k.created_at)}
                    {k.last_used_at && ` · Last used ${formatDate(k.last_used_at)}`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={revokingId === k.id}
                  onClick={() => handleRevoke(k.id)}
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                >
                  <Ban size={12} />
                  {revokingId === k.id ? 'Revoking…' : 'Revoke'}
                </Button>
              </div>
            ))}
            {revokedKeys.length > 0 && (
              <details className="pt-1">
                <summary className="text-xs text-muted-foreground cursor-pointer select-none">
                  {revokedKeys.length} revoked key{revokedKeys.length !== 1 ? 's' : ''}
                </summary>
                <div className="space-y-1 mt-1">
                  {revokedKeys.map(k => (
                    <div key={k.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 opacity-50">
                      <code className="text-xs font-mono text-gray-500">{k.key_prefix}…</code>
                      <span className="text-xs text-muted-foreground">Revoked</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm"
            >
              {loading ? 'Generating…' : 'Generate Key'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
