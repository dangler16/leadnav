import { createClient } from '@/lib/supabase/server'
import { Lead, LeadStatus, Profile } from '@/lib/types'
import { SearchInput } from './search-input'
import { LeadsFilterTabs } from './leads-filter-tabs'
import { LeadsTable, FormattedLead } from './leads-table'
import type { SortDir } from '@/components/sortable-header'

function formatPhone(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  const d = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits
  if (d.length !== 10) return phone
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

function formatDate(dateStr: string): { short: string; full: string } {
  const date = new Date(dateStr)
  const full = date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return { short: 'just now', full }
  if (mins < 60) return { short: `${mins}m ago`, full }
  const hours = Math.floor(mins / 60)
  if (hours < 24) return { short: `${hours}h ago`, full }
  const days = Math.floor(hours / 24)
  if (days < 7) return { short: `${days}d ago`, full }
  return { short: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), full }
}

type StatusFilter = 'all' | 'new' | 'contacted' | 'not_contacted' | 'appt_set' | 'appt_rescheduled' | 'appt_no_show' | 'appt_no_sale' | 'sale' | 'lost'

function sortLeads<T extends { firstname: string | null; lastname: string | null; status: string; vendors: { name: string; cost_per_lead: number | null } | null; phone: string | null; email: string | null; state: string | null; zip: string | null; created_at: string }>(
  data: T[], col: string | null, dir: SortDir | null,
): T[] {
  if (!col || !dir) return data
  return [...data].sort((a, b) => {
    let av: string | number | null, bv: string | number | null
    if (col === 'name')   { av = [a.firstname, a.lastname].filter(Boolean).join(' ') || null; bv = [b.firstname, b.lastname].filter(Boolean).join(' ') || null }
    else if (col === 'status') { av = a.status; bv = b.status }
    else if (col === 'vendor') { av = a.vendors?.name ?? null; bv = b.vendors?.name ?? null }
    else if (col === 'phone')  { av = a.phone; bv = b.phone }
    else if (col === 'email')  { av = a.email; bv = b.email }
    else if (col === 'state')  { av = a.state; bv = b.state }
    else if (col === 'zip')    { av = a.zip; bv = b.zip }
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

  const [{ data: leadsData }, { data: agentsData }] = await Promise.all([
    q,
    isAdmin ? supabase.from('profiles').select('*').order('first_name') : Promise.resolve({ data: [] }),
  ])
  const agents = (agentsData ?? []) as Profile[]
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
    leads.filter(l => filter === 'all' || l.status === (filter as LeadStatus)),
    sort, sortDir,
  )

  const formattedLeads: FormattedLead[] = filtered.map(lead => {
    const { short, full } = formatDate(lead.created_at)
    return {
      id: lead.id,
      name: [lead.firstname, lead.lastname].filter(Boolean).join(' ') || null,
      status: lead.status,
      vendor: lead.vendors?.name ?? null,
      phone: formatPhone(lead.phone),
      email: lead.email,
      state: lead.state,
      zip: lead.zip,
      dateShort: short,
      dateFull: full,
    }
  })

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      <div className="flex items-center px-8 pt-5 pb-4 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Leads</h1>
      </div>

      <div className="flex flex-col flex-1 min-h-0 mx-8 mb-5 border border-gray-200 rounded overflow-hidden">

        {/* Unified toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 shrink-0 flex-wrap">
          <SearchInput defaultValue={search} />
          <div className="h-4 w-px bg-gray-200 shrink-0" />
          <LeadsFilterTabs filter={filter} counts={counts} search={search} />
        </div>

        {/* Count */}
        <div className="px-3 py-1.5 border-b border-gray-100 bg-white shrink-0">
          <p className="text-xs text-gray-400">
            Showing <span className="font-medium text-gray-600">{filtered.length}</span> of <span className="font-medium text-gray-600">{leads.length}</span> leads
          </p>
        </div>

        {/* Table — owns its own scroll container and bulk action bar */}
        <LeadsTable leads={formattedLeads} sort={sort} sortDir={sortDir} isAdmin={isAdmin} agents={agents} />

      </div>
    </div>
  )
}
