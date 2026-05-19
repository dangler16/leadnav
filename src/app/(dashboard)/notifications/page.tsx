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
    <div className="flex flex-col h-full overflow-hidden bg-white">

      <div className="flex items-center justify-between px-8 pt-5 pb-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && <MarkAllRead userId={user.id} />}
      </div>

      <div className="flex flex-col flex-1 min-h-0 mx-8 mb-5 border border-gray-200 rounded-lg overflow-hidden">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3">
            <Bell size={22} className="text-gray-200" strokeWidth={1.5} />
            <p className="text-sm text-gray-400">No notifications yet</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {notifications.map(n => {
              const inner = (
                <div className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0 ${!n.read ? 'bg-gray-50/60' : ''}`}>
                  <div className="w-5 h-5 rounded flex items-center justify-center bg-gray-100 flex-shrink-0 mt-0.5">
                    <Bell size={11} strokeWidth={2} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm leading-snug ${n.read ? 'text-gray-400' : 'font-semibold text-gray-900'}`}>
                        {n.title}
                      </p>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-gray-900 flex-shrink-0" />}
                    </div>
                    {n.body && <p className="text-xs text-gray-400 mt-0.5">{n.body}</p>}
                    <p className="text-xs text-gray-400 mt-1 tabular-nums">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              )

              return n.link ? (
                <Link key={n.id} href={n.link} className="block hover:bg-gray-50 transition-colors">
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
