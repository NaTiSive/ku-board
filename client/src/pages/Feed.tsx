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
          <strong>{isIncognito ? "You're in Incognito mode" : "You're in guest mode"}</strong>
          <span className="muted">{isIncognito ? 'Incognito mode disclaimer' : 'guest mode disclaimer'}</span>
        </div>
      )}
      <div className="feed-layout">
        <div className="feed-main">
          {loading && (
            <div className="card">
              <h2>Loading feed...</h2>
              <p className="muted">Fetching the latest posts from KUBoard.</p>
            </div>
          )}

          {!loading && error && (
            <div className="card">
              <h2>Could not load feed</h2>
              <p className="muted">{error}</p>
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="card">
              <h2>No posts yet</h2>
              <p className="muted">Be the first person to start the conversation.</p>
            </div>
          )}

          {!loading &&
            !error &&
            posts.map((post, index) => <PostCard key={post.id} post={post} index={index} />)}
        </div>
        <RecentUpdatesSidebar posts={posts} loading={loading} error={error} />
      </div>
    </section>
  )
}
