import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { useAuth } from '../hooks/useAuth'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  type NotificationItem,
} from '../lib/notificationsApi'
import { serverBase } from '../lib/serverBase'

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
      void loadNotifications()
    }

    return () => {
      cancelled = true
    }
  }, [authLoading, isGuest, user.id])

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
      <div className="card notification-card">
        <div className="notification-header">
          <div className="card-header-simple">
            <span className="icon-circle">!</span>
            <h2>Notifications</h2>
          </div>
          {!isGuest && (
            <div className="notification-actions">
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
        </div>

        {isGuest && <p className="muted">Sign in with your KU account to view notifications.</p>}
        {!isGuest && loading && <p className="muted">Loading notifications...</p>}
        {!isGuest && !loading && error && <p className="muted">{error}</p>}
        {!isGuest && !loading && !error && notifications.length === 0 && (
          <p className="muted">You do not have any notifications yet.</p>
        )}

        {!isGuest && !loading && !error && notifications.length > 0 && (
          <div className="notification-stack">
            {notifications.map((item) => (
              <div className={`notification-item ${item.isRead ? '' : 'is-unread'}`} key={item.id}>
                <div className="notification-avatar-wrap">
                  <Avatar name={item.actorName || 'System'} imageUrl={item.actorAvatarUrl} />
                  {!item.isRead ? <span className="follow-tile-dot" aria-hidden="true" /> : null}
                </div>
                <div className="notification-copy">
                  <div className="notification-topline">
                    <strong>{item.actorName || 'System'}</strong>
                    {item.actorHandle ? <span className="muted">@{item.actorHandle}</span> : null}
                  </div>
                  <div>{item.body}</div>
                  <div className="muted">
                    {formatDate(item.createdAt)}
                    {item.postPreview ? ` · ${item.postPreview.slice(0, 80)}` : ''}
                  </div>
                  <div className="notification-links">
                    {item.postId ? (
                      <Link className="muted" to={`/post/${item.postId}`}>
                        View post
                      </Link>
                    ) : null}
                    {item.actorId ? (
                      <Link className="muted" to={`/profile/${item.actorId}`}>
                        View profile
                      </Link>
                    ) : null}
                  </div>
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
