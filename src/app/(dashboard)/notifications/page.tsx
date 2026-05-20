import { createClient } from '@/lib/supabase/server'
import { Notification } from '@/lib/types'
import { MarkAllRead } from './mark-read'
import { NotificationList } from './notification-list'

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
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && <MarkAllRead userId={user.id} />}
      </div>

      <div className="flex flex-col flex-1 min-h-0 mx-8 mb-5 border border-gray-200 rounded-lg overflow-hidden">
        <NotificationList initialNotifications={notifications} />
      </div>
    </div>
  )
}
