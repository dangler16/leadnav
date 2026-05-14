import { createClient } from '@/lib/supabase/server'
import { Notification } from '@/lib/types'
import { Bell } from 'lucide-react'
import { MarkAllRead } from './mark-read'
import Link from 'next/link'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const typeIcon: Record<string, string> = {
  new_lead: '👤',
  dispute_update: '⚠️',
  order_update: '📦',
  general: '🔔',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const notifications = (data ?? []) as Notification[]
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="flex flex-col gap-4 pt-6 px-7 pb-7">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && <MarkAllRead userId={user.id} />}
      </div>

      <div className="max-w-2xl">
        <div className="bg-card rounded-lg border border-border divide-y divide-border/50">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
              <Bell size={32} strokeWidth={1.5} />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => {
              const inner = (
                <div className={`flex items-start gap-3 p-4 ${!n.read ? 'bg-accent/30' : ''}`}>
                  <span className="text-lg mt-0.5 flex-shrink-0">{typeIcon[n.type] ?? '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${n.read ? 'text-muted-foreground' : 'font-semibold text-foreground'}`}>
                        {n.title}
                      </p>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              )

              return n.link ? (
                <Link key={n.id} href={n.link} className="block hover:bg-muted transition-colors">
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
