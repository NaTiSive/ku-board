import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import { useAuth } from '../hooks/useAuth'
import { fetchFollowing, type FollowUser } from '../lib/followsApi'
import { fetchNotifications, markNotificationsRead, type NotificationItem } from '../lib/notificationsApi'
import { serverBase } from '../lib/serverBase'

interface RecentUpdatesSidebarProps {
  title?: string
  refreshKey?: number
}

export default function RecentUpdatesSidebar({ title = 'Following', refreshKey = 0 }: RecentUpdatesSidebarProps) {
  const { isGuest, user, loading: authLoading } = useAuth()
  const [following, setFollowing] = useState<FollowUser[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (isGuest) {
      setFollowing([])
      setNotifications([])
      setLoading(false)
      setError('')
      return
    }

    let cancelled = false

    async function loadSidebar() {
      setLoading(true)
      setError('')

      try {
        const [followingUsers, notificationData] = await Promise.all([
          fetchFollowing(serverBase, user.id),
          fetchNotifications(serverBase, 1, 100),
        ])

        if (!cancelled) {
          setFollowing(followingUsers)
          setNotifications(notificationData.notifications)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load following list')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadSidebar()

    return () => {
      cancelled = true
    }
  }, [authLoading, isGuest, refreshKey, user.id])

  const unreadByActor = useMemo(() => {
    const next = new Map<string, string[]>()

    notifications.forEach((item) => {
      if (!item.actorId || item.isRead) {
        return
      }

      const current = next.get(item.actorId) ?? []
      current.push(item.id)
      next.set(item.actorId, current)
    })

    return next
  }, [notifications])

  const handleCheckUpdates = async (followedUserId: string) => {
    const unreadIds = unreadByActor.get(followedUserId) ?? []
    if (unreadIds.length === 0) {
      return
    }

    try {
      await markNotificationsRead(serverBase, unreadIds)
      setNotifications((current) =>
        current.map((item) => (item.actorId === followedUserId ? { ...item, isRead: true } : item)),
      )
    } catch {
      // ignore silent sidebar refresh errors
    }
  }

  return (
    <aside className="feed-side">
      <div className="side-header">{title}</div>
      <div className="side-list side-list-tiles">
        {loading && <div className="side-item">Loading followed users...</div>}
        {!loading && !!error && <div className="side-item">Following is unavailable right now.</div>}
        {!loading && !error && isGuest && <div className="side-item">Sign in to follow users and see them here.</div>}
        {!loading && !error && !isGuest && following.length === 0 && (
          <div className="side-item">Follow people to build your list here.</div>
        )}
        {!loading &&
          !error &&
          !isGuest &&
          following.map((followedUser) => {
            const hasUnread = (unreadByActor.get(followedUser.id) ?? []).length > 0

            return (
              <Link
                className="follow-tile"
                key={followedUser.id}
                to={`/profile/${followedUser.id}`}
                onClick={() => {
                  void handleCheckUpdates(followedUser.id)
                }}
              >
                <div className="follow-tile-avatar">
                  <Avatar name={followedUser.displayName} imageUrl={followedUser.avatarUrl} />
                  {hasUnread ? <span className="follow-tile-dot" aria-hidden="true" /> : null}
                </div>
                <div className="follow-tile-copy">
                  <strong>{followedUser.displayName}</strong>
                  <span className="muted">@{followedUser.handle}</span>
                </div>
              </Link>
            )
          })}
      </div>
    </aside>
  )
}
