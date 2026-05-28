'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, SquareUser, AlertCircle, Package, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Notification } from '@/lib/types'
import { cn } from '@/lib/utils'

function TypeIcon({ type }: { type: string }) {
  const cls = 'text-muted-foreground'
  if (type === 'new_lead')       return <SquareUser  size={11} strokeWidth={2} className={cls} />
  if (type === 'dispute_update') return <AlertCircle size={11} strokeWidth={2} className={cls} />
  if (type === 'order_update')   return <Package     size={11} strokeWidth={2} className={cls} />
  return <Bell size={11} strokeWidth={2} className={cls} />
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function NotificationList({ initialNotifications }: { initialNotifications: Notification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const supabase = createClient()

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function deleteNotification(id: string) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3">
        <Bell size={22} className="text-border" strokeWidth={1.5} />
        <p className="text-xs text-muted-foreground">No notifications yet</p>
      </div>
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {notifications.map(n => {
        const inner = (
          <div className={cn(
            'group flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors',
            !n.read ? 'bg-muted/60' : 'hover:bg-muted'
          )}>
            <div className="w-5 h-5 rounded flex items-center justify-center bg-muted flex-shrink-0 mt-0.5">
              <TypeIcon type={n.type} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={cn(
                  'text-xs font-semibold leading-snug',
                  n.read ? 'text-muted-foreground' : 'text-foreground'
                )}>
                  {n.title}
                </p>
                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-foreground flex-shrink-0" />}
              </div>
              {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
              <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">{timeAgo(n.created_at)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
              {!n.read && (
                <button
                  onClick={e => { e.preventDefault(); e.stopPropagation(); markRead(n.id) }}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Mark read
                </button>
              )}
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); deleteNotification(n.id) }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-destructive/60 hover:text-destructive transition-all rounded"
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )

        const handleClick = () => { if (!n.read) markRead(n.id) }

        return n.link ? (
          <Link key={n.id} href={n.link} onClick={handleClick} className="block">
            {inner}
          </Link>
        ) : (
          <div key={n.id}>{inner}</div>
        )
      })}
    </div>
  )
}
