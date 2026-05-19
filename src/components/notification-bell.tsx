'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, X, SquareUser, AlertCircle, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Notification } from '@/lib/types'
import { cn } from '@/lib/utils'

function TypeIcon({ type }: { type: string }) {
  const cls = 'flex-shrink-0 text-gray-400'
  if (type === 'new_lead')       return <SquareUser  size={12} strokeWidth={2} className={cls} />
  if (type === 'dispute_update') return <AlertCircle size={12} strokeWidth={2} className={cls} />
  if (type === 'order_update')   return <Package     size={12} strokeWidth={2} className={cls} />
  return <Bell size={12} strokeWidth={2} className={cls} />
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

export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [open, setOpen] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { if (open) setRendered(true) }, [open])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [])

  async function toggle() {
    if (open) { setOpen(false); return }

    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) setPos({ top: rect.top, left: rect.right + 8 })

    setOpen(true)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8)

    const items = (data ?? []) as Notification[]
    setNotifications(items)
    setUnreadCount(items.filter(n => !n.read).length)
    setLoading(false)
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    router.refresh()
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        className={cn(
          'relative p-[7px] rounded transition-colors cursor-pointer flex-shrink-0',
          open
            ? 'text-white bg-white/[0.08]'
            : 'text-white/35 hover:text-white/70 hover:bg-white/[0.05]'
        )}
      >
        <Bell size={14} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-[3px] right-[3px] w-[5px] h-[5px] rounded-full bg-gray-400" />
        )}
      </button>

      {rendered && (
        <div
          ref={popupRef}
          data-closed={!open ? '' : undefined}
          onAnimationEnd={(e) => { if (e.currentTarget === e.target && !open) setRendered(false) }}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-72 bg-white rounded border border-gray-200 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full tabular-nums">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  title="Mark all read"
                  className="p-1 text-gray-400 hover:text-gray-700 transition-colors rounded"
                >
                  <CheckCheck size={13} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 transition-colors rounded"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[320px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-xs text-gray-400">
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <Bell size={18} className="text-gray-200" strokeWidth={1.5} />
                <p className="text-xs text-gray-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const inner = (
                  <div className={cn(
                    'flex items-start gap-2.5 px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors',
                    !n.read && 'bg-gray-50/80'
                  )}>
                    <div className="mt-0.5 w-5 h-5 rounded flex items-center justify-center bg-gray-100 flex-shrink-0">
                      <TypeIcon type={n.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1.5">
                        <p className={cn(
                          'text-xs leading-snug',
                          n.read ? 'text-gray-500' : 'font-medium text-gray-900'
                        )}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                        )}
                      </div>
                      {n.body && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{n.body}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1 tabular-nums">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                )
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>{inner}</Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-3 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
