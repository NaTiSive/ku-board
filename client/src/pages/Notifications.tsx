// client/src/pages/Notifications.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Notifications page for displaying the current user's notification list.
// Uses the notifications API to load items and update read status.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { serverBase } from '../lib/serverBase'

interface ApiEnvelope<T> {
  success: boolean
  data?: T
  error?: string
}

interface NotificationItem {
  id: string
  type: string
  isRead: boolean
  body: string
  createdAt: string
  postId?: string
  actorName?: string
  postPreview?: string
}

interface NotificationsPageData {
  notifications: NotificationItem[]
  total: number
  page: number
  limit: number
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function readJson<T>(response: Response) {
  const body = (await response.json()) as ApiEnvelope<T>

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.error || 'Request failed')
  }

  return body.data
}

async function fetchNotifications(serverBase: string, page = 1, limit = 20): Promise<NotificationsPageData> {
  const url = new URL('/api/notifications', serverBase)
  url.searchParams.set('page', String(page))
  url.searchParams.set('limit', String(limit))

  const response = await fetch(url.toString(), {
    credentials: 'include',
  })

  return readJson<NotificationsPageData>(response)
}

async function markNotificationsRead(serverBase: string, ids: string[]) {
  const response = await fetch(`${serverBase}/api/notifications/read`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ ids }),
  })

  await readJson<{ updated: number }>(response)
}

async function markAllNotificationsRead(serverBase: string) {
  const response = await fetch(`${serverBase}/api/notifications/read-all`, {
    method: 'PATCH',
    credentials: 'include',
  })

  await readJson<{ updated: boolean }>(response)
}

export default function Notifications() {
  const { isGuest, loading: authLoading, user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadNotifications() {
      if (isGuest) {
        setNotifications([])
        setLoading(false)
        setError('')
        return
      }

      setLoading(true)
      setError('')

      try {
        const data = await fetchNotifications(serverBase)
        if (!cancelled) {
          setNotifications(data.notifications)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load notifications')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (!authLoading) {
      loadNotifications()
    }

    return () => {
      cancelled = true
    }
  }, [authLoading, isGuest, serverBase, user.id])

  const unreadIds = useMemo(
    () => notifications.filter((item) => !item.isRead).map((item) => item.id),
    [notifications],
  )

  const handleMarkOneRead = async (id: string) => {
    const target = notifications.find((item) => item.id === id)
    if (!target || target.isRead || updating) {
      return
    }

    setUpdating(true)
    try {
      await markNotificationsRead(serverBase, [id])
      setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, isRead: true } : item)))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update notification')
    } finally {
      setUpdating(false)
    }
  }

  const handleMarkAllRead = async () => {
    if (unreadIds.length === 0 || updating) {
      return
    }

    setUpdating(true)
    try {
      await markAllNotificationsRead(serverBase)
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update notifications')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <section className="page">
      <div className="card">
        <div className="card-header-simple">
          <span className="icon-circle">!</span>
          <h2>Notifications</h2>
        </div>

        {!isGuest && (
          <div className="admin-tools">
            <span className="muted">{unreadIds.length} unread</span>
            <button
              className="button button-outline button-mini"
              type="button"
              onClick={handleMarkAllRead}
              disabled={loading || updating || unreadIds.length === 0}
            >
              {updating ? 'Updating...' : 'Mark all as read'}
            </button>
          </div>
        )}

        {isGuest && <p className="muted">Sign in with your KU account to view notifications.</p>}

        {!isGuest && loading && <p className="muted">Loading notifications...</p>}
        {!isGuest && !loading && error && <p className="muted">{error}</p>}

        {!isGuest && !loading && !error && notifications.length === 0 && (
          <p className="muted">You do not have any notifications yet.</p>
        )}

        {!isGuest && !loading && !error && notifications.length > 0 && (
          <div className="list-stack">
            {notifications.map((item) => (
              <div className="list-item" key={item.id}>
                <span className="list-icon">{item.isRead ? 'o' : '!'}</span>
                <div style={{ flex: 1 }}>
                  <div>{item.body}</div>
                  <div className="muted">
                    {formatDate(item.createdAt)}
                    {item.postPreview ? ` - ${item.postPreview.slice(0, 80)}` : ''}
                  </div>
                  {item.postId && (
                    <Link className="muted" to={`/post/${item.postId}`}>
                      View post
                    </Link>
                  )}
                </div>
                {!item.isRead && (
                  <button
                    className="button button-outline button-mini"
                    type="button"
                    onClick={() => handleMarkOneRead(item.id)}
                    disabled={updating}
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
