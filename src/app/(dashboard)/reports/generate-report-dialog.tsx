'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileDown, FileText } from 'lucide-react'

type StatusRow = { status: string; label: string; count: number }
type OutcomeRow = { outcome: string; count: number }

export type ReportData = {
  total: number
  sales: number
  conversionRate: string
  contactRate: string
  totalCalls: number
  active: number
  closed: number
  lost: number
  statusBreakdown: StatusRow[]
  callOutcomes: OutcomeRow[]
  generatedAt: string
  agentName: string
}

const SECTIONS = [
  { id: 'summary',   label: 'Summary Statistics',    description: 'Total leads, sales, conversion rate, contact rate, total calls' },
  { id: 'pipeline',  label: 'Pipeline Summary',       description: 'Active, closed, and lost lead counts' },
  { id: 'statuses',  label: 'Lead Status Breakdown',  description: 'Count per lead status' },
  { id: 'outcomes',  label: 'Call Outcomes',           description: 'Count per call outcome' },
] as const

type SectionId = typeof SECTIONS[number]['id']

export function GenerateReportDialog({ data }: { data: ReportData }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<SectionId>>(new Set(SECTIONS.map(s => s.id)))
  const [loading, setLoading] = useState(false)

  function toggle(id: SectionId) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleExport() {
    setLoading(true)
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const pageW = doc.internal.pageSize.getWidth()
    const margin = 20
    const contentW = pageW - margin * 2
    let y = margin

    function addLine(text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number } = {}) {
      const { size = 10, bold = false, color = [30, 30, 30], indent = 0 } = opts
      doc.setFontSize(size)
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setTextColor(...color)
      doc.text(text, margin + indent, y)
      y += size * 0.4 + 2
    }

    function addSpacer(h = 4) { y += h }

    function checkPage(needed = 10) {
      if (y + needed > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage()
        y = margin
      }
    }

    function sectionHeader(title: string) {
      checkPage(14)
      addSpacer(2)
      doc.setFillColor(245, 245, 245)
      doc.rect(margin, y - 4, contentW, 9, 'F')
      addLine(title, { size: 11, bold: true, color: [20, 20, 20] })
      addSpacer(1)
    }

    function row(label: string, value: string) {
      checkPage(8)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(label, margin + 4, y)
      doc.setTextColor(20, 20, 20)
      doc.setFont('helvetica', 'bold')
      doc.text(value, margin + contentW * 0.55, y)
      y += 7
    }

    function barRow(label: string, count: number, total: number) {
      checkPage(10)
      const pct = total > 0 ? (count / total) * 100 : 0
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(label, margin + 4, y)
      doc.setTextColor(20, 20, 20)
      doc.text(`${count}  (${pct.toFixed(0)}%)`, margin + contentW * 0.65, y)
      y += 4
      // bar track
      doc.setFillColor(230, 230, 230)
      doc.rect(margin + 4, y, contentW - 8, 2, 'F')
      if (pct > 0) {
        doc.setFillColor(80, 120, 200)
        doc.rect(margin + 4, y, (contentW - 8) * pct / 100, 2, 'F')
      }
      y += 6
    }

    // Title
    addLine('LeadNav Report', { size: 18, bold: true, color: [20, 20, 20] })
    addSpacer(1)
    addLine(`${data.generatedAt}`, { size: 9, color: [120, 120, 120] })
    addLine(`${data.agentName}`, { size: 9, color: [120, 120, 120] })
    addSpacer(3)
    doc.setDrawColor(210, 210, 210)
    doc.line(margin, y, margin + contentW, y)
    addSpacer(4)

    if (selected.has('summary')) {
      sectionHeader('Summary Statistics')
      row('Total Leads', String(data.total))
      row('Sales', `${data.sales}  (${data.conversionRate}%)`)
      row('Contact Rate', `${data.contactRate}%`)
      row('Total Calls', String(data.totalCalls))
      addSpacer(4)
    }

    if (selected.has('pipeline')) {
      sectionHeader('Pipeline Summary')
      const pTotal = data.active + data.closed + data.lost
      row('Active', `${data.active}  (${pTotal > 0 ? ((data.active / pTotal) * 100).toFixed(1) : 0}%)`)
      row('Closed', `${data.closed}  (${pTotal > 0 ? ((data.closed / pTotal) * 100).toFixed(1) : 0}%)`)
      row('Lost',   `${data.lost}  (${pTotal > 0 ? ((data.lost / pTotal) * 100).toFixed(1) : 0}%)`)
      addSpacer(4)
    }

    if (selected.has('statuses') && data.statusBreakdown.length > 0) {
      sectionHeader('Lead Status Breakdown')
      addSpacer(2)
      for (const s of data.statusBreakdown) {
        barRow(s.label, s.count, data.total)
      }
      addSpacer(4)
    }

    if (selected.has('outcomes') && data.callOutcomes.length > 0) {
      sectionHeader('Call Outcomes')
      addSpacer(2)
      for (const o of data.callOutcomes) {
        barRow(o.outcome.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), o.count, data.totalCalls)
      }
      addSpacer(4)
    }

    doc.save('leadnav-report.pdf')
    setLoading(false)
    setOpen(false)
  }

  const anySelected = selected.size > 0

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <FileText size={15} />
        Generate Report
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Generate Report</DialogTitle>
          </DialogHeader>

          <p className="text-xs text-muted-foreground -mt-1">Select the sections to include in the exported PDF.</p>

          <div className="flex flex-col gap-1 mt-1">
            {SECTIONS.map(s => (
              <label
                key={s.id}
                className="flex items-start gap-3 rounded-md px-3 py-2.5 cursor-pointer hover:bg-muted transition-colors group"
              >
                <input
                  type="checkbox"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                  className="mt-0.5 h-3 w-3 rounded border-border accent-foreground cursor-pointer"
                />
                <div>
                  <p className="text-xs font-medium text-foreground leading-none">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">{s.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleExport} disabled={!anySelected || loading} className="gap-2">
              <FileDown size={14} />
              {loading ? 'Exporting…' : 'Export PDF'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
