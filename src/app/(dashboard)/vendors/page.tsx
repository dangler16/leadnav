import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Vendor, VendorApiKey } from '@/lib/types'
import { NewVendorDialog } from './new-vendor-dialog'
import { VendorStatusSelect } from './vendor-status-select'
import { VendorRowCells } from './vendor-row-cells'
import { badgeShape } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { SortableHeader, SortDir } from '@/components/sortable-header'

function sortVendors(vendors: Vendor[], col: string | null, dir: SortDir | null): Vendor[] {
  if (!col || !dir) return vendors
  return [...vendors].sort((a, b) => {
    let av: string | number | null, bv: string | number | null
    if (col === 'name') {
      av = a.name; bv = b.name
    } else if (col === 'status') {
      av = a.is_active ? '1' : '0'; bv = b.is_active ? '1' : '0'
    } else if (col === 'type') {
      av = a.type; bv = b.type
    } else {
      av = a.created_at; bv = b.created_at
    }
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return dir === 'asc' ? av - bv : bv - av
    const cmp = String(av).localeCompare(String(bv))
    return dir === 'asc' ? cmp : -cmp
  })
}

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; sortDir?: string }>
}) {
  const params = await searchParams
  const sort = params.sort ?? null
  const sortDir = (params.sortDir as SortDir | undefined) ?? null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!myProfile || myProfile.role !== 'super_admin') redirect('/dashboard')

  const { data: vendorsData } = await supabase.from('vendors').select('*').order('created_at', { ascending: false })
  const vendors = (vendorsData ?? []) as Vendor[]

  const { data: keysData } = await supabase.from('vendor_api_keys').select('*').order('created_at', { ascending: false })
  const allKeys = (keysData ?? []) as VendorApiKey[]

  const sorted = sortVendors(vendors, sort, sortDir)

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      <div className="flex items-center justify-between px-8 pt-5 pb-4 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Vendors</h1>
        <NewVendorDialog />
      </div>

      <div className="flex flex-col flex-1 min-h-0 mx-8 mb-5 border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-3 py-2.5"><SortableHeader column="name"   label="Name"       currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="status" label="Status"     currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="type"   label="Type"       currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left text-xs font-medium uppercase tracking-wide text-gray-500 px-3 py-2.5">Lead Types</th>
                <th className="text-left text-xs font-medium uppercase tracking-wide text-gray-500 px-3 py-2.5">Locations</th>
                <th className="text-left px-3 py-2.5"><SortableHeader column="added" label="Added"      currentSort={sort} currentDir={sortDir} /></th>
                <th className="px-3 py-2.5 text-right" />
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-xs text-gray-400">No vendors yet.</td>
                </tr>
              )}
              {sorted.map(v => {
                const vendorKeys = allKeys.filter(k => k.vendor_id === v.id)
                return (
                  <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {v.logo_url ? (
                          <img src={v.logo_url} alt={v.name} className="w-7 h-7 rounded object-cover border border-gray-200 shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0">
                            {v.name[0].toUpperCase()}
                          </div>
                        )}
                        <p className="text-xs font-medium text-gray-900">{v.name}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <VendorStatusSelect vendorId={v.id} initialIsActive={v.is_active} />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(badgeShape, v.type === 'inbound'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200')}>
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
