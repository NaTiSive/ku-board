// client/src/pages/Feed.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Main feed page showing the user's home timeline.
// Loads feed posts from the API and renders them with sidebar content.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import PostCard from '../components/PostCard'
import RecentUpdatesSidebar from '../components/RecentUpdatesSidebar'
import { useAuth } from '../hooks/useAuth'
import { fetchFeedPage } from '../lib/feedApi'
import { serverBase } from '../lib/serverBase'
import type { Post } from '../types'

function FeedLoadingSkeleton() {
  return (
    <div className="feed-layout">
      <div className="feed-main">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="card post-card-skeleton" key={index}>
            <div className="post-skeleton-header">
              <span className="skeleton skeleton-avatar" />
              <div className="post-skeleton-meta">
                <span className="skeleton skeleton-line skeleton-line-medium" />
                <span className="skeleton skeleton-line skeleton-line-short" />
              </div>
              <span className="skeleton skeleton-chip" />
            </div>
            <span className="skeleton skeleton-line skeleton-line-title" />
            <span className="skeleton skeleton-line skeleton-line-full" />
            <span className="skeleton skeleton-line skeleton-line-full" />
            <span className="skeleton skeleton-line skeleton-line-medium" />
            <div className="skeleton skeleton-block skeleton-post-image" />
            <div className="post-skeleton-actions">
              <span className="skeleton skeleton-chip" />
              <span className="skeleton skeleton-chip" />
              <span className="skeleton skeleton-chip" />
            </div>
          </div>
        ))}
      </div>
      <aside className="feed-side">
        <div className="side-header">Following</div>
        <div className="side-list side-list-tiles">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="follow-tile follow-tile-skeleton" key={index}>
              <span className="skeleton skeleton-avatar" />
              <div className="follow-tile-copy">
                <span className="skeleton skeleton-line skeleton-line-medium" />
                <span className="skeleton skeleton-line skeleton-line-short" />
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}

export default function FeedPage() {
  const { isGuest, isIncognito, loading: authLoading, user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadFeed() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchFeedPage(serverBase)
        if (!cancelled) {
          setPosts(data.posts)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load feed')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (!authLoading) {
      loadFeed()
    }

    return () => {
      cancelled = true
    }
  }, [authLoading, serverBase, user.id])

  return (
    <section className="page">
      {isGuest && (
        <div className="card incognito-banner">
          <strong>{isIncognito ? "You're in incognito mod." : "You're in guest mode."}</strong>
          <span className="muted">{isIncognito ? 'Incognito mode disclaimer' : 'guest mode disclaimer'}</span>
        </div>
      )}
      {loading ? (
        <FeedLoadingSkeleton />
      ) : (
        <div className="feed-layout">
          <div className="feed-main">
            {!!error && (
              <div className="card">
                <h2>Could not load feed</h2>
                <p className="muted">{error}</p>
              </div>
            )}

            {!error && posts.length === 0 && (
              <div className="card">
                <h2>No posts yet</h2>
                <p className="muted">Be the first person to start the conversation.</p>
              </div>
            )}

            {!error &&
              posts.map((post, index) => <PostCard key={post.id} post={post} index={index} />)}
          </div>
          <RecentUpdatesSidebar />
        </div>
      )}
    </section>
  )
}
