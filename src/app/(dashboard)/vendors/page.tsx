import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Store } from 'lucide-react'
import { Vendor, VendorApiKey } from '@/lib/types'
import { VendorApiKeys } from './vendor-api-keys'
import { NewVendorDialog } from './new-vendor-dialog'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function VendorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!myProfile || myProfile.role !== 'admin') redirect('/dashboard')

  const { data: vendorsData } = await supabase.from('vendors').select('*').order('created_at', { ascending: false })
  const vendors = (vendorsData ?? []) as Vendor[]

  const { data: keysData } = await supabase.from('vendor_api_keys').select('*').order('created_at', { ascending: false })
  const allKeys = (keysData ?? []) as VendorApiKey[]

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage lead vendors and sources.</p>
        </div>
        <NewVendorDialog />
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
            <Store size={15} />
          </div>
          <p className="text-sm font-semibold text-gray-900">All Vendors</p>
          <span className="text-xs text-gray-400 ml-1">({vendors.length})</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Name</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Type</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Lead Types</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Locations</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Cost/Lead</th>
              <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Added</th>
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {vendors.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">No vendors yet.</td>
              </tr>
            )}
            {vendors.map(v => {
              const vendorKeys = allKeys.filter(k => k.vendor_id === v.id)
              return (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold">
                        {v.name[0].toUpperCase()}
                      </div>
                      <p className="font-medium text-gray-800">{v.name}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      v.type === 'inbound' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {v.type === 'inbound' ? 'Inbound' : 'Manual'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">
                    {v.lead_types.length > 0 ? v.lead_types.join(', ') : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">
                    {v.locations.length > 0 ? v.locations.join(', ') : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">
                    {v.cost_per_lead != null ? `$${v.cost_per_lead}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-400">{formatDate(v.created_at)}</td>
                  <td className="px-3 py-3">
                    {v.type === 'inbound' && (
                      <VendorApiKeys vendor={v} initialKeys={vendorKeys} />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
        <p className="text-xs font-semibold text-gray-700 mb-1">Webhook endpoint</p>
        <code className="text-xs font-mono text-gray-600 break-all">
          POST {process.env.NEXT_PUBLIC_SITE_URL ?? 'https://your-domain.com'}/api/leads/inbound
        </code>
        <p className="text-xs text-gray-400 mt-2">
          Send leads via POST with <code className="font-mono">X-API-Key: &lt;key&gt;</code> header and a JSON body. Fields: firstname, lastname, birthday, email, phone, state, zip, plan_for, looking_for, income, household, utm_source, utm_campaign, utm_medium.
        </p>
      </div>
    </div>
  )
}
