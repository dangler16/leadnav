import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Lead, LeadStatus } from '@/lib/types'
import { LeadStatusSelect } from './lead-status-select'
import { SearchInput } from './search-input'
import { LeadsFilterTabs } from './leads-filter-tabs'
import { SortableHeader, SortDir } from '@/components/sortable-header'

function formatPhone(phone: string | null) {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  const d = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits
  if (d.length !== 10) return phone
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  })
}

type StatusFilter = 'all' | 'new' | 'contacted' | 'not_contacted' | 'appt_set' | 'appt_rescheduled' | 'appt_no_show' | 'appt_no_sale' | 'sale' | 'lost'

function sortLeads<T extends { firstname: string | null; lastname: string | null; status: string; vendors: { name: string; cost_per_lead: number | null } | null; phone: string | null; email: string | null; state: string | null; zip: string | null; created_at: string }>(
  data: T[], col: string | null, dir: SortDir | null,
): T[] {
  if (!col || !dir) return data
  return [...data].sort((a, b) => {
    let av: string | number | null, bv: string | number | null
    if (col === 'name') { av = [a.firstname, a.lastname].filter(Boolean).join(' ') || null; bv = [b.firstname, b.lastname].filter(Boolean).join(' ') || null }
    else if (col === 'status') { av = a.status; bv = b.status }
    else if (col === 'vendor') { av = a.vendors?.name ?? null; bv = b.vendors?.name ?? null }
    else if (col === 'cost') { av = a.vendors?.cost_per_lead ?? null; bv = b.vendors?.cost_per_lead ?? null }
    else if (col === 'phone') { av = a.phone; bv = b.phone }
    else if (col === 'email') { av = a.email; bv = b.email }
    else if (col === 'state') { av = a.state; bv = b.state }
    else if (col === 'zip') { av = a.zip; bv = b.zip }
    else { av = a.created_at; bv = b.created_at }
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return dir === 'asc' ? av - bv : bv - av
    const cmp = String(av).localeCompare(String(bv))
    return dir === 'asc' ? cmp : -cmp
  })
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; search?: string; sort?: string; sortDir?: string }>
}) {
  const params = await searchParams
  const filter = (params.filter as StatusFilter) ?? 'all'
  const search = params.search ?? ''
  const sort = params.sort ?? null
  const sortDir = (params.sortDir as SortDir | undefined) ?? null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'team_admin'

  let q = supabase.from('leads').select('*, vendors(name, cost_per_lead)').order('created_at', { ascending: false })
  if (!isAdmin) q = q.eq('assigned_to', user.id)
  if (search) q = q.or(`firstname.ilike.%${search}%,lastname.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)

  const { data: leadsData } = await q
  type LeadWithVendor = Lead & { vendors: { name: string; cost_per_lead: number | null } | null }
  const leads = (leadsData ?? []) as LeadWithVendor[]

  const counts: Record<StatusFilter, number> = {
    all: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    not_contacted: leads.filter(l => l.status === 'not_contacted').length,
    appt_set: leads.filter(l => l.status === 'appt_set').length,
    appt_rescheduled: leads.filter(l => l.status === 'appt_rescheduled').length,
    appt_no_show: leads.filter(l => l.status === 'appt_no_show').length,
    appt_no_sale: leads.filter(l => l.status === 'appt_no_sale').length,
    sale: leads.filter(l => l.status === 'sale').length,
    lost: leads.filter(l => l.status === 'lost').length,
  }

  const filtered = sortLeads(
    leads.filter(l => {
      if (filter === 'all') return true
      return l.status === (filter as LeadStatus)
    }),
    sort, sortDir,
  )

  return (
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7 h-full">

      {/* Header */}
      <div className="flex items-start justify-between w-full pb-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and track your pipeline.</p>
        </div>
        <Link
          href="/calls"
          className="flex items-center px-2 py-1 rounded-sm bg-red-600 text-white text-sm font-medium whitespace-nowrap overflow-hidden hover:bg-red-800 transition-colors"
        >
          Call Lead
        </Link>
      </div>

      {/* Table Card */}
      <div className="flex flex-col flex-1 min-h-0 bg-card border border-border rounded-lg overflow-hidden">

        {/* Filter tabs */}
        <div className="flex items-center justify-between gap-1.5 p-3 border-b border-border/50">
          <LeadsFilterTabs filter={filter} counts={counts} search={search} />
          <SearchInput defaultValue={search} />
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-3 py-2"><SortableHeader column="name" label="Lead" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2"><SortableHeader column="status" label="Status" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2"><SortableHeader column="vendor" label="Vendor" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2"><SortableHeader column="cost" label="Cost" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2"><SortableHeader column="phone" label="Phone" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2"><SortableHeader column="email" label="Email" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2"><SortableHeader column="state" label="State" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2"><SortableHeader column="zip" label="Zip" currentSort={sort} currentDir={sortDir} /></th>
                <th className="text-left px-3 py-2"><SortableHeader column="date" label="Date" currentSort={sort} currentDir={sortDir} /></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-md text-muted-foreground">
                    No leads found
                  </td>
                </tr>
              )}
              {filtered.map(lead => (
                <tr key={lead.id} className="border-b border-border/50 transition-colors hover:bg-muted">
                  <td className="px-3 py-2">
                    <Link href={`/leads/${lead.id}`} className="text-sm text-foreground hover:text-red-600 transition-colors">
                      {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || '—'}
                    </Link>
                  </td>
                  <td className="px-3 py-2 max-w-40 pr-10">
                    <LeadStatusSelect leadId={lead.id} initialStatus={lead.status} />
                  </td>
                  <td className="px-3 py-2 text-sm text-foreground whitespace-nowrap">{lead.vendors?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-sm text-foreground whitespace-nowrap">
                    {lead.vendors?.cost_per_lead != null ? `$${lead.vendors.cost_per_lead.toLocaleString('en-US')}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-foreground">{formatPhone(lead.phone)}</td>
                  <td className="px-3 py-2 text-sm text-foreground max-w-[200px] truncate">{lead.email ?? '—'}</td>
                  <td className="px-3 py-2 text-sm text-foreground">{lead.state ?? '—'}</td>
                  <td className="px-3 py-2 text-sm text-foreground">{lead.zip ?? '—'}</td>
                  <td className="px-3 py-2 text-sm text-muted-foreground whitespace-nowrap">{formatDate(lead.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
