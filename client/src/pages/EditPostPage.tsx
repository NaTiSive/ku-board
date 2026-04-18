// client/src/pages/EditPostPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Edit post page for loading an existing post and updating it.
// Only the post owner can access this page and submit edits.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import EditPost from '../components/EditPost'
import { useAuth } from '../hooks/useAuth'
import { fetchPostById } from '../lib/postApi'
import { serverBase } from '../lib/serverBase'
import type { Post } from '../types'

export default function EditPostPage() {
  const { id } = useParams()
  const { user, loading: authLoading, isGuest } = useAuth()
  const [post, setPost] = useState<Post | null>(null)
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

    if (!authLoading) {
      void loadPost()
    }

    return () => {
      cancelled = true
    }
  }, [authLoading, id])

  if (loading || authLoading) {
    return (
      <section className="page">
        <div className="card">
          <h2>Loading post...</h2>
          <p className="muted">Preparing the editor.</p>
        </div>
      </section>
    )
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
    return null
  }

  if (isGuest || user.id !== post.author.id) {
    return (
      <section className="page">
        <div className="card">
          <h2>Not allowed</h2>
          <p className="muted">Only the post owner can edit this post.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="feed-layout">
        <div className="feed-main">
          <EditPost
            postId={post.id}
            initialTitle={post.title}
            initialContent={post.content}
            initialImage={post.image}
          />
        </div>
        <aside className="feed-side">
          <div className="side-header">Editing Tips</div>
          <div className="side-list">
            <div className="side-item">Keep your update clear and concise.</div>
            <div className="side-item">You can replace or remove the existing image.</div>
            <div className="side-item">Saving will return you to the post page.</div>
          </div>
        </aside>
      </div>
    </section>
  )
}
