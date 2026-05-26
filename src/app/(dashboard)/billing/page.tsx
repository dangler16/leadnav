import { createClient } from '@/lib/supabase/server'
import { Profile, WalletTransaction } from '@/lib/types'
import { Wallet, ArrowDownLeft, ArrowUpRight, RotateCcw } from 'lucide-react'
import { AddFundsButton } from './add-funds-button'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCents(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function TxIcon({ type }: { type: WalletTransaction['type'] }) {
  if (type === 'topup')  return <ArrowDownLeft size={14} className="text-green-500" />
  if (type === 'refund') return <RotateCcw    size={14} className="text-blue-500"  />
  return <ArrowUpRight size={14} className="text-muted-foreground" />
}

function txLabel(type: WalletTransaction['type']) {
  if (type === 'topup')  return 'Top-up'
  if (type === 'refund') return 'Refund'
  return 'Lead charge'
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const params = await searchParams
  const showSuccess = params.success === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profileData }, { data: txData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const profile = profileData as Profile
  const transactions = (txData ?? []) as WalletTransaction[]
  const balance = profile?.wallet_balance_cents ?? 0

  return (
    <div className="flex flex-col bg-background min-h-full px-8 pt-5 pb-8">

      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-foreground">Billing</h1>
        <AddFundsButton />
      </div>

      {showSuccess && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700 mb-4">
          Payment successful! Your wallet balance will update shortly.
        </div>
      )}

      {/* Balance card */}
      <div className="bg-card border border-border rounded-lg p-4 max-w-xs mb-4">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-semibold text-foreground">Wallet Balance</p>
        </div>
        <p className="text-3xl font-semibold text-foreground tabular-nums leading-none" style={{ fontFamily: 'var(--font-mono), monospace' }}>{formatCents(balance)}</p>
        <p className="text-xs text-muted-foreground mt-1.5">Used automatically when leads are delivered</p>
      </div>

      {/* Transaction history */}
      <div className="flex flex-col border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-foreground">Transaction History</p>
        </div>
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground px-4 py-2.5">Date</th>
                <th className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground px-4 py-2.5">Type</th>
                <th className="text-left text-xs font-medium uppercase tracking-wide text-muted-foreground px-4 py-2.5">Description</th>
                <th className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground px-4 py-2.5">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-xs text-muted-foreground">
                    No transactions yet. Add funds to get started.
                  </td>
                </tr>
              )}
              {transactions.map(tx => (
                <tr key={tx.id} className="border-b border-border hover:bg-muted transition-colors">
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(tx.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1.5">
                      <TxIcon type={tx.type} />
                      <span className="text-xs text-foreground">{txLabel(tx.type)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{tx.description ?? '—'}</td>
                  <td className={`px-4 py-2.5 text-right font-mono tabular-nums text-xs font-medium ${
                    tx.type === 'charge' ? 'text-foreground' : 'text-green-600'
                  }`}>
                    {tx.type === 'charge' ? '−' : '+'}{formatCents(tx.amount_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
