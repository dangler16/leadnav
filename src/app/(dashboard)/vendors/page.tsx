import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Vendor, VendorApiKey } from '@/lib/types'
import { NewVendorDialog } from './new-vendor-dialog'
import { VendorStatusSelect } from './vendor-status-select'
import { VendorRowCells } from './vendor-row-cells'
import { badgeShape } from '@/components/ui/badge'

export default async function VendorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!myProfile || myProfile.role !== 'super_admin') redirect('/dashboard')

  const { data: vendorsData } = await supabase.from('vendors').select('*').order('created_at', { ascending: false })
  const vendors = (vendorsData ?? []) as Vendor[]

  const { data: keysData } = await supabase.from('vendor_api_keys').select('*').order('created_at', { ascending: false })
  const allKeys = (keysData ?? []) as VendorApiKey[]

  return (
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7 h-full">
      <div className="flex items-start justify-between w-full pb-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage lead vendors and sources.</p>
        </div>
        <NewVendorDialog />
      </div>

      <div className="flex flex-col flex-1 min-h-0 bg-card border border-border rounded-lg overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Name</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Status</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Type</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Lead Types</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Locations</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Cost/Lead</th>
                <th className="text-left text-sm font-medium text-muted-foreground px-3 py-2">Added</th>
                <th className="px-3 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {vendors.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">No vendors yet.</td>
                </tr>
              )}
              {vendors.map(v => {
                const vendorKeys = allKeys.filter(k => k.vendor_id === v.id)
                return (
                  <tr key={v.id} className="hover:bg-muted transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 text-xs font-bold">
                          {v.name[0].toUpperCase()}
                        </div>
                        <p className="font-medium text-foreground">{v.name}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <VendorStatusSelect vendorId={v.id} initialIsActive={v.is_active} />
                    </td>
                    <td className="px-3 py-2">
                      <span className={`${badgeShape} ${v.type === 'inbound' ? 'px-2 border-1 border-blue-100 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                        {v.type === 'inbound' ? 'Inbound' : 'Manual'}
                      </span>
                    </td>
                    <VendorRowCells vendor={v} vendorKeys={vendorKeys} />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
