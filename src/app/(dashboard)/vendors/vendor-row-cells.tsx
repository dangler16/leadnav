'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Vendor, VendorApiKey } from '@/lib/types'
import { EditVendorDialog } from './edit-vendor-dialog'
import { VendorApiKeys } from './vendor-api-keys'
import { DeleteVendorButton } from './delete-vendor-button'
import { badgeShape } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',
  IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
  ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
  MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
  OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
  TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
  WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function VendorRowCells({ vendor, vendorKeys }: { vendor: Vendor; vendorKeys: VendorApiKey[] }) {
  const [editOpen, setEditOpen] = useState(false)
  const locations = vendor.locations

  return (
    <>
      <td className="px-3 py-2.5">
        {vendor.lead_types.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {vendor.lead_types.map(lt => (
              <span key={lt} className={cn(badgeShape, 'bg-gray-100 text-gray-600 border border-gray-200')}>{lt}</span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        {locations.length === 0 ? (
          <span className="text-gray-400">—</span>
        ) : locations.length > 5 ? (
          <button
            onClick={() => setEditOpen(true)}
            className={cn(badgeShape, 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-colors cursor-pointer')}
          >
            View all ({locations.length})
          </button>
        ) : (
          <div className="flex gap-1 flex-wrap">
            {locations.map(s => (
              <span key={s} className={cn(badgeShape, 'bg-gray-100 text-gray-600 border border-gray-200')}>
                {STATE_NAMES[s] ?? s}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 text-xs text-gray-900">
        {vendor.cost_per_lead != null ? `$${vendor.cost_per_lead}` : <span className="text-gray-400">—</span>}
      </td>
      <td className="px-3 py-2.5 text-xs text-gray-400">{formatDate(vendor.created_at)}</td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex items-center justify-end gap-1">
          {vendor.type === 'inbound' && (
            <VendorApiKeys vendor={vendor} initialKeys={vendorKeys} />
          )}
          <button
            onClick={() => setEditOpen(true)}
            className="ml-1 p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <DeleteVendorButton vendorId={vendor.id} vendorName={vendor.name} />
        </div>
      </td>
      <EditVendorDialog vendor={vendor} open={editOpen} onOpenChange={setEditOpen} />
    </>
  )
}
