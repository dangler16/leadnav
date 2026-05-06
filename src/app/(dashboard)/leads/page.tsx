import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Lead, LeadStatus, getLeadDisplayStatus } from '@/lib/types'
import { LeadStatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Users, ArrowRight } from 'lucide-react'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

type DisplayFilter = 'All' | 'Active' | 'Closed' | 'Lost'
const statusOptions: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'not_contacted', label: 'Not Contacted' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'appt_set', label: 'Appt Set' },
  { value: 'appt_no_show', label: 'No Show' },
  { value: 'appt_no_sale', label: 'No Sale' },
  { value: 'appt_rescheduled', label: 'Rescheduled' },
  { value: 'sale', label: 'Sale' },
  { value: 'lost', label: 'Lost' },
]

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; search?: string }>
}) {
  const params = await searchParams
  const filter = (params.filter as DisplayFilter) ?? 'All'
  const search = params.search ?? ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  let query = supabase.from('leads').select('*').eq('assigned_to', user.id).order('created_at', { ascending: false })

  if (search) {
    query = query.or(`firstname.ilike.%${search}%,lastname.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data: allLeads } = await query
  const leads = (allLeads ?? []) as Lead[]

  const filtered = leads.filter(l => {
    if (filter === 'All') return true
    return getLeadDisplayStatus(l.status) === filter
  })

  const counts = {
    All: leads.length,
    Active: leads.filter(l => getLeadDisplayStatus(l.status) === 'Active').length,
    Closed: leads.filter(l => getLeadDisplayStatus(l.status) === 'Closed').length,
    Lost: leads.filter(l => getLeadDisplayStatus(l.status) === 'Lost').length,
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and track your lead pipeline.</p>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* Card header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <Users size={15} />
            </div>
            <p className="text-sm font-semibold text-gray-900">All Leads</p>
          </div>
          {/* Search */}
          <form method="GET" className="flex items-center gap-2">
            <input
              name="search"
              defaultValue={search}
              placeholder="Search by name, email, phone…"
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-64 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
            />
            <input type="hidden" name="filter" value={filter} />
            <Button type="submit" size="sm" variant="outline">Search</Button>
          </form>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100">
          {(['All', 'Active', 'Closed', 'Lost'] as DisplayFilter[]).map(f => (
            <Link
              key={f}
              href={`/leads?filter=${f}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-red-600 text-white'
                  : 'text-gray-500 hover:text-gray-700 border border-gray-200'
              }`}
            >
              {f} <span className="ml-1 opacity-70">({counts[f]})</span>
            </Link>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 px-5 py-3">Lead</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Phone</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Email</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">State</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Status</th>
                <th className="text-left text-xs font-medium text-gray-400 px-3 py-3">Date Added</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                    No leads found
                  </td>
                </tr>
              )}
              {filtered.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-red-600">
                      {[lead.firstname, lead.lastname].filter(Boolean).join(' ') || '—'}
                    </Link>
                    {lead.birthday && (
                      <p className="text-xs text-gray-400 mt-0.5">DOB: {lead.birthday}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-gray-600">{lead.phone ?? '—'}</td>
                  <td className="px-3 py-3 text-gray-600 max-w-[180px] truncate">{lead.email ?? '—'}</td>
                  <td className="px-3 py-3 text-gray-600">{lead.state ?? '—'}</td>
                  <td className="px-3 py-3"><LeadStatusBadge status={lead.status} /></td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{formatDate(lead.created_at)}</td>
                  <td className="px-3 py-3">
                    <Link href={`/leads/${lead.id}`} className="text-red-600 hover:text-red-700">
                      <ArrowRight size={15} />
                    </Link>
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
