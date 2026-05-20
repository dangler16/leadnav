'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, X, SquareUser, AlertCircle, Package, Trash2 } from 'lucide-react'
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

export function NotificationBell({ userId, initialCount }: { userId?: string; initialCount: number }) {
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

  // Real-time subscription for incoming notifications
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('notification-bell')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        const n = payload.new as Notification
        setUnreadCount(c => c + 1)
        setNotifications(prev => [n, ...prev].slice(0, 8))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

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
    if (!userId) return

    const rect = buttonRef.current?.getBoundingClientRect()
    if (rect) setPos({ top: rect.top, left: rect.right + 8 })

    setRendered(true)
    setLoading(true)
    requestAnimationFrame(() => setOpen(true))

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8)

    const items = (data ?? []) as Notification[]
    setNotifications(items)
    setUnreadCount(items.filter(n => !n.read).length)
    setLoading(false)
  }

  async function markAllRead() {
    if (!userId) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    router.refresh()
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  async function deleteNotification(id: string, wasUnread: boolean) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1))
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggle}
        className={cn(
          'relative p-2 -mr-1.5 rounded transition-colors cursor-pointer flex-shrink-0',
          open
            ? 'text-white bg-neutral-800'
            : 'text-gray-300 hover:text-white hover:bg-neutral-800'
        )}
      >
        <Bell size={16} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-[3px] right-[3px] w-[5px] h-[5px] rounded-full bg-gray-400" />
        )}
      </button>

      {rendered && (
        <div
          ref={popupRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className={cn('w-72 bg-white rounded border border-gray-200 shadow-sm overflow-hidden dropdown-panel origin-top-left', open && 'open')}
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
                    'group flex items-start gap-2.5 px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors',
                    !n.read && 'bg-gray-50/80'
                  )}>
                    <div className="mt-0.5 w-5 h-5 rounded flex items-center justify-center bg-gray-100 flex-shrink-0">
                      <TypeIcon type={n.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1.5">
                        <p className={cn(
                          'text-xs font-semibold leading-snug',
                          n.read ? 'text-gray-400' : 'text-gray-900'
                        )}>
                          {n.title}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                          <button
                            onClick={e => { e.preventDefault(); e.stopPropagation(); deleteNotification(n.id, !n.read) }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-400 transition-all rounded"
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                      {n.body && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-1 tabular-nums">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                )
                const handleClick = () => {
                  setOpen(false)
                  if (!n.read) markRead(n.id)
                }
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={handleClick}>{inner}</Link>
                ) : (
                  <div key={n.id} className="w-full text-left cursor-pointer" onClick={handleClick} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}>{inner}</div>
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
