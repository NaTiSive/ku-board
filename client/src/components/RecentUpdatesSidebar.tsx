import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchFeedPage } from '../lib/feedApi'
import { serverBase } from '../lib/serverBase'
import type { Post } from '../types'

interface RecentUpdatesSidebarProps {
  posts?: Post[]
  loading?: boolean
  error?: string
}

function getRecentUpdateLabel(post: Post) {
  const text = post.title?.trim() || post.content.trim()
  return text.length > 56 ? `${text.slice(0, 56).trimEnd()}...` : text
}

export default function RecentUpdatesSidebar({
  posts,
  loading: loadingProp,
  error: errorProp,
}: RecentUpdatesSidebarProps) {
  const [fetchedPosts, setFetchedPosts] = useState<Post[]>([])
  const [loadingState, setLoadingState] = useState(true)
  const [errorState, setErrorState] = useState('')

  useEffect(() => {
    if (posts) {
      return
    }

    let cancelled = false

    const loadRecentUpdates = async () => {
      setLoadingState(true)
      setErrorState('')

      try {
        const data = await fetchFeedPage(serverBase, 1, 3)
        if (!cancelled) {
          setFetchedPosts(data.posts)
        }
      } catch (loadError) {
        if (!cancelled) {
          setErrorState(loadError instanceof Error ? loadError.message : 'Failed to load recent updates')
        }
      } finally {
        if (!cancelled) {
          setLoadingState(false)
        }
      }
    }

    void loadRecentUpdates()

    return () => {
      cancelled = true
    }
  }, [posts])

  const recentUpdates = useMemo(() => (posts ?? fetchedPosts).slice(0, 3), [fetchedPosts, posts])
  const isLoading = posts ? !!loadingProp : loadingState
  const currentError = posts ? (errorProp ?? '') : errorState

  return (
    <aside className="feed-side">
      <div className="side-header">Recent Updates</div>
      <div className="side-list">
        {isLoading && <div className="side-item">Loading recent updates...</div>}
        {!isLoading && !!currentError && <div className="side-item">Recent updates are unavailable right now.</div>}
        {!isLoading && !currentError && recentUpdates.length === 0 && <div className="side-item">No recent updates yet.</div>}
        {!isLoading &&
          !currentError &&
          recentUpdates.map((post) => (
            <Link className="side-item" key={post.id} to={`/post/${post.id}`}>
              {getRecentUpdateLabel(post)}
            </Link>
          ))}
      </div>
    </aside>
  )
}
