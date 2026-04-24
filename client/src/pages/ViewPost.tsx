// client/src/pages/ViewPost.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Page used to display a single post with its comment thread.
// Loads the post and comments by post ID from the API and renders
// the post card plus comment section and sidebar.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import CommentSection from '../components/CommentSection'
import PostCard from '../components/PostCard'
import RecentUpdatesSidebar from '../components/RecentUpdatesSidebar'
import { fetchPostById } from '../lib/postApi'
import { serverBase } from '../lib/serverBase'
import type { Comment, Post } from '../types'

function ViewPostLoadingSkeleton() {
  return (
    <section className="page">
      <div className="feed-layout">
        <div className="feed-main">
          <div className="card post-card-skeleton">
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

          <div className="card">
            <span className="skeleton skeleton-line skeleton-line-medium" />
            <div className="side-list" style={{ marginTop: '16px' }}>
              {Array.from({ length: 3 }, (_, index) => (
                <div className="follow-tile follow-tile-skeleton" key={index}>
                  <span className="skeleton skeleton-avatar" />
                  <div className="follow-tile-copy">
                    <span className="skeleton skeleton-line skeleton-line-medium" />
                    <span className="skeleton skeleton-line skeleton-line-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
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
    </section>
  )
}

export default function ViewPost() {
  const { id } = useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setError('Missing post id.')
      return
    }

    let cancelled = false

    const loadPost = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await fetchPostById(serverBase, id)

        if (cancelled) {
          return
        }

        setPost(data.post)
        setComments(data.comments)
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load post.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadPost()

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return <ViewPostLoadingSkeleton />
  }

  if (error) {
    return (
      <section className="page">
        <div className="card">
          <h2>Post unavailable</h2>
          <p className="muted">{error}</p>
        </div>
      </section>
    )
  }

  if (!post) {
    return (
      <section className="page">
        <div className="card">
          <h2>Post not found</h2>
          <p className="muted">The shareable link may be outdated.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="feed-layout">
        <div className="feed-main">
          <PostCard post={post} showReport showBack />
          <CommentSection
            postId={post.id}
            initialComments={comments}
            onCommentAdded={(comment) => {
              setComments((prev) => [...prev, comment])
              setPost((current) => (current ? { ...current, comments: current.comments + 1 } : current))
            }}
          />
        </div>
        <RecentUpdatesSidebar />
      </div>
    </section>
  )
}
